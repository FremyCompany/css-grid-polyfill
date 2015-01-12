/////////////////////////////////////////////////////////////////
////                                                         ////
////                 prerequirements of qSL                  ////
////                                                         ////
/////////////////////////////////////////////////////////////////
////                                                         ////
////   Please note that I require querySelectorAll to work   ////
////                                                         ////
////   See http://github.com/termi/CSS_selector_engine/      ////
////   for a polyfill for older browsers                     ////
////                                                         ////
/////////////////////////////////////////////////////////////////

// TODO: improve event streams
// - look for a few optimizations ideas in gecko/webkit
// - use arrays in CompositeEventStream to avoid nested debouncings
module.exports = (function(window, document) { "use strict";

	///
	/// event stream implementation
	/// please note this is required to 'live update' the qSA requests
	///
	function EventStream(connect, disconnect, reconnect) {
		var self=this;
		
		// validate arguments
		if(!disconnect) disconnect=function(){};
		if(!reconnect) reconnect=connect;
		
		// high-level states
		var isConnected=false;
		var isDisconnected=false;
		var shouldDisconnect=false;
		
		// global variables
		var callback=null;
		var yieldEvent = function() {
			
			// call the callback function, and pend disposal
			shouldDisconnect=true;
			try { callback && callback(self); } catch(ex) { setImmediate(function() { throw ex; }); }
			
			// if no action was taken, dispose
			if(shouldDisconnect) { dispose(); }
			
		}
		
		// export the interface
		var schedule = this.schedule = function(newCallback) {
		
			// do not allow to schedule on disconnected event streams
			if(isDisconnected) { throw new Error("Cannot schedule on a disconnected event stream"); }
			
			// do not allow to schedule on already scheduled event streams
			if(isConnected && !shouldDisconnect) { throw new Error("Cannot schedule on an already-scheduled event stream"); }
			
			// schedule the new callback
			callback=newCallback; shouldDisconnect=false;
			
			// reconnect to the stream
			if(isConnected) {
				reconnect(yieldEvent);
			} else {
				connect(yieldEvent);
				isConnected=true;
			}
		}
		
		var dispose = this.dispose = function() {
		
			// do not allow to dispose non-connected streams
			if(isConnected) {
			
				// disconnect & save resources
				disconnect(); 
				self=null; yieldEvent=null; callback=null; 
				isConnected=false; isDisconnected=true; shouldDisconnect=false;
				
			}
		}
	}

	///
	/// call a function every frame
	///
	function AnimationFrameEventStream(options) {
		
		// flag that says whether the observer is still needed or not
		var rid = 0;
			
		// start the event stream
		EventStream.call(
			this, 
			function connect(yieldEvent) { rid = requestAnimationFrame(yieldEvent); },
			function disconnect() { cancelAnimationFrame(rid); }
		);
		
	}

	///
	/// call a function every timeout
	///
	function TimeoutEventStream(options) {
		
		// flag that says whether the observer is still needed or not
		var rid = 0; var timeout=(typeof(options)=="number") ? (+options) : ("timeout" in options ? +options.timeout : 333);
			
		// start the event stream
		EventStream.call(
			this, 
			function connect(yieldEvent) { rid = setTimeout(yieldEvent, timeout); },
			function disconnect() { clearTimeout(rid); }
		);
		
	}

	///
	/// call a function every time the mouse moves
	///
	function MouseEventStream() {
		var self=this; var pointermove = (("PointerEvent" in window) ? "pointermove" : (("MSPointerEvent" in window) ? "MSPointerMove" : "mousemove"));

		// flag that says whether the event is still observed or not
		var scheduled = false; var interval=0;
		
		// handle the synchronous nature of mutation events
		var yieldEvent=null;
		var yieldEventDelayed = function() {
			if(scheduled) return;
			window.removeEventListener(pointermove, yieldEventDelayed, true);
			scheduled = requestAnimationFrame(yieldEvent);
		}
		
		// start the event stream
		EventStream.call(
			this, 
			function connect(newYieldEvent) {
				yieldEvent=newYieldEvent;
				window.addEventListener(pointermove, yieldEventDelayed, true);
			},
			function disconnect() { 
				window.removeEventListener(pointermove, yieldEventDelayed, true);
				cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
			},
			function reconnect(newYieldEvent) { 
				yieldEvent=newYieldEvent; scheduled=false;
				window.addEventListener(pointermove, yieldEventDelayed, true);
			}
		);
		
	}

	///
	/// call a function every time the mouse is clicked/unclicked
	///
	function MouseButtonEventStream() {
		var self=this; 
		var pointerup = (("PointerEvent" in window) ? "pointerup" : (("MSPointerEvent" in window) ? "MSPointerUp" : "mouseup"));
		var pointerdown = (("PointerEvent" in window) ? "pointerdown" : (("MSPointerEvent" in window) ? "MSPointerDown" : "mousedown"));

		// flag that says whether the event is still observed or not
		var scheduled = false; var interval=0;
		
		// handle the synchronous nature of mutation events
		var yieldEvent=null;
		var yieldEventDelayed = function() {
			if(scheduled) return;
			window.removeEventListener(pointerup, yieldEventDelayed, true);
			window.removeEventListener(pointerdown, yieldEventDelayed, true);
			scheduled = requestAnimationFrame(yieldEvent);
		}
		
		// start the event stream
		EventStream.call(
			this, 
			function connect(newYieldEvent) {
				yieldEvent=newYieldEvent;
				window.addEventListener(pointerup, yieldEventDelayed, true);
				window.addEventListener(pointerdown, yieldEventDelayed, true);
			},
			function disconnect() { 
				window.removeEventListener(pointerup, yieldEventDelayed, true);
				window.removeEventListener(pointerdown, yieldEventDelayed, true);
				cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
			},
			function reconnect(newYieldEvent) { 
				yieldEvent=newYieldEvent; scheduled=false;
				window.addEventListener(pointerup, yieldEventDelayed, true);
				window.addEventListener(pointerdown, yieldEventDelayed, true);
			}
		);
		
	}

	///
	/// call a function whenever the DOM is modified
	///
	var DOMUpdateEventStream;
	if("MutationObserver" in window) {
		DOMUpdateEventStream = function DOMUpdateEventStream(options) {
			 
			// configuration of the observer
			if(options) {
				var target = "target" in options ? options.target : document.documentElement;
				var config = { 
					subtree: "subtree" in options ? !!options.subtree : true, 
					attributes: "attributes" in options ? !!options.attributes : true, 
					childList: "childList" in options ? !!options.childList : true, 
					characterData: "characterData" in options ? !!options.characterData : false
				};
			} else {
				var target = document.documentElement;
				var config = { 
					subtree: true, 
					attributes: true, 
					childList: true, 
					characterData: false
				};
			}
								
			// start the event stream
			var observer = null;
			EventStream.call(
				this, 
				function connect(yieldEvent) { if(config) { observer=new MutationObserver(yieldEvent); observer.observe(target,config); target=null; config=null; } },
				function disconnect() { observer && observer.disconnect(); observer=null; },
				function reconnect() { observer.takeRecords(); }
			);

		}
	} else if("MutationEvent" in window) {
		DOMUpdateEventStream = function DOMUpdateEventStream(options) {
			var self=this;

			// flag that says whether the event is still observed or not
			var scheduled = false;
			
			// configuration of the observer
			if(options) {
				var target = "target" in options ? options.target : document.documentElement;
			} else {
				var target = document.documentElement;
			}
			
			// handle the synchronous nature of mutation events
			var yieldEvent=null;
			var yieldEventDelayed = function() {
				if(scheduled || !yieldEventDelayed) return;
				document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
				document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
				target.removeEventListener("DOMSubtreeModified", yieldEventDelayed, false);
				scheduled = requestAnimationFrame(yieldEvent);
			}
			
			// start the event stream
			EventStream.call(
				this, 
				function connect(newYieldEvent) {
					yieldEvent=newYieldEvent;
					document.addEventListener("DOMContentLoaded", yieldEventDelayed, false);
					target.addEventListener("DOMSubtreeModified", yieldEventDelayed, false);
				},
				function disconnect() { 
					document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
					target.removeEventListener("DOMSubtreeModified", yieldEventDelayed, false);
					cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
				},
				function reconnect(newYieldEvent) { 
					yieldEvent=newYieldEvent; scheduled=false;
					target.addEventListener("DOMSubtreeModified", yieldEventDelayed, false);
				}
			);
			
		}
	} else {
		DOMUpdateEventStream = AnimationFrameEventStream;
	}

	///
	/// call a function every time the focus shifts
	///
	function FocusEventStream() {
		var self=this;
		
		// handle the filtering nature of focus events
		var yieldEvent=null; var previousActiveElement=null; var previousHasFocus=false; var rid=0;
		var yieldEventDelayed = function() {
			
			// if the focus didn't change
			if(previousActiveElement==document.activeElement && previousHasFocus==document.hasFocus()) {
				
				// then do not generate an event
				setTimeout(yieldEventDelayed, 333); // focus that didn't move is expected to stay
				
			} else {
				
				// else, generate one & save config
				previousActiveElement=document.activeElement;
				previousHasFocus=document.hasFocus();
				yieldEvent();
				
			}
		}
		
		// start the event stream
		EventStream.call(
			this, 
			function connect(newYieldEvent) {
				yieldEvent=newYieldEvent;
				rid=setTimeout(yieldEventDelayed, 500); // let the document load
			},
			function disconnect() { 
				clearTimeout(rid); yieldEventDelayed=null; yieldEvent=null; rid=0;
			},
			function reconnect(newYieldEvent) { 
				yieldEvent=newYieldEvent;
				rid=setTimeout(yieldEventDelayed, 100); // focus by tab navigation moves fast
			}
		);
		
	}

	///
	/// composite event stream
	/// because sometimes you need more than one event source
	///
	function CompositeEventStream(stream1, stream2) {
		var self=this;
		
		// fields
		var yieldEvent=null; var s1=false, s2=false;
		var yieldEventWrapper=function(s) { 
			if(s==stream1) s1=true;
			if(s==stream2) s2=true;
			if(s1&&s2) return;
			yieldEvent(self);
		}
		
		// start the event stream
		EventStream.call(
			this, 
			function connect(newYieldEvent) {
				yieldEvent=newYieldEvent;
				stream1.schedule(yieldEventWrapper);
				stream2.schedule(yieldEventWrapper);
			},
			function disconnect() { 
				stream1.dispose();
				stream2.dispose();
			},
			function reconnect(newYieldEvent) { 
				yieldEvent=newYieldEvent;
				s1 && stream1.schedule(yieldEventWrapper);
				s2 && stream2.schedule(yieldEventWrapper);
				s1 = s2 = false;
			}
		);
	}
	
	return {
		EventStream:                EventStream,
		AnimationFrameEventStream:  AnimationFrameEventStream,
		TimeoutEventStream:         TimeoutEventStream,
		MouseEventStream:           MouseEventStream,
		MouseButtonEventStream:     MouseButtonEventStream,
		DOMUpdateEventStream:       DOMUpdateEventStream,
		FocusEventStream:           FocusEventStream,
		CompositeEventStream:       CompositeEventStream
	};

})(window, document);