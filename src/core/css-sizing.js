module.exports = (function(window, document) {
	
	// import dependencies
	var cssStyle  = require('css-style'),
	    usedStyleOf     = cssStyle.usedStyleOf,
	    currentStyleOf  = cssStyle.currentStyleOf,
	    enforceStyle    = cssStyle.enforceStyle,
	    restoreStyle    = cssStyle.restoreStyle;
	
	// define the module
	var cssSizing = {
		
		absoluteMinWidthOf: function(element) {

			//
			// make the parent a relative container (if necessary)
			//
			var parentPositionBackup = enforceStyle(element.parentNode, "position", "relative");
			
			//
			// remove the element from the flow (if necessary)
			//
			var positionBackup = enforceStyle(element, "position", "absolute");
			
			//
			// put impossible sizing constraints to the element
			//
			var widthBackup = enforceStyle(element, "width", "0px");
			var minWidthBackup = enforceStyle(element, "min-width", "0px");
			
			//
			// see what size is finally being used
			//
			var result = element.offsetWidth;
			
			//
			// restore styling where needed
			//
			restoreStyle(element, minWidthBackup);
			restoreStyle(element, widthBackup);
			restoreStyle(element, positionBackup);
			restoreStyle(element.parentNode, parentPositionBackup);
			
			//
			// return the result
			//
			return result;
				
		},
		
		minWidthOf: function(element) {
		
			//
			// make the parent an infinite relative container (if necessary)
			//
			var parentPositionBackup = enforceStyle(element.parentNode, "position", "relative");
			var parentWidthBackup = enforceStyle(element.parentNode, "width", "0px");
			var parentMinWidthBackup = enforceStyle(element.parentNode, "min-width", "0px");
			var parentMaxWidthBackup = enforceStyle(element.parentNode, "max-width", "0px");
			
			//
			// remove the element from the flow (if necessary)
			//
			var positionBackup = enforceStyle(element, "position", "absolute");
			
			//
			// put impossible sizing constraints to the element
			//
			var widthBackup = enforceStyle(element, "width", "auto");
			
			//
			// see what size is finally being used
			//
			var result = element.offsetWidth;
			
			//
			// restore styling where needed
			//
			restoreStyle(element, widthBackup);
			restoreStyle(element, positionBackup);
			restoreStyle(element.parentNode, parentWidthBackup);
			restoreStyle(element.parentNode, parentMaxWidthBackup);
			restoreStyle(element.parentNode, parentMinWidthBackup);
			restoreStyle(element.parentNode, parentPositionBackup);
			
			//
			// return the result
			//
			return result;
		},
		
		maxWidthOf: function(element) {
		
			//
			// make the parent a relative container (if necessary)
			//
			var parentPositionBackup = enforceStyle(element.parentNode, "position", "relative");
			
			//
			// remove the element from the flow (if necessary)
			//
			var positionBackup = enforceStyle(element, "position", "absolute");
			
			//
			// put impossible sizing constraints to the element
			//
			var widthBackup = enforceStyle(element, "width", "auto");
			
			//
			// see what size is finally being used
			//
			var result = element.offsetWidth;
					
			//
			// restore styling where needed
			//
			restoreStyle(element, widthBackup);
			restoreStyle(element, positionBackup);
			restoreStyle(element.parentNode, parentPositionBackup);
			
			//
			// return the result
			//
			return result;
		},
		
		absoluteMaxWidthOf: function(element) {
		
			//
			// make the parent an infinite relative container (if necessary)
			//
			var parentPositionBackup = enforceStyle(element.parentNode, "position", "relative");
			var parentWidthBackup = enforceStyle(element.parentNode, "width", "9999px");
			var parentMinWidthBackup = enforceStyle(element.parentNode, "min-width", "9999px");
			
			//
			// remove the element from the flow (if necessary)
			//
			var positionBackup = enforceStyle(element, "position", "absolute");
			
			//
			// put impossible sizing constraints to the element
			//
			var widthBackup = enforceStyle(element, "width", "auto");
			
			//
			// see what size is finally being used
			//
			var result = element.offsetWidth;
			
			//
			// restore styling where needed
			//
			restoreStyle(element, widthBackup);
			restoreStyle(element, positionBackup);
			restoreStyle(element.parentNode, parentWidthBackup);
			restoreStyle(element.parentNode, parentMinWidthBackup);
			restoreStyle(element.parentNode, parentPositionBackup);
			
			//
			// return the result
			//
			return result;
		},
		
	};
	
	return cssSizing;
	
})(window, document)