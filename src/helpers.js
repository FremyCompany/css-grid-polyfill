function usedStyleOf(element) {
	return element.currentStyle || getComputedStyle(element);
}

function enforceStyle(element, property, value) {
	
	var propertyBackup = null;
	
	if(usedStyleOf(element).getPropertyValue(property) != value) {
		propertyBackup = { 
			value:     element.style.getPropertyValue(property),
			priority:  element.style.getPropertyPriority(property),
			property:  property
		};
		element.style.setProperty(property, "", ""); // reset
		element.style.setProperty(property, "" + value, "important");
	}
	
	return propertyBackup;
	
}

function restoreStyle(element, backup) {

	if(backup) {
		
		// reset
		element.style.setProperty(backup.property, "", ""); 
		
		// restore
		if(backup.value) {
			element.style.setProperty(backup.property, backup.value, "");
			element.style.setProperty(backup.property, backup.value, backup.priority);
		}
		
		// TODO: link to www-style thread
		
	}

}


// Original code licensed by Adobe Systems Incorporated under the Apache License 2.0. 
// https://github.com/adobe-webplatform/brackets-css-shapes-editor/blob/master/thirdparty/CSSShapesEditor.js#L442

var cssUtils = cssUtils || {};
cssUtils.getBox = 
	
	// returns {top/left/bottom/right} for 'content/padding/border/margin-box' relative to the border box top-left corner.
	function getBox(element, boxType){
		var width = element.offsetWidth,
			height = element.offsetHeight,

			style = getComputedStyle(element),

			leftBorder = parseFloat(style.borderLeftWidth),
			rightBorder = parseFloat(style.borderRightWidth),
			topBorder = parseFloat(style.borderTopWidth),
			bottomBorder = parseFloat(style.borderBottomWidth),

			leftPadding = parseFloat(style.paddingLeft),
			rightPadding = parseFloat(style.paddingRight),
			topPadding = parseFloat(style.paddingTop),
			bottomPadding = parseFloat(style.paddingBottom),

			leftMargin = parseFloat(style.marginLeft),
			rightMargin = parseFloat(style.marginRight),
			topMargin = parseFloat(style.marginTop),
			bottomMargin = parseFloat(style.marginBottom);

		var box = {
			top: 0,
			left: 0,
			width: 0,
			height: 0
		};

		switch (boxType||'border-box'){
		case 'content-box':
			box.top = topBorder + topPadding;
			box.left = leftBorder + leftPadding;
			box.width = width - leftBorder - leftPadding - rightPadding - rightBorder;
			box.height = height - topBorder - topPadding - bottomPadding - bottomBorder;
			break;

		case 'padding-box':
			box.top = topPadding;
			box.left = leftPadding;
			box.width = width - leftBorder - rightBorder;
			box.height = height - topBorder - bottomBorder;
			break;

		case 'border-box':
			box.top = 0;
			box.left = 0;
			box.width = width;
			box.height = height;
			break;

		case 'margin-box':
			box.top = 0 - topMargin;
			box.left = 0 - leftMargin;
			box.width = width + leftMargin + rightMargin;
			box.height = height + topMargin + bottomMargin;
			break;

		default:
			throw new TypeError('Invalid parameter, boxType: ' + boxType);
		}

		return box;
	}


var cssUnits = {
	
	// converts "cssLength" from its inherent unit to pixels, and returns the result as a float
	convertToPixels: function convertToPixels(cssLength, element, opts) {
		
		if(typeof cssLength == "string") {
		
			var match = cssLength.match(/^\s*(-?\d+(?:\.\d+)?)(\S*)\s*$/);
			var currentLength = match ? parseFloat(match[1]) : 0.0;
			var currentUnit = match ? match[2] : '';
				
		} else {
			
			var currentLength = cssLength.value;
			var currentUnit = cssLength.unit;
			
		}

		var converter = convertToPixels.converters[currentUnit];
		if (!converter) throw new Error("No suitable conversion from unit '"+currentUnit+"' to unit 'px'");
		
		var convertedLength = converter.call(null, currentLength, element||document.documentElement, opts)
		return Math.round(20*convertedLength)/20;
		
	},

	// converts "pixelLength" from pixels to "destinUnit", and returns the result as a float
	convertFromPixels: function convertFromPixels(pixelLength, destinUnit, element, opts) {

		var converter = convertFromPixels.converters[destinUnit];
		if (!converter) throw new Error("No suitable conversion to unit '"+destinUnit+"' from unit 'px'");

		var convertedLength = converter.call(null, pixelLength, element||document.documentElement, opts)
		return Math.round(20*convertedLength)/20;
		
	},
	
}

cssUnits.convertToPixels.converters = {
	'px' : function(x) { return x; },
	'in' : function(x) { return x * 96; },
	'cm' : function(x) { return x / 0.02645833333; },
	'mm' : function(x) { return x / 0.26458333333; },
	'pt' : function(x) { return x / 0.75; },
	'pc' : function(x) { return x / 0.0625; },
	'em' : function(x, e) { return x*parseFloat(e?getComputedStyle(e).fontSize:16); },
	'rem': function(x, e) { return x*parseFloat(e?getComputedStyle(e.ownerDocument.documentElement).fontSize:16); },
	'vw' : function(x, e) { return x/100*window.innerWidth; },
	'vh' : function(x, e) { return x/100*window.innerHeight; },
	'%'  : function(x, e, opts) {
		opts = opts || {};

		// get the box from which to compute the percentages
		var box = e ? cssUtils.getBox(e, opts.boxType) : {
			top: 0,
			left: 0,
			width: 0,
			height: 0
		};

		// now apply the conversion algorithm
		switch(true) {
			case opts.isRadius:
				var radius = Math.sqrt( box.height*box.height + box.width*box.width ) / Math.sqrt(2);
				return Math.round(x/100*radius);
				
			case opts.isHeightRelated:
				return x/100*box.height;
				
			case opts.isWidthRelated: default:
				return x/100*box.width;
				
		}

	}
}

cssUnits.convertFromPixels.converters = {
	'px' : function(x) { return x; },
	'in' : function(x) { return x / 96; },
	'cm' : function(x) { return x * 0.02645833333; },
	'mm' : function(x) { return x * 0.26458333333; },
	'pt' : function(x) { return x * 0.75; },
	'pc' : function(x) { return x * 0.0625; },
	'em' : function(x, e) { return x/parseFloat(e?getComputedStyle(e).fontSize:16); },
	'rem': function(x, e) { return x/parseFloat(e?getComputedStyle(e.ownerDocument.documentElement).fontSize:16); },
	'vw' : function(x, e) { return x*100/window.innerWidth; },
	'vh' : function(x, e) { return x*100/window.innerHeight; },
	'%'  : function(x, e, opts) {
		opts = opts || {};

		// get the box from which to compute the percentages
		var box = e ? cssUtils.getBox(e, opts.boxType) : {
			top: 0,
			left: 0,
			width: 0,
			height: 0
		};

		// now apply the conversion algorithm
		switch(true) {
			case opts.isRadius:
				var radius = Math.sqrt( box.height*box.height + box.width*box.width ) / Math.sqrt(2);
				return Math.round(x*100/radius);
				
			case opts.isHeightRelated:
				return x*100/box.height;
				
			case opts.isWidthRelated: default:
				return x*100/box.width;
				
		}


	}
};