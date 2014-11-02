//
// The CSS Style module attempts to provide helpers to deal with Style Declarations and elements
// [0] http://lists.w3.org/Archives/Public/www-style/2013Sep/0283.html
//
module.exports = (function(window, document) { "use strict";

	function usedStyleOf(element) {
		var style = element.usedStyle || getComputedStyle(element);
		if(!style.parentElement) { style.parentElement = element; }
		return style;
	}
	
	function currentStyleOf(element) {
		var style = element.cascadedStyle || element.specifiedStyle || element.currentStyle || getComputedStyle(element); // TODO: check CSSOM spec for real name
		if(!style.parentElement) { style.parentElement = element; }
		return style;
	}
	
	function styleOf(element) {
		var style = element.style;
		if(!style.parentElement) { style.parentElement = element; }
		return style;
	}
	
	function runtimeStyleOf(element) {
		var style = /*element.runtimeStyle || */element.style;
		if(!style.parentElement) { style.parentElement = element; }
		return style;
	}
	
	function enforceStyle(element, property, value) {
		
		var propertyBackup = null;
		var usedValue = usedStyleOf(element).getPropertyValue(property);
		if(value instanceof Array) {
			if(value.indexOf(usedValue) >= 0) return null;
			value = ''+value[0];
		} else {
			value = ''+value;
		}
		
		if(usedValue != value) {
			var style = runtimeStyleOf(element);
			propertyBackup = { 
				value:     style.getPropertyValue(property),
				priority:  style.getPropertyPriority(property),
				property:  property
			};
			style.setProperty(property, "", ""); // reset [0]
			style.setProperty(property, "" + value, "important");
		}
		
		return propertyBackup;
		
	}
	
	function enforceStyles(element, propertyValues, backups) {
		var backups = backups || [];
		for(var property in propertyValues) { if(propertyValues.hasOwnProperty(key)) {
			var currentBackup = enforceStyle(element, property, propertyValues[property]);
			if(currentBackup) { backups.push(currentBackup) }
		}}
		return backups;
	}

	function restoreStyle(element, backup) {

		if(backup) {
		
			// get the element runtime style
			var style = runtimeStyleOf(element);
			
			// reset [0]
			style.setProperty(backup.property, "", "");
			
			// restore
			if(backup.value) {
				style.setProperty(backup.property, backup.value, "");
				style.setProperty(backup.property, backup.value, backup.priority);
			}
			
		}

	}
	
	function restoreStyles(element, backups) {
		if(!backups || !(backups.length > 0)) { return; }
		for(var i=backups.length; i--;) {
			restoreStyle(element, backups[i]);
		}
	}
	
	var cssStyle = {
		styleOf: styleOf,
		usedStyleOf: usedStyleOf,
		currentStyleOf: currentStyleOf,
		runtimeStyleOf: runtimeStyleOf,
		enforceStyle: enforceStyle,
		enforceStyles: enforceStyles,
		restoreStyle: restoreStyle,
		restoreStyles: restoreStyles,
	};
	
	return cssStyle;

})(window);