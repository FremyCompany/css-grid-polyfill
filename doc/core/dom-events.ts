 /// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:dom-events'): DOMEvents.DOMEventsModule; }
module DOMEvents {

	/**
	*   Provides helpers for dealing with events in your code.
	*/
	export interface DOMEventsModule extends Object {

		/**
		*	Helps to use DOM-like events in your code
		*/
		EventTarget: EventTargetHelper

		/**
		*	Clones a native event object, so you can modify it and dispatch it again.
		*	
		*	@param event The native event object to clone
		*	@return A native event object similar to the one given as argument.
		*/
		cloneEvent<TEvent extends Event>(e: TEvent) : TEvent

	}

	export interface EventTargetHelper {

		/**
		*	Add the event methods to all instance of the given class.
		*	This includes "addEventListener", "removeEventListener" and "dispatchEvent".
		*/
		implementsIn(constructor: Function) : void

	}
}



/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you add support for events on a custom object ? */
function implement_dom_events() {

	function SomeObject() {
		// init a new SomeObject
	}

	var domEvents = require('core:dom-events');
	domEvents.EventTarget.implementsIn(SomeObject);

} 


/** How do you retarget an existing event object ? */
function retarget_existing_event() {

	var domEvents = require('core:dom-events');
	document.body.onclick = function(e) {

		// do as if we just clicked on #some-element instead
		var someEvent = domEvents.cloneEvent(e);
		var someElement = document.querySelector("#some-element");
		someElement.dispatchEvent(someEvent);

	};

} 