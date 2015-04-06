/////////////////////////////////////////////////////////////////
////                                                         ////
////                  Implementation of qSL                  ////
////                                                         ////
/////////////////////////////////////////////////////////////////
////                                                         ////
////   Please note that I require querySelectorAll to work   ////
////                                                         ////
////   See http://github.com/termi/CSS_selector_engine/      ////
////   for a polyfill for older browsers                     ////
////                                                         ////
/////////////////////////////////////////////////////////////////

module.exports = (function(window, document) { "use strict";

	// import dependencies
	var eventStreams = require('dom-experimental-event-streams'),
	    DOMUpdateEventStream = eventStreams.DOMUpdateEventStream,
		AnimationFrameEventStream = eventStreams.AnimationFrameEventStream,
		CompositeEventStream = eventStreams.CompositeEventStream,
		FocusEventStream = eventStreams.FocusEventStream,
		MouseButtonEventStream = eventStreams.MouseButtonEventStream,
		TimeoutEventStream = eventStreams.TimeoutEventStream,
		MouseEventStream = eventStreams.MouseEventStream;

	///
	/// the live querySelectorAll implementation
	///
	function querySelectorLive(selector, handler, root) {
		
		// restrict the selector coverage to some part of the DOM only
		var root = root || document;
		
		// TODO: make use of "mutatedAncestorElement" to update only elements inside the mutated zone
		
		var currentElms = [];
		var loop = function loop(eventStream) {
			
			// schedule next run
			eventStream.schedule(loop);
			
			// update elements matching the selector
			var newElms = [];
			var oldElms = currentElms.slice(0);
			var temps = root.querySelectorAll(selector);
			for(var i=newElms.length=temps.length; i;) { newElms.push(temps[--i]); }
			currentElms = newElms.slice(0); temps=null;
			
			// first let's clear all elements that have been removed from the document
			oldElms = oldElms.filter(function(e) {
				
				// check whether the current element is still there
				var isStillInDocument = (
					e===document.documentElement 
					|| document.documentElement.contains(e)
				);
				
				if(isStillInDocument) {
					
					// NEED_COMPARE: we will compare this element to the new list
					return true;
					
				} else {
					
					// DELETE: raise onremoved, pop old elements
					try { handler.onremoved && handler.onremoved(e); } catch(ex) { setImmediate(function() {throw ex})}
					return false;
					
				}
				
			});
			
			// now pop and match until both lists are exhausted
			// (we use the fact the returned elements are in document order)
			var el1 = oldElms.pop();
			var el2 = newElms.pop();
			while(el1 || el2) {
				if(el1===el2) {
				
					// MATCH: pop both elements
					el1 = oldElms.pop();
					el2 = newElms.pop();
					
				} else if (el2 && /*el1 is after el2*/(!el1||(el2.compareDocumentPosition(el1) & (1|2|8|32))===0)) {
					
					// INSERT: raise onadded, pop new elements
					try { handler.onadded && handler.onadded(el2); } catch(ex) { setImmediate(function() {throw ex})}
					el2 = newElms.pop();
					
				} else {
				
					// DELETE: raise onremoved, pop old elements
					try { handler.onremoved && handler.onremoved(el1); } catch(ex) { setImmediate(function() {throw ex})}
					el1 = oldElms.pop();
					
				}
			}
			
		};
		
		// use the event stream that best matches our needs
		var simpleSelector = selector.replace(/:(dir|lang|root|empty|blank|nth-child|nth-last-child|first-child|last-child|only-child|nth-of-type|nth-last-of-child|fist-of-type|last-of-type|only-of-type|not|matches|default)\b/gi,'')
		var eventStream; if(simpleSelector.indexOf(':') == -1) {
			
			// static stuff only
			eventStream = new DOMUpdateEventStream({target:root}); 
			
		} else {
			
			// dynamic stuff too
			eventStream = new DOMUpdateEventStream({target:root}); 
			if(DOMUpdateEventStream != AnimationFrameEventStream) {
			
				// detect the presence of focus-related pseudo-classes
				var reg = /:(focus|active)\b/gi;
				if(reg.test(simpleSelector)) {
					
					// mouse events should be listened
					eventStream = new CompositeEventStream(
						new FocusEventStream(),
						eventStream
					);
					
					// simplify simpleSelector
					var reg = /:(focus)\b/gi;
					simpleSelector = simpleSelector.replace(reg, ''); // :active has other hooks
					
				}
				
				// detect the presence of mouse-button-related pseudo-classes
				var reg = /:(active)\b/gi;
				if(reg.test(simpleSelector)) {
					
					// mouse events should be listened
					eventStream = new CompositeEventStream(
						new MouseButtonEventStream(),
						eventStream
					);
					
					// simplify simpleSelector
					simpleSelector = simpleSelector.replace(reg, '');
					
				}

				// detect the presence of user input pseudo-classes
				var reg = /:(target|checked|indeterminate|valid|invalid|in-range|out-of-range|user-error)\b/gi;
				if(reg.test(simpleSelector)) {
					
					// slowly dynamic stuff do happen
					eventStream = new CompositeEventStream(
						new TimeoutEventStream(250),
						eventStream
					);
					
					// simplify simpleSelector
					simpleSelector = simpleSelector.replace(reg, '');

					var reg = /:(any-link|link|visited|local-link|enabled|disabled|read-only|read-write|required|optional)\b/gi;
					// simplify simpleSelector
					simpleSelector = simpleSelector.replace(reg, '');
					
				}
				
				// detect the presence of nearly-static pseudo-classes
				var reg = /:(any-link|link|visited|local-link|enabled|disabled|read-only|read-write|required|optional)\b/gi;
				if(reg.test(simpleSelector)) {
					
					// nearly static stuff do happen
					eventStream = new CompositeEventStream(
						new TimeoutEventStream(333),
						eventStream
					);
					
					// simplify simpleSelector
					simpleSelector = simpleSelector.replace(reg, '');
					
				}
				
				// detect the presence of mouse-related pseudo-classes
				var reg = /:(hover)\b/gi;
				if(reg.test(simpleSelector)) {
					
					// mouse events should be listened
					eventStream = new CompositeEventStream(
						new MouseEventStream(),
						eventStream
					);
					
					// simplify simpleSelector
					simpleSelector = simpleSelector.replace(reg, '');
					
				}
				
				// detect the presence of unknown pseudo-classes
				if(simpleSelector.indexOf(':') !== -1) {
					
					// other stuff do happen, too (let's give up on events)
					eventStream = new AnimationFrameEventStream(); 
					
				}
				
			}
			
		}
		
		// start handling changes
		loop(eventStream);
		
	}
	
	return querySelectorLive;
	
})(window, document);