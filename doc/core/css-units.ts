 /// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:css-units'): CSSUnits.CSSUnitsModule; }
module CSSUnits {

	/**
	*   Provides a basic css unit converter.
	*/
	export interface CSSUnitsModule extends Object {

		/**
		*   Converts "cssLength" from its inherent unit to pixels, and returns the result as a float
		*   
		*   @param cssLength A string representing the value to convert
		*   @param element The element from which the relative values will be computed (default: the root element)
		*   @param opts Additionnal options such as "boxType" and "isHeightRelated" (default: border-box & isWidthRelated).
		*/
		convertToPixels(
			cssLength : string, 
			element? : HTMLElement, 
			opts? : PixelConvertOptions
		)
		: number

		/**
		*   Converts "pixelLength" from pixels to "destinUnit", and returns the result as a float
		*   
		*   @param pixelLength A string representing the value to convert
		*   @param destinUnit A string value representing the unit name
		*   @param element The element from which the relative values will be computed (default: the root element)
		*   @param opts Additionnal options such as "boxType" and "isHeightRelated" (default: border-box & isWidthRelated).
		*/
		convertFromPixels(
			pixelLength : number, 
			destinUnit : string, 
			element? : HTMLElement, 
			opts? : PixelConvertOptions
		)
		: number

	}

	export interface PixelConvertOptions {
		boxType?: string
		isWidthRelated?: boolean
		isHeightRelated?: boolean
		isRadiusRelated?: boolean
	}

}



/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you convert a value to pixels ? */
function convert_value_to_pixels() {

	var cssUnits = require('core:css-units');
	return cssUnits.convertToPixels("33%", document.body, {
		boxType: "content-box",
		isHeightRelated: true
	});

}

/** How do you convert a value from pixels ? */
function convert_value_from_pixels() {

	var cssUnits = require('core:css-units');
	return cssUnits.convertFromPixels(550/*px*/, /*to*/"em", document.body, {
		boxType: "content-box",
		isHeightRelated: true
	});

}