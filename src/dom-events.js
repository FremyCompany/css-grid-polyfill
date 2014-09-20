module.exports = (function(window, document) { "use strict";

	require('dom-window-console');

	//
	// some other basic om code
	//
	var domEvents = {
		
		//
		// the following functions are about event cloning
		//
		cloneMouseEvent: function cloneMouseEvent(e) {
			var evt = document.createEvent("MouseEvent");
			evt.initMouseEvent( 
				e.type, 
				e.canBubble||e.bubbles, 
				e.cancelable, 
				e.view, 
				e.detail, 
				e.screenX, 
				e.screenY, 
				e.clientX, 
				e.clientY, 
				e.ctrlKey, 
				e.altKey, 
				e.shiftKey, 
				e.metaKey, 
				e.button, 
				e.relatedTarget
			);
			return evt;
		},
		
		cloneKeyboardEvent: function cloneKeyboardEvent(e) {
			// TODO: this doesn't work cross-browswer...
			// see https://gist.github.com/termi/4654819/ for the huge code
			return domEvents.cloneCustomEvent(e);
		},
		
		cloneCustomEvent: function cloneCustomEvent(e) {
			var ne = document.createEvent("CustomEvent");
			ne.initCustomEvent(e.type, e.canBubble||e.bubbles, e.cancelable, "detail" in e ? e.detail : e);
			for(var prop in e) {
				try {
					if(e[prop] != ne[prop] && e[prop] != e.target) {
						try { ne[prop] = e[prop]; }
						catch (ex) { Object.defineProperty(ne,prop,{get:function() { return e[prop]} }) }
					}
				} catch(ex) {}
			}
			return ne;
		},
		
		cloneEvent: function cloneEvent(e) {
			
			if(e instanceof MouseEvent) {
				return domEvents.cloneMouseEvent(e);
			} else if(e instanceof KeyboardEvent) {
				return domEvents.cloneKeyboardEvent(e);
			} else {
				return domEvents.cloneCustomEvent(e);
			}
			
		},
		
		//
		// allows you to drop event support to any class easily
		//
		EventTarget: {
			implementsIn: function(eventClass, static_class) {
				
				if(!static_class && typeof(eventClass)=="function") eventClass=eventClass.prototype;
				
				eventClass.dispatchEvent = domEvents.EventTarget.prototype.dispatchEvent;
				eventClass.addEventListener = domEvents.EventTarget.prototype.addEventListener;
				eventClass.removeEventListener = domEvents.EventTarget.prototype.removeEventListener;
				
			},
			prototype: {}
		}
		
	};

	domEvents.EventTarget.prototype.addEventListener = function(eventType,f) {
		if(!this.eventListeners) this.eventListeners=[];
		
		var ls = (this.eventListeners[eventType] || (this.eventListeners[eventType]=[]));
		if(ls.indexOf(f)==-1) {
			ls.push(f);
		}
		
	}

	domEvents.EventTarget.prototype.removeEventListener = function(eventType,f) {
		if(!this.eventListeners) this.eventListeners=[];

		var ls = (this.eventListeners[eventType] || (this.eventListeners[eventType]=[])), i;
		if((i=ls.indexOf(f))!==-1) {
			ls.splice(i,1);
		}
		
	}

	domEvents.EventTarget.prototype.dispatchEvent = function(event_or_type) {
		if(!this.eventListeners) this.eventListeners=[];
		
		// abort quickly when no listener has been set up
		if(typeof(event_or_type) == "string") {
			if(!this.eventListeners[event_or_type] || this.eventListeners[event_or_type].length==0) {
				return;
			}
		} else {
			if(!this.eventListeners[event_or_type.type] || this.eventListeners[event_or_type.type].length==0) {
				return;
			}
		}
		
		// convert the event
		var event = event_or_type;
		function setUpPropertyForwarding(e,ee,key) {
			Object.defineProperty(ee,key,{
				get:function() {
					var v = e[key]; 
					if(typeof(v)=="function") {
						return v.bind(e);
					} else {
						return v;
					}
				},
				set:function(v) {
					e[key] = v;
				}
			});
		}
		function setUpTarget(e,v) {
			try { Object.defineProperty(e,"target",{get:function() {return v}}); }
			catch(ex) {}
			finally {
				
				if(e.target !== v) {
					
					var ee = Object.create(Object.getPrototypeOf(e));
					ee = setUpTarget(ee,v);
					for(key in e) {
						if(key != "target") setUpPropertyForwarding(e,ee,key);
					}
					return ee;
					
				} else {
					
					return e;
					
				}
				
			}
		}
		
		// try to set the target
		if(typeof(event)=="object") {
			try { event=setUpTarget(event,this); } catch(ex) {}
			
		} else if(typeof(event)=="string") {
			event = document.createEvent("CustomEvent");
			event.initCustomEvent(event_or_type, /*canBubble:*/ true, /*cancelable:*/ false, /*detail:*/this);
			try { event=setUpTarget(event,this); } catch(ex) {}
			
		} else {
			throw new Error("dispatchEvent expect an Event object or a string containing the event type");
		}
		
		// call all listeners
		var ls = (this.eventListeners[event.type] || (this.eventListeners[event.type]=[]));
		for(var i=ls.length; i--;) {
			try { 
				ls[i](event);
			} catch(ex) {
				setImmediate(function() { throw ex; });
			}
		}
		
		return event.isDefaultPrevented;
	}
	
	return domEvents;
	
})(window, document);