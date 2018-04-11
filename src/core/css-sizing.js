module.exports = (function() {
	
	var infinity = 9999999.0;

	// define the module
	var cssSizing = {
		
		minWidthOf: function*(element) {
		
			return 25; // TODO: remove this when Ian fixes Blink

			//
			// make the parent an infinite relative container (if necessary)
			//
			var fragment = yield element.layoutNextFragment({ availableInlineSize: infinity });
			
			//
			// return the result
			//
			return fragment.inlineSize;
		},
		
		maxWidthOf: function*(element) {

			return infinity; // TODO: remove this when Ian fixes Blink
		
			//
			// make the parent a relative container (if necessary)
			//
			var fragment = yield element.layoutNextFragment({ availableInlineSize: infinity });

			//
			// return the result
			//
			return fragment.inlineSize;
		},

	};
	
	return cssSizing;
	
})();