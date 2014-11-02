 /// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:css-sizing'): CSSSizing.CSSSizingModule; }
module CSSSizing {

	/**
	*   Provides a way to obtain some intrinsic size info out of displayed HTML Elements.
	*/
	export interface CSSSizingModule extends Object {
		
		/*
		*	Returns the size an element would have under normal conditions with a "width: 0px" parent.
		*/
		minWidthOf(element: HTMLElement) : number

		/*
		*	Returns the size an element would have when absolutely positiioned without contraints
		*/
		maxWidthOf(element: HTMLElement) : number

		/*
		*	Returns the size an element would have under a "width: 0px" constraint (right padding/border merged with overflow).
		*	Usually, you want the result of "minWidthOf". When in doubt, use "minWidthOf".
		*/
		absoluteMinWidthOf(element: HTMLElement) : number

		/*
		*	Returns the same value as maxWidthOf, but takes extra precautions before the computation.
		*	Prefer "maxWidthOf" to this function, unless you are sure it may return a wrong value in some cases.
		*/
		absoluteMaxWidthOf(element: HTMLElement) : number

	}
}



/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you convert a value to pixels ? */
function compute_min_max_width_element() {

	var cssSizing = require('core:css-sizing');
	var min = cssSizing.minWidthOf(document.body);
	var max = cssSizing.maxWidthOf(document.body);
	return [min, max];

}