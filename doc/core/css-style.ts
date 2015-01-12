/// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:css-style'): CSSStyle.CSSStyleModule; }
module CSSStyle {

	/**
	*   Provides an easier way to deal with the different css style objects of an element.
	*/
	export interface CSSStyleModule extends Object {

		/** 
		*   Returns the available css style the closest possible to the used style of an element.
		*   
		*   NOTE: polyfilled properties from cssCascade.polyfillStyleInterface should work on this object.
		*   @param element The element for which the style should be returned.
		*/
		usedStyleOf(element : HTMLElement) : CSSStyleDeclaration

		/** 
		*   Returns the available css style the closest possible to the cascaded style of an element.
		*   
		*   NOTE: polyfilled properties from cssCascade.polyfillStyleInterface should work on this object.
		*   @param element The element for which the style should be returned.
		*/
		currentStyleOf(element : HTMLElement) : CSSStyleDeclaration

		/** 
		*   Returns the available css style the closest possible to the override style of an element.
		*   
		*   NOTE: polyfilled properties from cssCascade.polyfillStyleInterface should work on this object.
		*   @param element The element for which the style should be returned.
		*/
		styleOf(element : HTMLElement) : CSSStyleDeclaration

		/** 
		*   Returns the available css style the closest possible to the runtime style of an element.
		*   
		*   NOTE: polyfilled properties from cssCascade.polyfillStyleInterface should work on this object.
		*   @param element The element for which the style should be returned.
		*/
		runtimeStyleOf(element : HTMLElement) : CSSStyleDeclaration

		/** 
		*   Sets the runtime style of an element to the specified value, and return a backup for restore with restoreStyle.
		*   
		*   @param element The element for which the style should be modified.
		*   @param property The (css) name of the property to override.
		*   @param value The value the property will be set to.
		*/
		enforceStyle(
			element : HTMLElement,
			property : string,
			value : string
		)
		: StyleBackup

		/** 
		*   Sets the runtime style of an element to the specified values, and return a backup for restore with restoreStyles.
		*   
		*   @param element The element for which the style should be modified.
		*   @param propertyValues A dictionnary whose names represent css property names, and whose value will be used for that property.
		*/
		enforceStyles(
			element : HTMLElement, 
			propertyValues : Object
		) : Array<StyleBackup>

		/** 
		*   Restore the runtime style of an element to the specified value.
		*   
		*   @param element The element for which the style should be modified.
		*   @param backup The backup obtained from enforceStyle.
		*/
		restoreStyle(
			element: HTMLElement,
			backup: StyleBackup
		)
		: void

		/** 
		*   Restore the runtime style of an element to the specified values.
		*   
		*   @param element The element for which the style should be modified.
		*   @param backup The backup obtained from enforceStyles.
		*/
		restoreStyles(
			element: HTMLElement,
			backup: Array<StyleBackup>
		)
		: void

	}

	export interface StyleBackup {
		property : string
		value : string
		priority: string
	}

}



/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you obtain the used value of a property? */
function obtain_css_value() {
	
	var cssStyle = require('core:css-style');
	return cssStyle.usedStyleOf(document.body).alignContent;

}



/** How do you override a style temporarily? */
function override_css_value() {
	
	var cssStyle = require('core:css-style');

	// set the runtime style
	var backup = cssStyle.enforceStyle(document.body, "color", "red");

	// reset the previous value
	cssStyle.restoreStyle(document.body, backup);

}
