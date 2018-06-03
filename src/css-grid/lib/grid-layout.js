module.exports = (function(window, document) { "use strict";
	
	// import dependencies
	var cssSyntax = require('core:css-syntax');
	
	var cssStyle  = require('core:css-style'),
	    usedStyleOf     = cssStyle.usedStyleOf,
	    currentStyleOf  = cssStyle.currentStyleOf,
	    enforceStyle    = cssStyle.enforceStyle,
	    restoreStyle    = cssStyle.restoreStyle;
		
	var VirtualStylesheetFactory = require('core:css-virtual-stylesheet-factory');
	
	require('core:polyfill-dom-uniqueID');
	require('core:polyfill-dom-requestAnimationFrame');
	
	var virtualStylesheetFactory = new VirtualStylesheetFactory();
	
	var createRuntimeStyle = function(reason, element) {
		
		// expand the reason
		if(element) {
			reason = (element.id || element.uniqueID) + '-' + reason;
		}
		
		// return a virtual stylesheet
		return virtualStylesheetFactory.createStyleSheet(reason);
		
	}
	
	var cssSizing = require('core:css-sizing');
	
	var cssUnits = require('core:css-units');
	
	// define the module
	var LOCATE_AUTO = 0;
	var LOCATE_LINE = 1;
	var LOCATE_SPAN = 2;
	var LOCATE_AREA = 3;
	
	var ALIGN_START  = 0;
	var ALIGN_CENTER = 1;
	var ALIGN_END    = 2;
	var ALIGN_FIT    = 3;
	
	var TRACK_BREADTH_AUTO        = 0;
	var TRACK_BREADTH_LENGTH      = 1;
	var TRACK_BREADTH_FRACTION    = 2;
	var TRACK_BREADTH_PERCENTAGE  = 3;
	var TRACK_BREADTH_MIN_CONTENT = 4;
	var TRACK_BREADTH_MAX_CONTENT = 5;
	
	function GridTrackBreadth() {
		this.minType = TRACK_BREADTH_AUTO;
		this.minValue = "auto";
		this.maxType = TRACK_BREADTH_AUTO;
		this.maxValue = "auto";
	}
	
	GridTrackBreadth.prototype = {
		toString: function() {
			if(this.minType==this.maxType && this.minValue==this.maxValue) {
				switch(this.minType) {
					case TRACK_BREADTH_AUTO: return "auto";
					case TRACK_BREADTH_LENGTH: return this.minValue+"px";
					case TRACK_BREADTH_FRACTION: return this.minValue+"fr";
					case TRACK_BREADTH_PERCENTAGE: return this.minValue+"%";
					case TRACK_BREADTH_MIN_CONTENT: return "min-content";
					case TRACK_BREADTH_MAX_CONTENT: return "max-content";
				}
			} else {
				var min = "auto";
				var max = "auto";
				switch(this.minType) {
					case TRACK_BREADTH_AUTO: min = "auto"; break;
					case TRACK_BREADTH_LENGTH: min = this.minValue+"px"; break;
					case TRACK_BREADTH_FRACTION: min = this.minValue+"fr"; break;
					case TRACK_BREADTH_PERCENTAGE: min = this.minValue+"%"; break;
					case TRACK_BREADTH_MIN_CONTENT: min = "min-content"; break;
					case TRACK_BREADTH_MAX_CONTENT: min = "max-content"; break;
				}
				switch(this.maxType) {
					case TRACK_BREADTH_AUTO: max = "auto"; break;
					case TRACK_BREADTH_LENGTH: max = this.maxValue+"px"; break;
					case TRACK_BREADTH_FRACTION: max = this.maxValue+"fr"; break;
					case TRACK_BREADTH_PERCENTAGE: max = this.maxValue+"%"; break;
					case TRACK_BREADTH_MIN_CONTENT: max = "min-content"; break;
					case TRACK_BREADTH_MAX_CONTENT: max = "max-content"; break;
				}
				return "minmax(" + min + ", " + max + ")";
			}
		},
		setValue: function(type, val) {
			this.minType  = this.maxType  = type;
			this.minValue = this.maxValue = val;
		},
		setMaxValue: function(type, val) {
			this.maxType  = type;
			this.maxValue = val;
		},
		setMinValue: function(type, val) {
			this.minType  = type;
			this.minValue = val;
		}
	}
	
	function GridItemPosition(type, name, index) {
		this.type = type|LOCATE_AUTO;
		this.name = name;
		this.index = index|0;
	}
	
	GridItemPosition.prototype = {
		extractXLineIndex: function(grid, TODO_args) {
			throw "Not implemented";
		},
		extractYLineIndex: function(grid, TODO_args) {
			throw "Not implemented";
		},
		toString: function() {
			
		}
	}
	
	function GridItem(element, parentGrid) {
		
		this.element = element;
		this.parentGrid = element.parentGridLayout = parentGrid;
		
		this.reset();
		this.buggy = true;
		
	}
	
	GridItem.prototype = {
		
		dispose: function() {
			this.element.parentGridLayout = undefined;
		},
		
		reset: function() {
			
			this.order = 0;
			
			this.minWidth = 0;
			this.maxWidth = 0;
			
			this.hMargins = 0;
			this.vMargins = 0;
			this.hPaddings = 0;
			this.vPaddings = 0;
			this.hBorders = 0;
			this.vBorders = 0;
			
			
			this.xStart = -1;
			this.xEnd = -1;
			
			this.specifiedXStart = this.specifiedXStart || new GridItemPosition();
			this.specifiedXStart.type = LOCATE_AUTO;
			this.specifiedXStart.name = undefined;
			this.specifiedXStart.index = undefined;
			
			this.specifiedXEnd = this.specifiedXEnd || new GridItemPosition();
			this.specifiedXEnd.type = LOCATE_AUTO;
			this.specifiedXEnd.name = undefined;
			this.specifiedXEnd.index = undefined;

			
			this.yStart = -1;
			this.yEnd = -1;
			
			this.specifiedYStart = this.specifiedYStart || new GridItemPosition();
			this.specifiedYStart.type = LOCATE_AUTO;
			this.specifiedYStart.name = undefined;
			this.specifiedYStart.index = undefined;
			
			this.specifiedYEnd = this.specifiedYEnd || new GridItemPosition();
			this.specifiedYEnd.type = LOCATE_AUTO;
			this.specifiedYEnd.name = undefined;
			this.specifiedYEnd.index = undefined;
			
			this.marginAlignX = ALIGN_CENTER;
			this.marginAlignY = ALIGN_CENTER;
			
			this.paddingAlignX = ALIGN_FIT;
			this.paddingAlignY = ALIGN_FIT;
			
			
		},
	
		updateFromElement: function() {
			
			var element = this.element;
			var usedStyle = usedStyleOf(element);
			var style = currentStyleOf(element);
			var getStyle = function(prop) {
				var value = style[prop];
				if(typeof(value)=="undefined") { return ""; }
				return value;
			}
			
			this.reset(); 
			this.buggy = false;
			
			// compute order property
			this.order = parseInt(style['order'])|0;
			
			// compute size
			this.minWidth = cssSizing.minWidthOf(element);
			this.maxWidth = cssSizing.maxWidthOf(element);
			
			this.hMargins = parseInt(usedStyle.getPropertyValue('margin-left')) + parseInt(usedStyle.getPropertyValue('margin-right'));
			this.vMargins = parseInt(usedStyle.getPropertyValue('margin-top')) + parseInt(usedStyle.getPropertyValue('margin-bottom'));
			this.hPaddings = parseInt(usedStyle.getPropertyValue('padding-left')) + parseInt(usedStyle.getPropertyValue('padding-right'));
			this.vPaddings = parseInt(usedStyle.getPropertyValue('padding-top')) + parseInt(usedStyle.getPropertyValue('padding-bottom'));
			this.hBorders = parseInt(usedStyle.getPropertyValue('border-left-width')) + parseInt(usedStyle.getPropertyValue('border-right-width'));
			this.vBorders = parseInt(usedStyle.getPropertyValue('border-top-width')) + parseInt(usedStyle.getPropertyValue('border-bottom-width'));
			
			// locate x and y lines together
			if(style["grid-area"]) {
				var parts = getStyle("grid-area").split('/');
				var is_ident = /^\s*([a-z][-_a-z0-9]*)\s*$/i;
				var row_start = parts[0] || 'auto';
				var col_start = parts[1] || (is_ident.test(row_start) ? row_start : 'auto');
				var row_end = parts[2] || (is_ident.test(row_start) ? row_start : 'auto');
				var col_end = parts[3] || (is_ident.test(col_start) ? col_start : 'auto');
				this.parseLocationInstructions(this.specifiedXStart, this.specifiedXEnd, col_start + " / " + col_end);
				this.parseLocationInstructions(this.specifiedYStart, this.specifiedYEnd, row_start + " / " + row_end);
			}
			
			// locate x lines
			if(style["grid-column"] || style["grid-column-start"] || style["grid-column-end"]) {
				var parts = getStyle("grid-column").split('/');
				var start = getStyle("grid-column-start") || parts[0] || 'auto';
				var end   = getStyle("grid-column-end") || parts[1] || parts[0] || start;
				this.parseLocationInstructions(this.specifiedXStart, this.specifiedXEnd, start + " / " + end);
			}
			
			// locate y lines
			if(style["grid-row"] || style["grid-row-start"] || style["grid-row-end"]) {
				var parts = getStyle("grid-row").split('/');
				var start = getStyle("grid-row-start") || parts[0];
				var end   = getStyle("grid-row-end") || parts[1] || parts[0];
				this.parseLocationInstructions(this.specifiedYStart, this.specifiedYEnd, start + " / " + end);
			}
			
			// FIXME: is it possible to understand cascading here, and not use a fixed order?
			// TODO: other positioning methods
			
		},
		
		parseLocationInstructions: function(specifiedStart, specifiedEnd, cssText) {
			
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			var I = 0;
			
			var updateNameOrIndex = function(data) {
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					// grid-column: C;
					if(data.name) { 
						// duplicate line-name value
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (duplicate line name)");
						this.buggy = true;
						return true;
					}
					data.name = value[I++].value;
					return false;
					
				} else if(value[I] instanceof cssSyntax.NumberToken) {
					
					// grid-column: 3
					data.index = value[I].value|0;
					
					// only accept integer values
					if(value[I].value != data.index) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (non-integer number)");
						this.buggy = true;
						return true;
					}
					
					// do not accept zero
					if(data.index == 0) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (line index can't be zero)");
						this.buggy = true;
						return true;
					}
					
					// do not accept negative spans
					if(data.index <= 0 && data.type == LOCATE_SPAN) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (negative spans not allowed)");
						this.buggy = true;
						return true;
					}
					
					I++;
					
					return false;
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// break grid-column-start detection
					return true;
					
				} else {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (invalid token)");
					this.buggy = true;
					return true;
					
				}
			};
			
			var gatherNameIndexPair = function(data) {

				// first token to be analyzed (may be either kind)
				updateNameOrIndex.call(this, data);
				
				// abort if no second token or buggy
				if(this.buggy || !value[I]) { return; }
			
				// second token to be analyzed (will have to be the other kind)
				updateNameOrIndex.call(this, data);
				
			}
			
			if(!value[I]) { console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (empty declaration)"); this.buggy = true; return; }
			

			// first part
			gridColumnStart: while(true) {
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					if(value[I].value == "span") {
						
						if(!value[++I]) {console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (span is not a valid line name, more tokens expected)"); this.buggy = true; return; }
						
						specifiedStart.type = LOCATE_SPAN;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						gatherNameIndexPair.call(this, specifiedStart);
						if(this.buggy) { return; }
						break;
					
					} else if(value[I].value == "auto") {
						
						specifiedStart.type = LOCATE_AUTO;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						I++; break;
						
					} else {
					
						// grid-column: start-line...
						specifiedStart.type = LOCATE_LINE;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						gatherNameIndexPair.call(this, specifiedStart);
						if(this.buggy) { return; }

						break;
					
					}
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (no token to analyze before the slash token)");
					this.buggy = true;
					return;
					
				} else {
					
					specifiedStart.type = LOCATE_LINE;
					gatherNameIndexPair.call(this, specifiedStart);
					if(this.buggy) { return; }
					
					break;
					
				}
				
				break;
			}
			
			// test whether there is a second part
			if(value[I]) {
				
				if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// second part will start now
					if(!value[++I]) {
						// unexpected lack token at the start of the second part
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (expected at least one more token after the slash token)");
						this.buggy = true; 
						return;
					}
					
				} else {
				
					// unexpected token at the end of the first part
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (expected slash / or end of declaration)");
					this.buggy = true; 
					return;
					
				}
				
			} else {
				
				// end of declaration
				if(specifiedStart.type == LOCATE_LINE && specifiedStart.name != undefined && specifiedStart.index == undefined) {
					// a value consisting of a custom ident is duplicated to the other side
					specifiedEnd.type = LOCATE_LINE;
					specifiedEnd.name = specifiedStart.name;
					specifiedEnd.index = undefined;
				} else {
					// the default value (auto) is a 1-line span in all other cases
					specifiedEnd.type = LOCATE_AUTO;
					specifiedEnd.name = undefined;
					specifiedEnd.index = undefined;
				}
				
			}
			
			// second part (after the "/" token)
			gridColumnEnd: while(value[I]) {
				
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					if(value[I].value == "span") {
						
						if(!value[++I]) {console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (span is not a valid line name, more tokens expected)"); this.buggy = true; return; }
						
						specifiedEnd.type = LOCATE_SPAN;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						gatherNameIndexPair.call(this, specifiedEnd);
						if(this.buggy) { return; }
					
					} else if(value[I].value == "auto") {
						
						specifiedEnd.type = LOCATE_AUTO;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						I++; break;
						
					} else {
					
						// grid-column: start-line...
						specifiedEnd.type = LOCATE_LINE;
						specifiedEnd.name = undefined;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						gatherNameIndexPair.call(this, specifiedEnd);
						if(this.buggy) { return; }

						break;
					
					}
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (no token to analyze before the slash token)");
					this.buggy = true;
					return;
					
				} else {
					
					specifiedEnd.type = LOCATE_LINE;
					gatherNameIndexPair.call(this, specifiedEnd);
					if(this.buggy) { return; }
					
					break;
					
				}
				
				break;					
			}
			
			if(value[I]) {
				console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (tokens after end)");
				this.buggy = true; 
				return;
			}
			
			// If the <integer> is omitted, it defaults to 1.
			//if(specifiedStart.name && specifiedStart.index == undefined) { specifiedStart.index = 1; }
			//if(specifiedEnd.name && specifiedEnd.index == undefined) { specifiedEnd.index = 1; }
			
			// If both grid-row/column-start and grid-row/column-end specify a span, the end span is ignored. 
			if(specifiedEnd.type == LOCATE_SPAN && specifiedStart.type == LOCATE_SPAN) { specifiedEnd.type = LOCATE_AUTO; specifiedEnd.index = undefined; specifiedEnd.name = undefined; }
			
			return [specifiedStart, specifiedEnd];
			
		},
		
	
	};	

	function GridLayout(element) {
	
		// items
		this.element = element; this.element.gridLayout = this;
		this.items = []; // array of GridItem

		// reset
		this.reset();
		
		// other fields
		this.isLayoutScheduled = false;
		
	}
	
	GridLayout.prototype = {
	
		reset: function() {
			
			// layout exclusion style
			this.hlPadding = 0;
			this.hrPadding = 0;
			this.vtPadding = 0;
			this.vbPadding = 0;
			this.rowGap = 0;
			this.colGap = 0;
			
			// computed
			this.xLines = []; // array of array of names
			this.xSizes = []; // array of numbers (in pixels)
			
			this.yLines = [];
			this.ySizes = [];

			this.growX = false;
			this.growY = true;
			this.growDense = false;
			
			this.rcMatrix = []; // array of array of (whatever is not undefined, probably "true")
			
			// specified
			this.specifiedXLines = [];
			this.specifiedXSizes = [];
			
			this.specifiedYLines = [];
			this.specifiedYSizes = [];
			
			this.defaultXSize = new GridTrackBreadth();
			this.defaultYSize = new GridTrackBreadth();

		},
	
		R: function R(x,y) { 
			if(this.growY) {
				// we grow by adding rows (normal behavior)
				return y;
			} else {
				// we grow by adding columns (inversed behavior)
				return x;
			}
		},
		
		C: function C(x,y) { 
			if(this.growY) {
				// we grow by adding rows (normal behavior)
				return x;
			} else {
				// we grow by adding columns (inversed behavior)
				return y;
			}
		},
		
		dispose: function() {
			for(var i = this.items.length; i--;) { var item = this.items[i];
				item.dispose();
			}
			this.element.gridLayout = undefined;
		},
		
		updateFromElement: function() {
			
			// delete old items
			for(var i = this.items.length; i--;) { var item = this.items[i];
				item.dispose();
			}
			
			// add new items
			this.items.length = 0;
			var currentItem = this.element.firstElementChild;
			while(currentItem) {
				
				// add a new grid item for the element
				var newGridItem = new GridItem(currentItem, this);
				newGridItem.updateFromElement();
				this.items.push(newGridItem);
				
				// move to the next element
				currentItem = currentItem.nextElementSibling;
			}
			
			// sort them by css order (desc) then by dom order (asc)
			var sortableItems = this.items.map(function(item, i) { return { item: item, order: item.order, position: i } });
			sortableItems.sort(function(a,b) { if(a.order==b.order) { return a.position-b.position } else if(a.order>b.order) { return +1 } else { return -1; } });
			this.items = sortableItems.map(function(data) { return data.item; });
			
			// reset the style
			this.reset();
			
			// update its own style
			var style = usedStyleOf(this.element); var cssText = '';
			if(cssText=style["grid-template"])         { this.parseGridTemplate(cssText);    }
			if(cssText=style["grid-template-rows"])    { this.parseRowsTemplate(cssText);    }
			if(cssText=style["grid-template-columns"]) { this.parseColumnsTemplate(cssText); }
			if(cssText=style["grid-template-areas"])   { this.parseAreasTemplate(cssText);   }
			if(cssText=style["grid-auto-rows"]) { this.parseAutoRowsBreadth(cssText); }
			if(cssText=style["grid-auto-columns"]) { this.parseAutoColumnsBreadth(cssText); }
			if(cssText=style["grid-auto-flow"]) { // FIXME: should be in a function
				
				// FIXME: not a real parse...
				var tokens = cssText.trim().toLowerCase().split(/\s+/g);
				
				// direction
				if(tokens.indexOf('row')>=0) {
					this.growX = false;
					this.growY = true;
				} else if(tokens.indexOf('column')>=0) {
					this.growX = true;
					this.growY = false;
				}
				
				// algorithm
				// FIXME: should also support 'stack' (wtf)
				if(tokens.indexOf('dense')>=0) {
					this.growDense = true;
				} else {
					this.growDense = false;
				}
				
			}
			if(cssText=style["grid-row-gap"]) { this.parseGridRowGap(cssText); }
			if(cssText=style["grid-column-gap"]) { this.parseGridColumnGap(cssText); }
			if(cssText=style["grid-gap"]) { this.parseGridGap(cssText); }
			
			var usedStyle = style;
			this.hlPadding = parseInt(usedStyle.getPropertyValue('border-left-width')) + parseInt(usedStyle.getPropertyValue('padding-left'));
			this.hrPadding = parseInt(usedStyle.getPropertyValue('border-right-width')) + parseInt(usedStyle.getPropertyValue('padding-right'));
			this.vtPadding = parseInt(usedStyle.getPropertyValue('border-top-width')) + parseInt(usedStyle.getPropertyValue('padding-top'));
			this.vbPadding = parseInt(usedStyle.getPropertyValue('border-bottom-width')) + parseInt(usedStyle.getPropertyValue('padding-bottom'));
			
		},
		
		resetItems: function() {
			for(var i = this.items.length; i--;) {
				var item = this.items[i]; 
				item.xStart = item.xEnd = item.yStart = item.yEnd = -1;
			}
		},
		
		resetLinesToSpecified: function() {
			this.xLines = this.specifiedXLines.slice(0);
			this.xSizes = this.specifiedXSizes.slice(0);
			this.yLines = this.specifiedYLines.slice(0);
			this.ySizes = this.specifiedYSizes.slice(0);
		},
		
		parseTrackBreadthToken: function(cssToken) {
			
			// try to match a pattern
			if(cssToken instanceof cssSyntax.IdentifierToken) {
				
				if(cssToken.value == "auto") {
					return { type: TRACK_BREADTH_AUTO, value:"auto" };
				} else if(cssToken.value == "min-content") {
					return { type: TRACK_BREADTH_MIN_CONTENT, value:"min-content" };
				} else if(cssToken.value == "max-content") {
					return { type: TRACK_BREADTH_MAX_CONTENT, value:"max-content" };
				}
				
			} else if(cssToken instanceof cssSyntax.DimensionToken) {
				
				if(cssToken.unit == "fr") {
					return { type: TRACK_BREADTH_FRACTION, value:cssToken.value };
				} else {
					return { type: TRACK_BREADTH_LENGTH, value:cssUnits.convertToPixels(cssToken.toCSSString(), this.element) };
				}
				
			} else if(cssToken instanceof cssSyntax.PercentageToken) {
				
				return { type: TRACK_BREADTH_PERCENTAGE, value:cssToken.value };
				
			} else {
				
				// TODO: recognize "calc()", too
				
			}
			
			return null;
		},
		
		parseTrackBreadth: function(value, I) {
		
			// TODO: try catch on null parsed token
			var buggy = false;
			
			var currentTrackBreadth = new GridTrackBreadth();
			var parseTrackBreadthToken = function() {
				
				// try to match a pattern
				var result = this.parseTrackBreadthToken(value[I]);
				if(result) { I++; return result; }
				
				// no pattern matched, so the declaration is invalid:
				console.error("INVALID DECLARATION: grid-template-rows/columns: "+value.toCSSString()+" (unrecognized track breadth)");
				buggy = true;
				return;
				
			}
			
			if(value[I] instanceof cssSyntax.Func && value[I].name=="minmax") {
				
				// we need to parse two subvalues
				var value_backup = value;
				var I_backup = I;
				
				// check we have exactly two arguments
				var args = value_backup[I_backup].getArguments();
				if(args.length != 2) { 
					console.error("INVALID DECLARATION: grid-template-rows/columns: "+value_backup.toCSSString()+" (invalid number of arguments to the minmax function)");
					buggy = true;
					return;
				}
				
				// here's the first one:
				value = args[0].filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.minType = data.type;
				currentTrackBreadth.minValue = data.value;
				
				// here's the second one:
				value = args[1].filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.maxType  = data.type;
				currentTrackBreadth.maxValue = data.value;
				
				// restore context
				value = value_backup;
				I = I_backup+1;
				
			} else {
			
				// we need to parse only one value
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.minType  = currentTrackBreadth.maxType  = data.type;
				currentTrackBreadth.minValue = currentTrackBreadth.maxValue = data.value;

			}
				
			return { result: currentTrackBreadth, I:I };
			
		},
		
		parseAutoRowsBreadth: function(cssText) {
		
			// TODO: check that no tokens are left when the parsing is done (+columns)
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var data = this.parseTrackBreadth(value, 0);
			if(data.result) { this.defaultYSize = data.result; } else { throw "TODO: better error message"; }
			return;
			
		},
		
		parseAutoColumnsBreadth: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var data = this.parseTrackBreadth(value, 0);
			if(data.result) { this.defaultXSize = data.result; } else { throw "TODO: better error message"; }
			return;
			
		},
		
		parseGridTemplate: function(cssText) { // TODO: I used some lazy heuristics here
			var buggy = false; 
		
			// step 1: columns are defined before the slash, if any
			var cssText = cssText.replace(/\/\*(.*?)\*\//g,"");
			var cssTextSections = cssText.split("/");
			if(cssTextSections.length == 2) {
				if(this.parseColumnsTemplate(cssTextSections[0])) { return buggy=true; }
				cssText = cssTextSections[1];
			}
			
			// check that the syntax makes sense
			else if(cssTextSections.length >= 3) { 
				return buggy=true;
			}
			
			// check if we can find any string
			if(/"|'/.test(cssText)) {
			
				// extract strings from the value
				var strings = [];
				cssText = cssText.replace(/\s*("(?:.*?)"|'(?:.*?)')\s*([-_a-zA-Z0-9]*)\s*/g,function(data,str,size) { strings.push(str); return ' '+(size||"auto")+' '; });
				
				// remove duplicate line name blocks
				cssText = cssText.replace(/\)\s*\(/g," ");
				
				// parse rows now
				if(this.parseRowsTemplate(cssText)) { return buggy=true; }
				
				// parse areas now
				if(this.parseAreasTemplate(strings.join(' '))) { return buggy=true; }
			
			} else {
				
				// parse rows now
				if(this.parseRowsTemplate(cssText)) { return buggy=true; }
				
			}
			
			return buggy;
			
		},
		
		parseAreasTemplate: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var I = 0;
			var buggy = false;
			var regexp = /^([-_a-zA-Z0-9]+|[.]+)\s*/;
			var grid = [], areas = Object.create(null);
			while(value[I]) {
				
				var str = ''+value[I++].value;
				
				var columns = [];
				while(str!=='') {
					
					// extract next token
					var data = regexp.exec(str); if(!data || data.length != 2) { return buggy=true; }
					str = str.substr(data[0].length); var cell = data[1];
					
					// update cell max pos (ignore empty cells)
					if(cell!='.' && cell[0]!='.') {
						if(!areas[cell]) { areas[cell] = { xStart:columns.length, xEnd:columns.length+1, yStart: I-1, yEnd: I }; }
						if(areas[cell].xStart > columns.length) { return buggy=true; } 
						if(areas[cell].yStart > I-1) { return buggy=true; }
						areas[cell].xEnd = Math.max(areas[cell].xEnd, columns.length+1);
						areas[cell].yEnd = Math.max(areas[cell].yEnd, I);
					}
					// add the cell to this row
					columns.push(data[1]);
					
				}
				
				grid.push(columns);
				
			}
			
			// validate areas
			for(var a in areas) {
				var area = areas[a];
				for(var y = area.yStart; y<area.yEnd; y++) {
					for(var x = area.xStart; x<area.xEnd; x++) {
						if(grid[y][x] != a) { return buggy=true; }
					}
				}
			}
			
			// add autogenerated line names
			for(var a in areas) {
				var area = areas[a];
				
				// make sure we have enough y lines for the areas to fit:
				while(this.specifiedYLines.length<=area.yEnd) {
					this.specifiedYLines.push([]);
					this.specifiedYSizes.push(this.defaultYSize);
				}
				
				// add the y line name
				this.specifiedYLines[area.yStart].push(a+"-start");
				this.specifiedYLines[area.yEnd].push(a+"-end");
				
				// make sure we have enough x lines for the areas to fit:
				while(this.specifiedXLines.length<=area.xEnd) {
					this.specifiedXLines.push([]);
					this.specifiedXSizes.push(this.defaultXSize);
				}
				
				// add the x line name
				this.specifiedXLines[area.xStart].push(a+"-start");
				this.specifiedXLines[area.xEnd].push(a+"-end");
				
			}

		},
		
		parseTrackDefinitions: function(lineNames, trackBreadths, cssText) {
			
			// replace the repeat() function by its full representation
			cssText = cssText.replace(/\[/g,'(').replace(/\]/g,')').replace(/repeat\(\s*([0-9]+)\s*\,((?:\([^()]*\)|[^()])+)\)/gi, function(s, n, v) {
				var result = ' ';
				for(var i = parseInt(n); i--;) { 
					result += v + ' ';
				}
				return result;
			});
			'TODO: improve the repeat support';
			
			// merge duplicate name-definitions
			cssText = cssText.replace(/\)\s*\(/g, ' ');
			'TODO: improve the duplicate name-definitions support';
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var I = 0;
			var buggy = false;
			
			var parseLineNames = function() {
				
				var currentLineNames = []; // array of string
				
				if(value[I] instanceof cssSyntax.SimpleBlock && value[I].name == "(") {
					var tokens = value[I].value;
					for(var J=tokens.length; J--;) {
						
						if (tokens[J] instanceof cssSyntax.IdentifierToken) {
							currentLineNames.push(tokens[J].value);
						} else if (tokens[J] instanceof cssSyntax.WhitespaceToken) {
							// ignore
						} else {
							// unrecognized token, so the declaration is invalid:
							console.error("INVALID DECLARATION: grid-template-rows/columns: "+value.toCSSString()+" (unrecognized line name)");
							buggy = true;
							return;
						}
						
					}
					
					I++;
				}
				
				lineNames.push(currentLineNames); 
				currentLineNames = [];
				
			};
			
			var parseTrackBreadth = function() {
				
				var data = this.parseTrackBreadth(value, I);
				trackBreadths.push(data.result);
				I = data.I;
				
			};
			
			parseLineNames(); 
			while(value[I]) {
				parseTrackBreadth.call(this); if(buggy) { break; }
				parseLineNames(); if(buggy) { break; }
			}
			
		},
		
		parseColumnsTemplate: function(cssText) {
			return this.parseTrackDefinitions(this.specifiedXLines, this.specifiedXSizes, cssText);
		},
		
		parseRowsTemplate: function(cssText) {
			return this.parseTrackDefinitions(this.specifiedYLines, this.specifiedYSizes, cssText);
		},
		
		parseTracksTemplate: function(columnsTemplate, rowsTemplate, areasTemplate) {
			if(rowsTemplate   ) this.parseRowsTemplate(rowsTemplate);
			if(columnsTemplate) this.parseColumnsTemplate(columnsTemplate);
			if(areasTemplate  ) this.parseAreasTemplate(areasTemplate);
		},

		parseGridRowGap: function(cssText) {
			this.rowGap = cssUnits.convertToPixels(cssText, this.element, { isHeightRelated: true });
		},

		parseGridColumnGap: function(cssText) {
			this.colGap = cssUnits.convertToPixels(cssText, this.element, { isWidthRelated: true });
		},

		parseGridGap: function(cssText) {
			var values = cssText.trim().split(/\s+/);
			this.parseGridRowGap(values[0]);
			this.parseGridColumnGap(values[1] || cssText);
		},
		
		buildExplicitMatrix: function() {
			
			// reset
			this.resetLinesToSpecified();
			this.rcMatrix = [];
			
			// simple autogrow
			if(this.growY) {
				this.ensureRows(this.ySizes.length);
				this.ensureColumns(this.xSizes.length);
			} else {
				this.ensureColumns(this.xSizes.length);
				this.ensureRows(this.ySizes.length);
			}
			
		}, 
		
		buildImplicitMatrix: function() { /* see http://dev.w3.org/csswg/css-grid/#auto-placement-algo */
		
			// start by building the explicit matrix
			this.buildExplicitMatrix();
			
			// [1] position non-auto items
			this.positionNonAutoItems();
			
			// [2] position auto-in-column-only items
			this.positionAutoInColumnOnlyItems();
			
			// [3] make room for implicit tracks
			this.autoGrow();
			
		},
		
		ensureRows: function(yEnd) {
			
			if(this.growY) {
				
				// add rows as necessary
				while(this.ySizes.length<yEnd) {
					this.ySizes.push(this.defaultYSize);
				}
				while(this.rcMatrix.length<yEnd) {
					this.rcMatrix.push([]);
				}
				
			} else {
				
				// add rows as necessary
				while(this.ySizes.length<yEnd) {
					this.ySizes.push(this.defaultYSize);
				}
				
				// walk through columns
				for(var x = this.rcMatrix.length; x--;) {
				
					// add rows as necessary
					if(this.rcMatrix[x].length < yEnd) {
						this.rcMatrix[x].length = yEnd;
					}
					
				}
				
			}
			
		},
		
		ensureColumns: function(xEnd) {
			
			if(this.growY) {
			
				// add columns as necessary
				while(this.xSizes.length<xEnd) {
					this.xSizes.push(this.defaultXSize);
				}
				
				// walk through rows
				for(var y = this.rcMatrix.length; y--;) {
				
					// add columns as necessary
					if(this.rcMatrix[y].length < xEnd) {
						this.rcMatrix[y].length = xEnd;
					}
					
				}
			
			} else {
				
				// add columns as necessary
				while(this.xSizes.length<xEnd) {
					this.xSizes.push(this.defaultXSize);
				}
				while(this.rcMatrix.length<xEnd) {
					this.rcMatrix.push([]);
				}
			
			}
		},
		
		markAsOccupied: function(item) {
			
			var xStart = item.xStart;
			var yStart = item.yStart;
			var xEnd = item.xEnd;
			var yEnd = item.yEnd;
		
			// let's check the rcMatrix mode we're in:
			if(this.growY) {
				
				// add rows as necessary
				this.ensureRows(yEnd);
				
				// walk through rows
				for(var y = yStart; y<yEnd; y++) {
				
					// add columns as necessary
					if(this.rcMatrix[y].length < xEnd-1) {
						this.rcMatrix[y].length = xEnd-1;
					}
					
					// walk through columns
					for(var x = xStart; x<xEnd; x++) {
						
						// the cell is occupied
						this.rcMatrix[y][x] = item;
						
					}
				}
				
			} else {
				
				// add columns as necessary
				this.ensureColumns(xEnd);
				
				// walk through rows
				for(var x = xStart; x<xEnd; x++) {
				
					// add rows as necessary
					if(this.rcMatrix[x].length < yEnd-1) {
						this.rcMatrix[x].length = yEnd-1;
					}
					
					// walk through rows
					for(var y = yStart; y<yEnd; y++) {
						
						// the cell is occupied
						this.rcMatrix[x][y] = item;
						
					}
				}
				
			}

		},
		
		positionNonAutoItems: function() {
			
			for(var i=0, l=this.items.length; i<l; i++) {
				var item = this.items[i];
				
				// if the element has a specific column associated to it
				if(item.specifiedXStart.type == LOCATE_LINE) {
					
					// if the element has a specified row associated to it
					if(item.specifiedYStart.type == LOCATE_LINE) {
						
						// find the start position (x axis)
						var xStart = this.findXStart(item);
						
						// find the start position (y axis)
						var yStart = this.findYStart(item);
						
						// find the end position (x axis)
						var xEnd = this.findXEnd(item);
						
						// find the end position (y axis)
						var yEnd = this.findYEnd(item);
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			}
			
		},
		
		positionAutoInColumnOnlyItems: function() {
			
			if(this.growY) {
				
				for(var i=0, l=this.items.length; i<l; i++) {
					var item = this.items[i];
					
					// if the element has a specified row associated to it, but is not positioned yet
					if(item.specifiedYStart.type == LOCATE_LINE && (item.yStart==-1)) {
						
						// find the start position (y axis)
						var yStart = this.findYStart(item);
						
						// find the end position (y axis)
						var yEnd = this.findYEnd(item);
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// add rows as necessary
						this.ensureRows(yEnd);
						
						// walk through columns to find a suitable position
						IncrementalColumnAttempts: for(var sx = 0;;sx++) {
							
							for(var x = sx+spanX-1; x>=sx; x--) {
								for(var y = yStart; y<yEnd; y++) {
								
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
										continue IncrementalColumnAttempts;
									}
								
								}
							}
							
							break;
							
						}
						
						var xStart = sx;
						var xEnd = sx+spanX;
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			} else {
				
				for(var i=0, l=this.items.length; i<l; i++) {
					var item = this.items[i];
					
					// if the element has a specified column associated to it, but is not positioned yet
					if(item.specifiedXStart.type == LOCATE_LINE && (item.xStart==-1)) {
						
						// find the start position (x axis)
						var xStart = this.findXStart(item);
						
						// find the end position (x axis)
						var xEnd = this.findXEnd(item);
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// add rows as necessary
						this.ensureColumns(xEnd);
						
						// walk through columns to find a suitable position
						IncrementalRowAttempts: for(var sy = 0;;sy++) {
							
							for(var y = sy+spanY-1; y>=sy; y--) {
								for(var x = xStart; x<xEnd; x++) {
								
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
										continue IncrementalRowAttempts;
									}
								
								}
							}
							
							break;
							
						}
						
						var yStart = sy;
						var yEnd = sy+spanY;
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			}
	
		},
		
		autoGrow: function() {
			
			// helpers
			var growX = function(index) {
				while(index >= this.xLines.length) {
					this.xLines.push(['*']);
					this.xSizes.push(this.defaultXSize);
				}
			}
			
			var growY = function(index) {
				while(index >= this.yLines.length) {
					this.yLines.push(['*']);
					this.ySizes.push(this.defaultYSize);
				}
			}
			
			// reset the lines to the specified ones if necessary
			this.resetLinesToSpecified(); // TODO: why?
			
			// ensure there's at least one cell
			growX.call(this,1); growY.call(this,1);
			
			// check if an item is explicitly positioned outside the explicit grid, and expand it if needed
			for(var i = this.items.length; i--;) {
				
				var item = this.items[i];
				
				// CONSIDER: items already positioned
				if(item.xEnd > 0) { growX.call(this,item.xEnd); }
				if(item.yEnd > 0) { growY.call(this,item.yEnd); }
				if(item.xEnd > 0 && item.yEnd > 0) { continue; }
				
				// CONSIDER: elements with a known location
				
				// (x axis):
				if(item.specifiedXEnd.type == LOCATE_LINE || item.specifiedXStart.type == LOCATE_LINE) {
					
					var xStart = this.findXStart(item);
					var xEnd = this.findXEnd(item);
					growX.call(this,xEnd);
					
				}
				
				// (y axis):
				if(item.specifiedYEnd.type == LOCATE_LINE || item.specifiedYStart.type == LOCATE_LINE) {
					
					var yStart = this.findYStart(item);
					var yEnd = this.findYEnd(item);
					if(yEnd <= yStart) { yEnd = yStart+1; }
					growY.call(this,yEnd);
					
				}
				
				// CONSIDER: known spans
				// // NOTE: I don't support "grid-row/column-start: span X";
				if(item.specifiedXEnd.type == LOCATE_SPAN && item.specifiedXEnd.name===undefined) {
					growX.call(this,item.specifiedXEnd.index);
				}
				if(item.specifiedYEnd.type == LOCATE_SPAN && item.specifiedYEnd.name===undefined) {
					growY.call(this,item.specifiedYEnd.index);
				}
				
			}
			
			// grow the grid matrix:
			if(this.growY) {
				while(this.ySizes.length>this.rcMatrix.length) {
					this.rcMatrix.push([]);
				}
				for(var r=this.rcMatrix.length; r--;) {
					this.rcMatrix[r].length = this.xSizes.length;
				}
			} else {
				while(this.xSizes.length>this.rcMatrix.length) {
					this.rcMatrix.push([]);
				}
				for(var r=this.rcMatrix.length; r--;) {
					this.rcMatrix[r].length = this.ySizes.length;
				}
			}
			
		},
		
		scheduleRelayout: function() {
			var This = this;
			if(!This.isLayoutScheduled) {
				This.isLayoutScheduled = true;
				requestAnimationFrame(function() {
					try {
						var savedScrolls = getScrollStates();
						This.revokePolyfilledStyle();
						This.updateFromElement();
						This.performLayout();
						This.generatePolyfilledStyle();
						savedScrolls.forEach(function(d) {
							d.element.scrollTop = d.top;
							d.element.scrollLeft = d.left;
						});
					} finally {
						This.isLayoutScheduled = false;
					}
				});
			}
			//-----------------------------------------------------------
			function getScrollStates() {
				var states = [];
				var element = This.element;
				while(element = element.parentNode) {
					if("scrollTop" in element) {
						states.push({ element: element, left: element.scrollLeft, top: element.scrollTop });
					}
				}
				return states;
			}
		},
		
		performLayout: function() {
		
			// process non-automatic items
			this.buildImplicitMatrix();

			// position the remaining grid items. 
			var cursor = { x: 0, y: 0 };

			if(this.growY) {
				
				//For each grid item that hasnt been positioned by the previous steps, in order-modified document order:
				for(var i=0; i<this.items.length; i++) {
					var item = this.items[i]; if(item.xEnd!=-1 && item.yEnd!=-1) { continue; }
					
					// reset the cursor if the algorithm is set to 'dense'
					if(this.growDense) { cursor = { x: 0, y: 0 }; }
					
					//If the item has a definite column position: 
					if(item.specifiedXStart.type == LOCATE_LINE) {
					
						// 1. Set the column position of the cursor to be equal to the inline-start index of the grid item. 
						var xStart = this.findXStart(item); if(cursor.x > xStart) { cursor.y++; } cursor.x = xStart;
						var xEnd = this.findXEnd(item); if(xStart>=xEnd) { xEnd=xStart+1}
						item.xStart=xStart; item.xEnd=xEnd;
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}

						// 2. Increment the auto-placement cursors row position until a value is found where the grid item does not overlap any occupied grid cells (creating new rows in the implicit grid as necessary).
						IncrementalRowAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureRows(cursor.y+spanY);
							
							// check the non-overlap condition
							for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
								for(var x = xStart; x<xEnd; x++) {
									
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
									
										// move to the next row
										cursor.y=y+1; continue IncrementalRowAttempts;
										
									}
									
								}
							}
							
							break;
							
						}
						
						// settle the position
						item.xStart = xStart;
						item.xEnd = xEnd;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);					
						
					} else { // If the item has an automatic grid position in both axes: 
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// Increment the auto-placement cursors row/column position (creating new rows in the implicit grid as necessary)
						var nextStep = function() {
							cursor.x++; if(cursor.x+spanX>this.rcMatrix[0].length) { cursor.y++; this.ensureRows(cursor.y + spanY); cursor.x=0; }
							return true;
						}

						// 1. Increment the column position of the auto-placement cursor until this items grid area does not overlap any occupied grid cells
						IncrementalYXPositionAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureRows(cursor.y+spanY);
							
							// check the non-overlap condition
							for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
								for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
									
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
									
										// move to the next row/column
										nextStep.call(this); continue IncrementalYXPositionAttempts;
										
									}
									
								}
							}
							
							break;
							
							
						}
						
						// settle the position
						item.xStart = cursor.x;
						item.xEnd = cursor.x+spanX;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);
						
					}
					
				}
				
			} else {
				
				//For each grid item that hasnt been positioned by the previous steps, in order-modified document order:
				for(var i=0; i<this.items.length; i++) {
					var item = this.items[i]; if(item.xEnd!=-1 && item.yEnd!=-1) { continue; }
					
					// reset the cursor if the algorithm is set to 'dense'
					if(this.growDense) { cursor = { x: 0, y: 0 }; }
					
					//If the item has a definite row position: 
					if(item.specifiedYStart.type == LOCATE_LINE) {
					
						// 1. Set the column position of the cursor to be equal to the inline-start index of the grid item. 
						var yStart = this.findYStart(item); if(cursor.y > yStart) { cursor.x++; } cursor.y = yStart;
						var yEnd = this.findYEnd(item); if(yStart>=yEnd) { yEnd=yStart+1}
						item.yStart=yStart; item.yEnd=yEnd;
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}

						// 2. Increment the auto-placement cursors row position until a value is found where the grid item does not overlap any occupied grid cells (creating new rows in the implicit grid as necessary).
						IncrementalColumnAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureColumns(cursor.x+spanX);
							
							// check the non-overlap condition
							for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
								for(var y = yStart; y<yEnd; y++) {
									
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
									
										// move to the next row
										cursor.x=x+1; continue IncrementalColumnAttempts;
										
									}
									
								}
							}
							
							break;
							
						}
						
						// settle the position
						item.yStart = yStart;
						item.yEnd = yEnd;
						item.xStart = cursor.x;
						item.yEnd = cursor.x+spanX;
						
						this.markAsOccupied(item);					
						
					} else { // If the item has an automatic grid position in both axes: 
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// Increment the auto-placement cursors row/column position (creating new rows in the implicit grid as necessary)
						var nextStep = function() {
							cursor.y++; if(cursor.y+spanY>this.rcMatrix[0].length) { cursor.x++; this.ensureRows(cursor.x + spanX); cursor.y=0; }
							return true;
						}

						// 1. Increment the column position of the auto-placement cursor until this items grid area does not overlap any occupied grid cells
						IncrementalXYPositionAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureColumns(cursor.x+spanX);
							
							// check the non-overlap condition
							for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
								for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
									
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
									
										// move to the next row/column
										nextStep.call(this); continue IncrementalXYPositionAttempts;
										
									}
									
								}
							}
							
							break;
							
							
						}
						
						// settle the position
						item.xStart = cursor.x;
						item.xEnd = cursor.x+spanX;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);
						
					}
					
				}

			}
			this.computeAbsoluteTrackBreadths();

			
			
		},
		
		computeAbsoluteTrackBreadths: function() {
		
			///////////////////////////////////////////////////////////
			// hide child elements, to get free width/height
			///////////////////////////////////////////////////////////
			var runtimeStyle = createRuntimeStyle('no-children', this.element);
			runtimeStyle.set(this.element, {
				"border"       : "none",
				"padding"      : "0px",
				"min-height"   : "0px",
			});
			for(var i = this.items.length; i--;) {
				runtimeStyle.set(this.items[i],{"display":"none"});
			}
			
			///////////////////////////////////////////////////////////
			// hide child elements, to get free width/height
			///////////////////////////////////////////////////////////
			var LIMIT_IS_INFINITE = 1;		
			var infinity = 9999999.0;
			var rowCount = this.growY ? this.rcMatrix.length : this.rcMatrix[0].length;
			var colCount = this.growY ? this.rcMatrix[0].length : this.rcMatrix.length;
			var fullWidth = this.element.offsetWidth;
			var fullHeight = this.element.offsetHeight;
			var fullDistributableWidth = Math.max(0, fullWidth - Math.max(0, colCount - 1) * this.colGap);
			var fullDistributableHeight = Math.max(0, fullHeight - Math.max(0, rowCount - 1) * this.rowGap);
			
			///////////////////////////////////////////////////////////
			// show child elements again
			///////////////////////////////////////////////////////////
			runtimeStyle.revoke();
			
			// 
			// 10.3  Initialize Track Sizes
			// 
			var initializeFromConstraints = function(v) {
				
				var base = 0, limit = infinity;
				switch(v.minType) {
					
					// For fixed track sizes, resolve to an absolute length and use that size. 
					case TRACK_BREADTH_LENGTH:      base = v.minValue; break;
					case TRACK_BREADTH_PERCENTAGE:  base = v.minValue*fullSize/100; break;
					
				}
				
				switch(v.maxType) {
					
					// For fixed track sizes, resolve to an absolute length and use that size. 
					case TRACK_BREADTH_LENGTH:      limit = v.minValue; break;
					case TRACK_BREADTH_PERCENTAGE:  limit = v.minValue*fullSize/100; break;
					
					// For flexible track sizes, use the tracks initial base size as its initial growth limit.  
					case TRACK_BREADTH_FRACTION:    limit = base; break;
					
					// For intrinsic track sizes, use an initial growth limit of infinity. 
					default:                        limit = infinity; break;
					
				}
				
				return { base:base, limit:limit, breadth:0, flags:((limit==infinity)?LIMIT_IS_INFINITE:0)|0 };
				
			}
			
			//
			// Equal distribution algorithm
			//
			var distributeEquallyAmongTracks = function distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, enforceLimit) {
				// Distribute space to base sizes
				var trackAmount = tracks.length;
				var spacePerTrack = spaceToDistribute/trackAmount;
				if(kind=='base') {
				
					// if we enforce the limit, grow up to the most limitating track
					if(enforceLimit) {
						for(var t = tracks.length; t--;) { var cx = tracks[t].x;
							
							// find the lowest acceptable increase for all tracks
							var newBase = xSizes[cx].base + spacePerTrack;
							
							// if limits are enfo
							if(enforceLimit && (xSizes[cx].flags & LIMIT_IS_INFINITE == 0) && newBase > xSizes[cx].limit) {
								spacePerTrack -= newBase - xSizes[cx].limit;
							}
						}
					}
					
					for(var t = tracks.length; t--;) { var cx = tracks[t].x;
						xSizes[cx].base += spacePerTrack;
					}
					
				} else if(kind == 'limit') {
				
					// Update the tracks' affected sizes by folding in the calculated increase so that the next round of space distribution will account for the increase.
					for(var t = tracks.length; t--;) { var cx = tracks[t].x;
						// If the growth limit is infinite...
						if(xSizes[cx].flags & LIMIT_IS_INFINITE) {
							// set it to the tracks base size plus the calculated increase
							if(xSizes[cx].limit == infinity) {
								xSizes[cx].limit = xSizes[cx].base + spacePerTrack;
							} else {
								xSizes[cx].limit += spacePerTrack; // TODO: THERE IS A BUG HERE ?
							}
						} else {
							// otherwise just increase the limit
							xSizes[cx].limit += spacePerTrack;
						}
					}
				}
			}

			
			// 
			// 10.4  Resolve Content-Based Track Sizing Functions
			// 
			var computeTrackBreadth = function(xSizes, specifiedSizes, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// For each track
				var items_done = 0; // items already consumed for this algorithm
				for(var x = specifiedSizes.length; x--;) {
				
					var dontCountMaxItems = false;
					
					// If the track has a min-content min track sizing function
					if(specifiedSizes[x].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items min-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMinWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a max-content min track sizing function
					else if(specifiedSizes[x].minType == TRACK_BREADTH_MAX_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items max-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMaxWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a min-content max track sizing function
					if(specifiedSizes[x].maxType == TRACK_BREADTH_MIN_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items min-content contributions. 
							if(xSizes[x].limit == infinity) { xSizes[x].limit = getMinWidthOf(item); }
							else { xSizes[x].limit = Math.max(xSizes[x].limit, getMinWidthOf(item)); }
							
							if(!dontCountMaxItems) { items_done++; }
							
						}
						
					} 
					
					// If the track has a max-content max track sizing function
					else if(specifiedSizes[x].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items max-content contributions. 
							if(xSizes[x].limit == infinity) { xSizes[x].limit = getMaxWidthOf(item); }
							else { xSizes[x].limit = Math.max(xSizes[x].limit, getMaxWidthOf(item)); }
							
							if(!dontCountMaxItems) { items_done++; }
							
						}
						
					}
					
					// update infinity flag
					if(xSizes[x].limit != infinity) {
						xSizes[x].flags = xSizes[x].flags & ~LIMIT_IS_INFINITE;
					}
					
				}
				
				// Next, consider the items with a span of 2 that do not span a track with a flexible sizing function: 
				// Repeat incrementally for items with greater spans until all items have been considered.
				for(var span = 2; items_done < this.items.length && span <= specifiedSizes.length; span++) {
					ItemLoop: for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
						if(item_xEnd-item_xStart != span) continue ItemLoop;
						
						// gather some pieces of data about the tracks
						var full_base = 0; var full_limit = 0;
						for(var cx = item_xStart; cx<item_xEnd; cx++) { 
							
							// 1. we want to make sure none is flexible
							if(specifiedSizes[cx].maxType == TRACK_BREADTH_FRACTION) continue ItemLoop;
							
							// 2. compute aggregated sizes
							full_base += xSizes[cx].base;
							full_limit += xSizes[cx].limit;
							
						}
						if(full_limit > infinity) full_limit=infinity;
						
						var distributeFreeSpace = function(requiredSpace, kind /*'base'|'limit'*/, target /*'min-content'|'max-content'*/) {
							
							while (true) {
							
								// compute the required extra space
								var spaceToDistribute = requiredSpace;
								for(var cx = item_xStart; cx<item_xEnd; cx++) {
									spaceToDistribute -= xSizes[cx][kind];
								}
								
								// if no space to distribute, just lock auto columns:
								if(spaceToDistribute <= 1/1024) { //due to double precision, this may never reach perfect 0
									for(var cx = item_xStart; cx<item_xEnd; cx++) {
										if(xSizes[cx].limit == infinity) {
											xSizes[cx].limit = xSizes[cx].base;
										}
									}
									return;
								}

								// sort rows by growth limit
								var rows_and_limits = [];
								for(var cx = item_xStart; cx<item_xEnd; cx++) {
									rows_and_limits.push({ 
										x:cx, 
										base:xSizes[cx].base,
										limit:xSizes[cx].limit,
										minIsMinContent: specifiedSizes[cx].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[cx].minType == TRACK_BREADTH_AUTO,
										minIsMaxContent: specifiedSizes[cx].minType == TRACK_BREADTH_MAX_CONTENT,
										maxIsMinContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MIN_CONTENT,
										maxIsMaxContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[cx].maxType == TRACK_BREADTH_AUTO
									});
								}
								rows_and_limits.sort(function(a,b) { return a.limit-b.limit; });
								
								// remove non-affected tracks
								rows_and_limits = rows_and_limits.filter(function(b) {
									if(kind=='base') {
										if(target=='min-content') {
											return b.minIsMinContent||b.minIsMaxContent;
										} else if(target=='max-content') {
											return b.minIsMaxContent;
										}
									} else if (kind == 'limit') {
										if(target=='min-content') {
											return b.maxIsMinContent||b.maxIsMaxContent;
										} else if(target=='max-content') {
											return b.maxIsMaxContent;
										}
									}
									return false;
								});
								
								// check that there is at least one affected track
								if(rows_and_limits.length == 0) { return; }
								
								// apply the algorithm
								if(kind=='base') {
									
									// Distribute space up to growth limits
									var tracks = rows_and_limits.filter(function(b) { return b.base<b.limit; }, 0);
									var trackAmount = tracks.length;
									if(trackAmount > 0) {
										
										distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/true);
											
									} else {
										
										// Distribute space beyond growth limits
										// If space remains after all tracks are frozen, unfreeze and continue to distribute space to
 
										
										// - when handling min-content base sizes: 
										if(target=='min-content') {
											
											// any affected track that happens to also have an intrinsic max track sizing function; 
											var tracks = rows_and_limits.filter(function(b) { return b.maxIsMinContent||b.maxIsMaxContent; }, 0);
											var trackAmount = tracks.length;
											if(trackAmount>=1) {
												
												// (such tracks exist:)
												distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/false);
												
											} else {
												
												// if there are no such tracks, then all affected tracks. 
												distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute, /*enforceLimit:*/false);
											}
											
										}
										
										// - when handling max-content base sizes: 
										else if(target=='max-content') {
											
											// any affected track that happens to also have a max-content max track sizing function;
											var tracks = rows_and_limits.filter(function(b) { return b.maxIsMaxContent; }, 0);
											var trackAmount = tracks.length;
											if(trackAmount>=1) {
												
												// (such tracks exist:)
												distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/false);
												
											} else {
												
												// if there are no such tracks, then all affected tracks. 
												distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute, /*enforceLimit:*/false);
											}
											
										}
									}
									
								}
								
								else if (kind == 'limit') {
									
									// distribute among all tracks
									distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute);
									
								}
							}
						};
						
						var updateInfiniteLimitFlag = function() {
							for(var x = xSizes.length; x--;) {
								if(xSizes[x].limit != infinity) {
									xSizes[x].flags = xSizes[x].flags & ~LIMIT_IS_INFINITE;
								}
							}
						}
						
						//
						// 1. For intrinsic minimums: First increase the base size of tracks with a min track sizing function of min-content or max-content by distributing extra space as needed to account for these items' min-content contributions. 
						//
						distributeFreeSpace(getMinWidthOf(item), 'base', 'min-content');
						updateInfiniteLimitFlag();
						
						
						//
						// 2. For max-content minimums: Next continue to increase the base size of tracks with a min track sizing function of max-content by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'base', 'max-content');
						updateInfiniteLimitFlag();
						
						//
						// 3. For intrinsic maximums: Third increase the growth limit of tracks with a max track sizing function of min-content or max-content by distributing extra space as needed to account for these items' min-content contributions. 
						// Mark any tracks whose growth limit changed from infinite to finite in this step as infinitely growable for the next step. 
						// (aka do not update infinity flag)
						//
						distributeFreeSpace(getMinWidthOf(item), 'limit', 'min-content');
						
						//
						// 4. For max-content maximums: Lastly continue to increase the growth limit of tracks with a max track sizing function of max-content by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'limit', 'max-content');
						updateInfiniteLimitFlag();
						
						items_done++;
						
					}
				}

			}
			
			var computeTrackBreadthIncrease = function(xSizes, specifiedSizes, fullSize, fullDistributableSize, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// sort rows by growth limit
				var rows_and_limits = xSizes.map(function(item, cx) { 
					return { 
						x:cx, 
						base:xSizes[cx].base,
						limit:xSizes[cx].limit,
						minIsMinContent: specifiedSizes[cx].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[cx].minType == TRACK_BREADTH_AUTO,
						minIsMaxContent: specifiedSizes[cx].minType == TRACK_BREADTH_MAX_CONTENT,
						maxIsMinContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MIN_CONTENT,
						maxIsMaxContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[cx].maxType == TRACK_BREADTH_AUTO
					};
				});
				rows_and_limits.sort(function(a,b) { return a.limit-b.limit; });
				
				while(true) {
					
					// compute size to distribute
					var spaceToDistribute = fullDistributableSize;
					for(var cx = xSizes.length; cx--;) {
						spaceToDistribute -= xSizes[cx].base;
					}
					
					// check that there is some space to distribute
					if(spaceToDistribute <= 1/1024) { return; } // NOTE: the space may never become 0 due to a rounding issue
					
					// Distribute space up to growth limits
					var tracks = rows_and_limits = rows_and_limits.filter(function(b) { return ((b.minIsMinContent||b.minIsMaxContent) && b.base<b.limit); }, 0);
					var trackAmount = tracks.length; if(trackAmount <= 0) { return; }
					distributeEquallyAmongTracks(xSizes, 'base', tracks, spaceToDistribute, /*enforceLimit:*/true);
					
				}
			}
			
			var computeFlexibleTrackBreadth = function(xSizes, specifiedSizes, fullSize, fullDistributableSize, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// If the free space is an indefinite length: 
				if(fullSize==0) {
					
					//The used flex fraction is the maximum of: 
					var currentFraction = 0;
					
					//  Each flexible tracks base size divided by its flex factor. 
					'TODO: I believe this is completely useless, but CSSWG will not change it.';
					
					//  The result of finding the size of an fr for each grid item that crosses a flexible track, using all the grid tracks that the item crosses and a space to fill of the items max-content contribution. 
					for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
						
						// gather some pieces of data about the tracks
						var spaceToDistribute = getMaxWidthOf(item); var flexFactorSum = 0;
						for(var cx = item_xStart; cx<item_xEnd; cx++) { 
							
							if(specifiedSizes[cx].maxType == TRACK_BREADTH_FRACTION) {
								// compute how much flexible tracks are required
								flexFactorSum += specifiedSizes[cx].maxValue;
							} else {
								// deduce non-flexible tracks from the space to distribute
								spaceToDistribute -= xSizes[cx].base;
							}
							
						}
						
						// compute the minimum flex fraction for this item
						if(spaceToDistribute > 0 && flexFactorSum > 0) {
							currentFraction = Math.max(currentFraction, spaceToDistribute / flexFactorSum)
						}
						
					}
					
					// for each flexible track
					for(var x = xSizes.length; x--;) {
						if(specifiedSizes[x].maxType == TRACK_BREADTH_FRACTION) {
							
							// Compute the product of the hypothetical flex fraction and the tracks flex factor
							var trackSize = currentFraction * specifiedSizes[x].maxValue;
							
							// If that size is less than the tracks base size:
							if(xSizes[x].base < trackSize) {
								
								// set its base size to that product.
								xSizes[x].breadth = trackSize;
								
							} else {
								
								xSizes[x].breadth = xSizes[x].base;
								
							}
							
						} else {
							
							xSizes[x].breadth = xSizes[x].base;
							
						}
					}
					
				} else {
				
					// compute the leftover space
					var spaceToDistribute = fullDistributableSize;
					var tracks = []; var fractionSum = 0;
					for(var x = xSizes.length; x--;) {
						if(specifiedSizes[x].maxType == TRACK_BREADTH_FRACTION) {
							tracks.push(x); fractionSum += specifiedSizes[x].maxValue;
						} else {
							spaceToDistribute -= (xSizes[x].breadth = xSizes[x].base);
						}
					}

					// while there are flexible tracks to size
					while(tracks.length>0) {
						
						// Let the hypothetical flex fraction be the leftover space divided by the sum of the flex factors of the flexible tracks.
						var currentFraction = spaceToDistribute / fractionSum; var restart = false;
						
						// for each flexible track
						for(var i = tracks.length; i--;) { var x = tracks[i];
							
							// Compute the product of the hypothetical flex fraction and the tracks flex factor
							var trackSize = currentFraction * specifiedSizes[x].maxValue;
							
							// If that size is less than the tracks base size:
							if(xSizes[x].base < trackSize) {
								
								// set its base size to that product.
								xSizes[x].breadth = trackSize;

							} else {
								
								// mark as non-flexible
								xSizes[x].breadth = xSizes[x].base;
								
								// remove from computation
								fractionSum -= specifiedSizes[x].maxValue;
								tracks.splice(i,1);
								
								// restart
								restart=true;
								
							}
							
						}
						
						if(!restart) { tracks.length = 0; }
						
					}
					
				}
			}
			
			var computeFinalTrackBreadth = function(xSizes, this_xSizes, fullWidth, fullDistributableWidth, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// compute base and limit
				computeTrackBreadth.call(
					this,
					xSizes,
					this_xSizes,
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);
				
				// ResolveContentBasedTrackSizingFunctions (step 4)
				for(var x = this_xSizes.length; x--;) {
					if(xSizes[x].limit == infinity) { xSizes[x].limit = xSizes[x].base; }
				}
				
				// grow tracks up to their max
				computeTrackBreadthIncrease.call(
					this,
					xSizes,
					this_xSizes,
					fullWidth,
					fullDistributableWidth,
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);
				
				// handle flexible things
				computeFlexibleTrackBreadth.call(
					this,
					xSizes,
					this_xSizes,
					fullWidth,
					fullDistributableWidth,					
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);

			}
			
			///////////////////////////////////////////////////////////
			// compute breadth of columns
			///////////////////////////////////////////////////////////
			var mode = 'x';
			var fullSize = fullWidth;
			var fullDistributableSize = fullDistributableWidth;
			var xSizes = this.xSizes.map(initializeFromConstraints);
			var colGap = this.colGap;

			var getMinWidthOf = function(item) { return item.minWidth + item.hMargins - Math.max(0, item.xEnd - item.xStart - 1) * colGap; };
			var getMaxWidthOf = function(item) { return item.maxWidth + item.hMargins - Math.max(0, item.xEnd - item.xStart - 1) * colGap; };
			var getXStartOf = function(item) { return item.xStart; }; 
			var getXEndOf = function(item) { return item.xEnd; };
			
			// compute base and limit
			computeFinalTrackBreadth.call(
				this,
				xSizes,
				this.xSizes,
				fullWidth,
				fullDistributableWidth,				
				getMinWidthOf,
				getMaxWidthOf,
				getXStartOf,
				getXEndOf
			);
			
			///////////////////////////////////////////////////////////
			// position each element absolutely, and set width to compute height
			///////////////////////////////////////////////////////////
			var usedStyle = usedStyleOf(this.element);
			var runtimeStyle = createRuntimeStyle('temp-position', this.element);
			
			if(usedStyle.getPropertyValue('position')=='static') { 
				runtimeStyle.set(this.element, {"position":"relative"});
			}
			
			this.items.forEach(function(item) {
				
				// firstly, compute the total breadth of the spanned tracks
				var totalBreadth = 0;
				for(var cx = item.xStart; cx<item.xEnd; cx++) {
					totalBreadth += xSizes[cx].breadth;
				}
				
				// secondly, adapt to the alignment properties
				"TODO: alignment";
				
				// finally, set the style
				runtimeStyle.set(item.element, {
					"position"   : "absolute",
					"width"      : ""+totalBreadth+"px",
					"box-sizing" : "border-box"
				});
				
			});
			
			///////////////////////////////////////////////////////////
			// compute breadth of rows
			///////////////////////////////////////////////////////////
			var mode = 'y';
			var fullSize = fullHeight;
			var fullDistributableSize = fullDistributableHeight;
			var ySizes = this.ySizes.map(initializeFromConstraints);
			var rowGap = this.rowGap;

			var getMinHeightOf = function(item) { return item.element.offsetHeight + item.vMargins - Math.max(0, item.yEnd - item.yStart - 1) * rowGap; };
			var getMaxHeightOf = function(item) { return item.element.offsetHeight + item.vMargins - Math.max(0, item.yEnd - item.yStart - 1) * rowGap; };
			var getYStartOf = function(item) { return item.yStart; };
			var getYEndOf = function(item) { return item.yEnd; };
			
			computeFinalTrackBreadth.call(
				this,
				ySizes,
				this.ySizes,
				fullHeight,
				fullDistributableHeight,				
				getMinHeightOf,
				getMaxHeightOf,
				getYStartOf,
				getYEndOf
			);
									
			///////////////////////////////////////////////////////////
			// release the override style of elements
			///////////////////////////////////////////////////////////
			runtimeStyle.revoke();
			
			///////////////////////////////////////////////////////////
			// save the results
			////
			this.finalXSizes = xSizes;
			this.finalYSizes = ySizes;
			
			///////////////////////////////////////////////////////////
			// log the results
			///////////////////////////////////////////////////////////
			/*console.log({
				x: xSizes,
				xBreadths: xSizes.map(function(e) { return e.breadth; }),
				y: ySizes,
				yBreadths: ySizes.map(function(e) { return e.breadth; }),
			});*/
		
		},
		
		generateMSGridStyle: function() {
			
			this.element.style.setProperty("display","-ms-grid");
			this.element.style.setProperty("-ms-grid-rows",this.ySizes.join(' '));
			this.element.style.setProperty("-ms-grid-columns",this.xSizes.join(' '));
			
			for(var i=this.items.length; i--;) { var item = this.items[i]; 
				
				item.element.style.setProperty("-ms-grid-row", item.yStart+1);
				item.element.style.setProperty("-ms-grid-column", item.xStart+1);
				item.element.style.setProperty("-ms-grid-row-span", item.yEnd-item.yStart);
				item.element.style.setProperty("-ms-grid-column-span", item.xEnd-item.xStart);
				
			}
			
		},
		
		generatePolyfilledStyle: function() {
		
			var usedStyle = usedStyleOf(this.element);
			var runtimeStyle = createRuntimeStyle("css-grid", this.element);
		
			var xSizes = this.finalXSizes;
			var ySizes = this.finalYSizes;
			
			var grid_width = 0;
			for(var x = 0; x<xSizes.length; x++) {
				grid_width += xSizes[x].breadth;
			}
			grid_width += this.colGap * (xSizes.length - 1);
			
			var grid_height = 0;
			for(var y = 0; y<ySizes.length; y++) {
				grid_height += ySizes[y].breadth;
			}
			grid_height += this.rowGap * (ySizes.length - 1);
			
			var runtimeStyleData = {};
			if(["block","inline-block"].indexOf(usedStyle.getPropertyValue("display")) == -1) {
				runtimeStyleData["display"] = "block";
			}
			if(usedStyle.getPropertyValue('position')=='static') {
				runtimeStyleData["position"] = "relative";
			}
			
			runtimeStyle.set(this.element, runtimeStyleData);
			

			// set the position and sizing of each elements
			var width = grid_width; var height = grid_height;
			var items_widths = []; var items_heights = []; 
			items_widths.length = items_heights.length = this.items.length;
			for(var i=this.items.length; i--;) { var item = this.items[i]; 
				
				var left = this.hlPadding;
				for(var x = 0; x<item.xStart; x++) {
					left += xSizes[x].breadth;
				}
				left += this.colGap * item.xStart;
				
				var width = 0;
				for(var x = item.xStart; x<item.xEnd; x++) {
					width += xSizes[x].breadth;
				}
				width += Math.max(0, item.xEnd - item.xStart - 1) * this.colGap;
				
				var top = this.vtPadding;
				for(var y = 0; y<item.yStart; y++) {
					top += ySizes[y].breadth;
				}
				top += this.rowGap * item.yStart;
				
				var height = 0;
				for(var y = item.yStart; y<item.yEnd; y++) {
					height += ySizes[y].breadth;
				}
				height += Math.max(0, item.yEnd - item.yStart - 1) * this.rowGap;
				
				
				runtimeStyle.set(item.element, {
					"position"    : "absolute",
					"box-sizing"  : "border-box",
					"top"         : ""+top +"px",
					"left"        : ""+left+'px'
				});
				
				items_widths[i] = width-item.hMargins;
				items_heights[i] = height-item.vMargins;
				
			}
			
			var isReplaced = /^(SVG|MATH|IMG|VIDEO|PICTURE|OBJECT|EMBED|IFRAME)$/i;
			
			// if horizontal stretch
			if(true) { // TODO: horizontal stretch
				for(var i=this.items.length; i--;) { var item = this.items[i]; var width = items_widths[i];
					if(item.minWidth <= width || isReplaced.test(item.element.tagName)) { // TODO: fix that... (should only do it for auto elements with stretch enabled)
						runtimeStyle.set(item.element, {"width": width +'px'});
					}
				}
			}
			
			// if vertical stretch
			if(true) { // TODO: vertical stretch
				for(var i=this.items.length; i--;) { var item = this.items[i]; var height = items_heights[i];
					if(item.element.offsetHeight <= height || isReplaced.test(item.element.tagName)) {
						runtimeStyle.set(item.element, {"height": height+'px'});
					}
				}
			}
			
			// make sure the final size is right:
			var runtimeStyleData = {};
			//if(["absolute","fixed"].indexOf(usedStyle.getPropertyValue("position")) >= 0) { runtimeStyleData["width"] = grid_width+'px'; }
			if(["auto","0px"].indexOf(usedStyle.getPropertyValue("width")) >= 0) { runtimeStyleData["width"] = grid_width+'px'; }
			if(["auto","0px"].indexOf(usedStyle.getPropertyValue("height")) >= 0) { runtimeStyleData["height"] = grid_height+'px'; }
			runtimeStyle.set(this.element, runtimeStyleData);

			
		},
		
		revokePolyfilledStyle: function() {
			
			createRuntimeStyle('css-grid', this.element).revoke();
			
		},
		
		findXStart: function(item) {
		
			//////////////////////////////////////////////////////////////////////////////
			// TODO: this doesn't reflect the spec after the changes made at my request //
			//////////////////////////////////////////////////////////////////////////////
			
			var xStart = -1;
			if(item.specifiedXStart.type !== LOCATE_LINE) return 0;
			
			if(item.specifiedXStart.name) {
				
				//
				// <integer>? <custom-ident>
				//
				
				if(item.specifiedXStart.index === undefined) {
					
					// First attempts to match the grid areas edge to a named grid area
					xStart = this.findXLine(item.specifiedXStart.name+"-start", 0, 0, /*dontFallback*/true);
					
				}
				if(xStart==-1) {
				
					// Otherwise, contributes the first named line with the specified name to the grid items placement. 
					xStart = this.findXLine(item.specifiedXStart.name, 0, (item.specifiedXStart.index||1)-1);
					
				}
				
			} else {
				
				//
				// <integer>
				//
				xStart = (item.specifiedXStart.index||1)-1;
				
			}
			
			// correct impossible values
			if(xStart < 0) { xStart=0; }
			
			// return the final result
			return item.xStart = xStart;
			
		},
		
		findYStart: function(item) {
			
			var yStart = -1;
			if(item.specifiedYStart.type !== LOCATE_LINE) return 0;

			if(item.specifiedYStart.name) {
				
				//
				// <interger>? <custom-ident>
				//
				
				if(item.specifiedYStart.index === undefined) {
					
					// First attempts to match the grid areas edge to a named grid area
					yStart = this.findYLine(item.specifiedYStart.name+"-start", 0, 0, /*dontFallback*/true);
					
				}
				if(yStart == -1) {
					
					// Otherwise, contributes the first named line with the specified name to the grid items placement. 
					yStart = this.findYLine(item.specifiedYStart.name, 0,(item.specifiedYStart.index||1)-1);
					
				}
				
			} else {
				
				//
				// <integer>
				//
				yStart = (item.specifiedYStart.index||1)-1;
				
			}
			
			// correct impossible values
			if(yStart < 0) { yStart=0; }
			
			// return the final result
			return item.yStart = yStart;
			
		},
		
		findXEnd: function(item) {
			
			var xEnd = -1;
			var xStart = item.xStart;
			switch(item.specifiedXEnd.type) {
				
				case LOCATE_LINE:
					if(item.specifiedXEnd.name) {
						if(item.specifiedXEnd.index === undefined) {
							
							// First attempts to match the grid areas edge to a named grid area
							xEnd = this.findXLine(item.specifiedXEnd.name+"-end", 0, 0, /*dontFallback*/true);
							
						}
						if(xEnd == -1) {
							
							// Otherwise, contributes the first named line with the specified name to the grid items placement. 
							xEnd = this.findXLine(item.specifiedXEnd.name, 0, (item.specifiedXEnd.index||1)-1);
							
						}
					} else {
						xEnd = (item.specifiedXEnd.index||1)-1;
					}
					break;
					
				case LOCATE_SPAN:
					if(item.specifiedXEnd.name) {
					
						// Set the corresponding edge N lines apart from its opposite edge. 
						xEnd = this.findXLine(item.specifiedXEnd.name, xStart+1, (item.specifiedXEnd.index||1)-1);
						
					} else {
						
						// Set the corresponding edge N lines apart from its opposite edge. 
						xEnd = xStart+((item.specifiedXEnd.index|0)||1);
					}
					break;
					
				case LOCATE_AUTO:
					// I don't support subgrids, so this is always true:
					xEnd = xStart+1;
					break;
			}
			
			if(xEnd <= xStart) { xEnd = xStart+1; }
			return item.xEnd = xEnd;
			
		},
		
		findYEnd: function(item) {
			
			var yEnd = -1;
			var yStart = item.yStart;
			switch(item.specifiedYEnd.type) {
				
				case LOCATE_LINE:
					if(item.specifiedYEnd.name) {
						
						//
						// <integer>? <identifier>
						// 
						if(item.specifiedYEnd.index === undefined) {
							
							// First attempts to match the grid areas edge to a named grid area
							yEnd = this.findYLine(item.specifiedYEnd.name+"-end", 0, 0, /*dontFallback*/true);
							
						}
						if(yEnd == -1) {
							
							// Otherwise, contributes the first named line with the specified name to the grid items placement. 
							yEnd = this.findYLine(item.specifiedYEnd.name, 0, (item.specifiedYEnd.index||1)-1);
							
						}
						
					} else {
						
						//
						// <integer>
						//
						yEnd = (item.specifiedYEnd.index||1)-1;
						
					}
					break;
					
				case LOCATE_SPAN:
					if(item.specifiedYEnd.name) {
					
						// Set the corresponding edge N lines apart from its opposite edge. 
						yEnd = this.findYLine(item.specifiedYEnd.name, yStart+1, (item.specifiedYEnd.index||1)-1);
						
						// TODO: I'm having the wrong behavior here, I sent a mail to csswg to get the spec changed
						// "The spec is more what you'd call 'guidelines' than actual rules"
						if(yEnd==-1) { yEnd = 0; }
						
					} else {
						
						// Set the corresponding edge N lines apart from its opposite edge. 
						yEnd = yStart+((item.specifiedYEnd.index|0)||1);
					}
					break;
					
				case LOCATE_AUTO:
					// I don't support subgrids, so this is always true:
					yEnd = yStart+1;
					break;
					
			}
			
			// correct impossible end values
			if(yEnd <= yStart) { yEnd = yStart+1; }
			
			// return the final result
			return item.yEnd = yEnd;

		},
		
		findXLine: function(name, startIndex, skipCount, dontFallback) {
		
			startIndex=startIndex|0;
			skipCount=skipCount|0;
			
			// special case for cases where the name isn't provided
			if(!name) {
				if(startIndex+skipCount < this.xLines.length) {
					return startIndex+skipCount;
				} else {
					return this.xLines.length;
				}
			}
			
			// find the 1+skipCount'th line to match the right name
			var last = -1;
			for(var i = startIndex; i<this.xLines.length; i++) {
				if(this.xLines[i].indexOf(name) >= 0 || (!dontFallback && this.xLines[i].indexOf('*') >= 0)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}

			// if we still have lines to find, we know that lines of the implicit grid match all names
			if(!dontFallback) { console.warn('[CSS-GRID] Missing '+(skipCount+1)+' lines named "'+name+'" after line '+startIndex+'.'); last = this.xLines.length+skipCount+1; this.ensureRows(last); }
			return last;
			
		},
		
		findYLine: function(name, startIndex, skipCount, dontFallback) {

			startIndex=startIndex|0;
			skipCount=skipCount|0;
			
			// special case for cases where the name isn't provided
			if(!name) {
				if(startIndex+skipCount < this.yLines.length) {
					return startIndex+skipCount;
				} else {
					return this.yLines.length;
				}
			}
			
			// find the 1+skipCount'th line to match the right name
			var last = -1;
			for(var i = startIndex; i<this.yLines.length; i++) {
				if(this.yLines[i].indexOf(name) >= 0 || (!dontFallback && this.yLines[i].indexOf('*') >= 0)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}
			
			// if we still have lines to find, we know that lines of the implicit grid match all names
			if(!dontFallback) { console.warn('[CSS-GRID] Missing '+(skipCount+1)+' lines named "'+name+'" after line '+startIndex+'.'); last = this.yLines.length+skipCount+1; this.ensureColumns(last); }
			return last;
			
		},
		
	}
	
	var cssGrid = {
		
		LOCATE_LINE   :  LOCATE_LINE,
		LOCATE_SPAN   :  LOCATE_SPAN,
		LOCATE_AREA   :  LOCATE_AREA,
		LOCATE_AUTO   :  LOCATE_AUTO,
		
		ALIGN_START   :  ALIGN_START,
		ALIGN_CENTER  :  ALIGN_CENTER,
		ALIGN_END     :  ALIGN_END,
		ALIGN_FIT     :  ALIGN_FIT,  
		
		TRACK_BREADTH_AUTO        : TRACK_BREADTH_AUTO,
		TRACK_BREADTH_LENGTH      : TRACK_BREADTH_LENGTH,
		TRACK_BREADTH_FRACTION    : TRACK_BREADTH_FRACTION,
		TRACK_BREADTH_PERCENTAGE  : TRACK_BREADTH_PERCENTAGE,
		TRACK_BREADTH_MIN_CONTENT : TRACK_BREADTH_MIN_CONTENT,
		TRACK_BREADTH_MAX_CONTENT : TRACK_BREADTH_MAX_CONTENT,

		GridLayout: GridLayout, 
		GridItem: GridItem, 
		GridItemPosition: GridItemPosition,
		GridTrackBreadth: GridTrackBreadth,
		
	};
	return cssGrid;
	
})(window, document)
