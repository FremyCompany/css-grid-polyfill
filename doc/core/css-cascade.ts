/// <reference path="../requirements.ts" />
/// <reference path="css-syntax.ts" />
interface ModuleHub { (file: 'core:css-cascade'): CSSCascade.CSSCascadeModule; }
module CSSCascade {


	/**
	*   Provide helpers to interact with or simulate the css cascading engine.
	*   This module is almost a necessary requirement for any css polyfill. 
	*/
	export interface CSSCascadeModule extends Object {

		/** 
		*   Computes the priority of a CSS Selector given as a string.
		*   
		*   @param selector The CSS Selector to analyze; this cannot include multiple selectors separated by a comma.
		*   @return A positive integer whose value becomes higher with the priority. 
		*/
		computeSelectorPriorityOf(
			selector: string
		)
		: number;

		/**
		*   Finds all rules which match a specific element. 
		*   
		*   Please note you will rarely need this function as most of this work is done by the library.
		*   @param element The HTML element the rules will be matched against. We assume it is part of the DOM. 
		*   @return A list of CSS Style Rule which did match the provided element. 
		*/
		findAllMatchingRules(
			element: HTMLElement
		)
		: CSSSyntax.SpecializedTokenList<CSSSyntax.StyleRule>;


		/**
		*   Returns the specified style of a property on the provided element. 
		*   
		*   The last two parameters will enable optimizations:
		*   - matchedRules: allow you to mutualize the findAllMatchingRules call
		*   --- PLEASE NOTE THIS IS OFTEN NOT NECESSARY IF YOU MONITOR THIS PROPERTY
		*   - stringOnly: allow you to skip tokenization (a fake TokenList will be returned)
		*   --- THIS WILL RETURN YOU A BUGGY TOKENLIST, BE WISE
		*   
		*   @param element The HTML element the rules will be matched against. We assume it is part of the DOM. 
		*   @param cssPropertyName The CSS property whose value will be returned.
		*   @return A CSS TokenList containing the property value. 
		*/
		getSpecifiedStyle(
			element: HTMLElement,
			cssPropertyName: string,
			matchedRules?: CSSSyntax.SpecializedTokenList<CSSSyntax.StyleRule>,
			stringOnly?: boolean
		)
		: CSSSyntax.TokenList


		/**
		*   Sets up a listener for property changes on an element
		*   
		*   NOTE: the event may fire even if the property didn't really change, plan optimizations such as:
		*   - DETECT NOOP CHANGES (when the final value didn't change as a result)
		*   - DEBOUNCING UPDATES (you may get many events for an element during on single frame)
		*
		*   @param properties An array of string containing the css properties to monitor
		*   @param handler An object whose "onupdate" method will be called
		*/
		startMonitoringProperties(
			properties: Array<string>,
			handler: OnElementRuleMatchChanged
		)
		: void

		/**
		*   Polyfills element.myStyle.propertyName and start monitoring a css property
		*   
		*   NOTE: it is recommended you use "cssStyle.styleOf(element)" instead of the "element.myStyle" property
		*   @param cssPropertyName The property to emulate
		*
		*/
		polyfillStyleInterface(
			cssPropertyName: string
		)
		: void

		/**
		*   Load a polyfilled stylesheet via its css text
		*   
		*   @param cssText The content of the stylesheet
		*   @param i The position of the stylesheet in the document (you should leave this undefined)
		*/
		loadStyleSheet(
			cssText: string,
			i?: number
		)
		: void

		/**
		*   Load a polyfilled stylesheet via its html element
		*   
		*   @param cssText The content of the stylesheet
		*   @param i The position of the stylesheet in the document (you should leave this undefined)
		*/
		loadStyleSheetTag(
			element: HTMLElement,
			i?: number
		)
		: void
			
	}

	export interface OnElementRuleMatchChanged {
		onupdate(element: HTMLElement, rule: CSSSyntax.StyleRule) : void
	}

}

interface HTMLElement {
	myStyle: CSSStyleDeclaration
}

/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you start monitoring a css property? */
function monitor_some_property() {

	var cssCascade = require('core:css-cascade');
	cssCascade.startMonitoringProperties(
		["-css-grid", "-css-grid-row", "css-grid-col"],
		{
			onupdate: function(element, rule) {
				// TODO: update the layout of "element"
			}
		}
	);

}



/** How do you find out the specified style for a property? */
function obtain_specified_style() {
	
	var cssCascade = require('core:css-cascade');
	return cssCascade.getSpecifiedStyle(document.body, 'poly-grid')

}



/** How do you find out the specified style for multiple properties? */
function obtain_specified_styles() {

	var cssCascade = require('core:css-cascade');
	var rules = cssCascade.findAllMatchingRules(document.body);
	var row = cssCascade.getSpecifiedStyle(document.body, 'poly-grid-row', rules);
	var col = cssCascade.getSpecifiedStyle(document.body, 'poly-grid-col', rules);
	return [row, col];

}



/** How do you polyfill a property style getter/setter? */
function polyfill_property_getters() {

	var cssCascade = require('core:css-cascade');
	cssCascade.polyfillStyleInterface('poly-grid');

	var cssStyle = require('core:css-style').valueOf();
	var style = cssStyle.usedStyleOf(document.body);
	return style.polyGrid;

}



/** How do you manually choose which stylesheets to polyfill? */
function manually_load_stylesheets() {

	// BEFORE LOADING THE POLYFILL:
	window['no_auto_stylesheet_detection'] = true;

	// AFTER LOADING THE POLYFILL:
	var cssCascade = require('core:css-cascade');
	cssCascade.loadStyleSheet("* { color: red; }");
	cssCascade.loadStyleSheetTag(document.querySelector('style.polyfill').valueOf());

}