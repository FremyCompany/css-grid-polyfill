//
// The CSS Units module is handling conversions between units
//
module.exports = (function(window, document) {
	
	// import dependencies
	var getBox = require('css-box').getBox;
	
	// define the module
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
	
	return cssUnits;

})(window, document);