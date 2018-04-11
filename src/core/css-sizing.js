module.exports = (function() {
	
	// define the module
	var cssSizing = {
		
		minWidthOf: function*(element) {
		
			//
			// make the parent an infinite relative container (if necessary)
			//
			var fragment = yield element.layoutNextFragment();
			
			//
			// return the result
			//
			return fragment.inlineSize;
		},
		
		maxWidthOf: function*(element) {

			var infinity = 9999999.0;
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