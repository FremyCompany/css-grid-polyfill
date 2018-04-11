//
// The Box module defines algorithms for dealing with css boxes
//
module.exports = (function() {
	
	// Original code licensed by Adobe Systems Incorporated under the Apache License 2.0. 
	// https://github.com/adobe-webplatform/brackets-css-shapes-editor/blob/master/thirdparty/CSSShapesEditor.js#L442

	var cssBox = cssBox || {};
	cssBox.getBox = 
		
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
		};
	
	return cssBox;
	
})();