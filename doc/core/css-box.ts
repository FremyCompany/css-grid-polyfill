/// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:css-box'): CSSBox.CSSBoxModule; }
module CSSBox {

	/**
	*   Provides an easier way to deal with the different css style objects of an element.
	*/
	export interface CSSBoxModule extends Object {

		/**
		*   Computes the local distance between the various boxes of an element (only works properly if the element has only one box).
		*   
		*   @param element The element for which the box is computed.
		*   @param boxType of one: "content-box", "padding-box", "border-box" and "margin-box".
		*   @return {top/left/width/height} for 'content/padding/border/margin-box' (relative to the border box top-left corner).
		*/
		getBox(
			element: HTMLElement,
			boxType: string
		)
		: Box

	}

	export interface Box {
		top: number
		left: number
		width: number
		height: number
	}
}



/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you get the border-box of an element? */
function get_border_box_of_element() {

	var cssBox = require('core:css-box');
	var box = cssBox.getBox(document.body, 'border-box');
	return { top: box.top, left: box.left, right: box.left+box.width, bottom: box.top+box.height };
	
}



/** How do you get the content-box of an element? */
function get_content_box_of_element() {
		
	var cssBox = require('core:css-box');
	var box = cssBox.getBox(document.body, 'content-box');
	return { top: box.top, left: box.left, right: box.left+box.width, bottom: box.top+box.height };

}




/** What kind of boxes can you get for an element? */
function get_boxes_kinds_of_element() {
		
	return ["content-box", "padding-box", "border-box", "margin-box"]; 
	
}
