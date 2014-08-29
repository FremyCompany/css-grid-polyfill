var cssGrid = (function(window, document) {
	
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
		this.parentGrid = parentGrid;
		
		this.reset();
		this.buggy = true;
		
	}
	
	GridItem.prototype = {
	
		reset: function() {
			
			this.minWidth = 0;
			this.maxWidth = 0;
			
			
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
			var style = element;//usedStyleOf(element); // TODO: use css cascading polyfill instead
			
			this.reset(); 
			this.buggy = false;
			
			// compute sie
			this.minWidth = cssSizing.minWidthOf(element);
			this.maxWidth = cssSizing.maxWidthOf(element);
			
			// locate x and y lines toegether
			if(style["grid-area"]) {
				// TODO: ...
			}
			
			// locate x lines
			if(style["grid-column"]) {
				this.parseLocationInstructions(this.specifiedXStart, this.specifiedXEnd, style["grid-column"]);
			}
			
			// locate y lines
			if(style["grid-row"]) {
				this.parseLocationInstructions(this.specifiedYStart, this.specifiedYEnd, style["grid-row"]);
			}
			
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
						gatherNameIndexPair.call(this, specifiedEnd);
						if(this.buggy) { return; }
					
					} else if(value[I].value == "auto") {
						
						specifiedEnd.type = LOCATE_AUTO;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						break;
						
					} else {
					
						// grid-column: start-line...
						specifiedEnd.type = LOCATE_LINE;
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
			
			// If the <integer> is omitted, it defaults to ‘1’.
			if(specifiedStart.name && specifiedStart.index == undefined) { specifiedStart.index = 1; }
			if(specifiedEnd.name && specifiedEnd.index == undefined) { specifiedEnd.index = 1; }
			
			// If both ‘grid-row/column-start’ and ‘grid-row/column-end’ specify a span, the end span is ignored. 
			if(specifiedEnd.type == LOCATE_SPAN && specifiedStart.type == LOCATE_SPAN) { specifiedEnd.type = LOCATE_AUTO; specifiedEnd.index = undefined; specifiedEnd.name = undefined; }
			
			return [specifiedStart, specifiedEnd];
			
		},
		
	
	};	

	function GridLayout(element) {
	
		// items
		this.element = element;
		this.items = []; // array of GridItem
		
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
		
	}
	
	GridLayout.prototype = {
	
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
		
		parseGridTemplate: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			
		},
		
		parseAreasTemplate: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var I = 0;
			var buggy = false;
			var regexp = /^([-_a-zA-Z0-9]+|\.)\s*/;
			var grid = [], areas = Object.create(null);
			while(value[I]) {
				
				var str = ''+value[I++].value;
				
				var columns = [];
				while(str!=='') {
					
					// extract next token
					var data = regexp.exec(str); if(!data || data.length != 2) { return buggy=true; }
					str = str.substr(data[0].length); var cell = data[1];
					
					// ignore empty cells(
					if(cell=='.') { continue; }
					
					// update cell max pos
					if(!areas[cell]) { areas[cell] = { xStart:columns.length, xEnd:columns.length+1, yStart: I-1, yEnd: I }; }
					if(areas[cell].xStart > columns.length) { return buggy=true; } 
					if(areas[cell].yStart > I-1) { return buggy=true; }
					areas[cell].xEnd = Math.max(areas[cell].xEnd, columns.length+1);
					areas[cell].yEnd = Math.max(areas[cell].yEnd, I);
					
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
				
				var currentTrackBreadth = new GridTrackBreadth();
				var parseTrackBreadthToken = function() {
					
					// try to match a pattern
					if(value[I] instanceof cssSyntax.IdentifierToken) {
						
						if(value[I].value == "auto") {
							return I++, { type: TRACK_BREADTH_AUTO, value:"auto" };
						} else if(value[I].value == "min-content") {
							return I++, { type: TRACK_BREADTH_MIN_CONTENT, value:"min-content" };
						} else if(value[I].value == "max-content") {
							return I++, { type: TRACK_BREADTH_MAX_CONTENT, value:"max-content" };
						}
						
					} else if(value[I] instanceof cssSyntax.DimensionToken) {
						
						if(value[I].unit == "fr") {
							return { type: TRACK_BREADTH_FRACTION, value:value[I++].num };
						} else {
							return { type: TRACK_BREADTH_LENGTH, value:cssUnits.convertToPixels(value[I++].toCSSString(), this.element) };
						}
						
					} else if(value[I] instanceof cssSyntax.PercentageToken) {
						
						return { type: TRACK_BREADTH_PERCENTAGE, value:value[I++].value };
						
					} else {
						
						// TODO: recognize "calc()", too
						
					}
					
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
					if(value_backup[I_backup].value.length != 2) { 
						console.error("INVALID DECLARATION: grid-template-rows/columns: "+value_backup.toCSSString()+" (invalid number of arguments to the minmax function)");
						buggy = true;
						return;
					}
					
					// here's the first one:
					value = value_backup[I_backup].value[0].value.filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
					var data = parseTrackBreadthToken.call(this);
					currentTrackBreadth.minType = data.type;
					currentTrackBreadth.minValue = data.value;
					
					// here's the second one:
					value = value_backup[I_backup].value[1].value.filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
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
				
				trackBreadths.push(currentTrackBreadth);
				currentTrackBreadth = new GridTrackBreadth();
				
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
		
		buildExplicitMatrix: function() {
			
			// reset
			this.resetLinesToSpecified();
			this.rcMatrix = [];
			
			// simple autogrow
			this.ensureRows(this.ySizes.length);
			this.ensureColumns(this.xSizes.length);
			
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
			
			// add rows as necessary
			while(this.ySizes.length<yEnd) {
				this.ySizes.push(this.defaultYSize);
			}
			while(this.rcMatrix.length<yEnd) {
				this.rcMatrix.push([]);
			}
			
		},
		
		ensureColumns: function(xEnd) {
			
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
				
				throw new Error("NOT IMPLEMENTED: grid-auto-flow: column");
				
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
						
						// correct impossible situations
						if(xEnd <= xStart) { xEnd = xStart+1; }
						if(yEnd <= yStart) { yEnd = yStart+1; }
						
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
					
					// if the element has a specified row associated to it, but is not positionned yet
					if(item.specifiedYStart.type == LOCATE_LINE && (item.yStart==-1)) {
						
						// find the start position (y axis)
						var yStart = this.findYStart(item);
						
						// find the end position (y axis)
						var yEnd = this.findYEnd(item);
						
						// correct impossible situations
						if(yEnd <= yStart) { yEnd = yStart+1; }
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1;
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
				
				// TODO: mirror case
				throw new Error("NOT IMPLEMENTED: grid-auto-flow: column");

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
				while(index >= this.xLines.length) {
					this.yLines.push(['*']);
					this.ySizes.push(this.defaultYSize);
				}
			}
			
			// reset the lines to the specified ones if necessary
			this.resetLinesToSpecified(); // TODO: why?
			
			// check if an item is explicitely positionned outside the explicit grid, and expand it if needed
			for(var i = this.items.length; i--;) {
				
				var item = this.items[i];
				
				// CONSIDER: items already positionned
				if(item.xEnd > 0) { growX.call(this,item.xEnd); }
				if(item.yEnd > 0) { growY.call(this,item.yEnd); }
				
				// CONSIDER: elements with a known location
				
				// (x axis):
				if(item.specifiedXEnd.type == LOCATE_LINE) { 
					
					var xEnd = this.findXEnd(item);
					growX.call(this,xEnd);
					
				} else if (item.specifiedXStart.type == LOCATE_LINE) {
					
					var xStart = this.findXStart(item);
					var xEnd = this.findXEnd(item);
					growX.call(this,xEnd);
					
				}
				
				// (y axis):
				if(item.specifiedYEnd.type == LOCATE_LINE) { 
					
					var yEnd = this.findYEnd(item);
					growY.call(this,yEnd);
					
				} else if (item.specifiedYStart.type == LOCATE_LINE) {
					
					var yStart = this.findYStart(item);
					var yEnd = this.findYEnd(item);
					growY.call(this,yEnd);
					
				}
				
				// CONSIDER: known spans
				// // NOTE: I don't support "grid-row/column-start: span X";
				if(item.specifiedXEnd.type == LOCATE_SPAN && item.specifiedXEnd.name===undefined) {
					growX.call(this,item.specifiedXEnd.index);
				}
				if(item.specifiedYEnd.type == LOCATE_SPAN && item.specifiedYEnd.name===undefined) {
					growX.call(this,item.specifiedYEnd.index);
				}
				
			}
			
			// grow the grid matrix:
			while(this.ySizes.length>this.rcMatrix.length) {
				this.rcMatrix.push([]);
			}
			for(var r=this.rcMatrix.length; r--;) {
				this.rcMatrix[r].length = this.xSizes.length;
			}
			
		},
		
		performLayout: function() {
			
			// process non-automatic items
			this.buildImplicitMatrix();

			// position the remaining grid items. 
			var cursor = { x: 0, y: 0 };

			//For each grid item that hasn’t been positioned by the previous steps, in order-modified document order:
			for(var i=0; i<this.items.length; i++) {
				var item = this.items[i]; if(item.xEnd!=-1 && item.yEnd!=-1) { continue; }
				
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

					// 2. Increment the auto-placement cursor’s row position until a value is found where the grid item does not overlap any occupied grid cells (creating new rows in the implicit grid as necessary).
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
							spanX = 1;
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
					
					// Increment the auto-placement cursor’s row/column position (creating new rows in the implicit grid as necessary)
					var nextStep = function() {
						cursor.x++; if(cursor.x+spanX>this.rcMatrix[0].length) { cursor.y++; this.ensureRows(cursor.y + spanY); cursor.x=0; }
						return true;
					}

					// 1. Increment the column position of the auto-placement cursor until this item’s grid area does not overlap any occupied grid cells
					IncrementalPositionAttempts: while(true) {
						
						// make room for the currently attempted position
						this.ensureRows(cursor.y+spanY);
						
						// check the non-overlap condition
						for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
							for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
								
								// if the cell is occupied
								if(this.rcMatrix[y][x]) {
								
									// move to the next row/column
									nextStep.call(this); continue IncrementalPositionAttempts;
									
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
			
			this.computeAbsoluteTrackBreadths();

			
			
		},
		
		computeAbsoluteTrackBreadths: function() {
		
			///////////////////////////////////////////////////////////
			// hide child elements, to get free width/height
			///////////////////////////////////////////////////////////
			var backup = {
				border: enforceStyle(this.element, "border", "none"),
				padding: enforceStyle(this.element, "padding", "0px"),
				items: this.items.map(function(item) { return enforceStyle(item.element, "display", "none"); })
			}
			
			///////////////////////////////////////////////////////////
			// hide child elements, to get free width/height
			///////////////////////////////////////////////////////////
			var LIMIT_IS_INFINITE = 1;		
			var infinity = 9999999.0;
			var fullWidth = this.element.offsetWidth;
			var fullHeight = this.element.offsetHeight;
			
			///////////////////////////////////////////////////////////
			// show child elements again
			///////////////////////////////////////////////////////////
			restoreStyle(this.element, backup.border);
			restoreStyle(this.element, backup.padding); var items = this.items;
			backup.items.forEach(function(backup, i) { if(backup) restoreStyle(items[i].element, backup); });
			
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
					
					// For flexible track sizes, use the track’s initial base size as its initial growth limit.  
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
							// set it to the track’s base size plus the calculated increase
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
					
					// If the track has a ‘min-content’ min track sizing function
					if(specifiedSizes[x].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items’ min-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMinWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a ‘max-content’ min track sizing function
					else if(specifiedSizes[x].minType == TRACK_BREADTH_MAX_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items’ max-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMaxWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a ‘min-content’ max track sizing function
					if(specifiedSizes[x].maxType == TRACK_BREADTH_MIN_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items’ min-content contributions. 
							if(xSizes[x].limit == infinity) { xSizes[x].limit = getMinWidthOf(item); }
							else { xSizes[x].limit = Math.max(xSizes[x].limit, getMinWidthOf(item)); }
							
							if(!dontCountMaxItems) { items_done++; }
							
						}
						
					} 
					
					// If the track has a ‘max-content’ max track sizing function
					else if(specifiedSizes[x].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items’ max-content contributions. 
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
								if(spaceToDistribute<=0) {
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
										// If space remains after all tracks are frozen, unfreeze and continue to distribute space to… 
										
										// - when handling ‘min-content’ base sizes: 
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
										
										// - when handling ‘max-content’ base sizes: 
										else if(target=='max-content') {
											
											// any affected track that happens to also have a ‘max-content’ max track sizing function;
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
						// 1. For intrinsic minimums: First increase the base size of tracks with a min track sizing function of ‘min-content’ or ‘max-content’ by distributing extra space as needed to account for these items' min-content contributions. 
						//
						distributeFreeSpace(getMinWidthOf(item), 'base', 'min-content');
						updateInfiniteLimitFlag();
						
						
						//
						// 2. For max-content minimums: Next continue to increase the base size of tracks with a min track sizing function of ‘max-content’ by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'base', 'max-content');
						updateInfiniteLimitFlag();
						
						//
						// 3. For intrinsic maximums: Third increase the growth limit of tracks with a max track sizing function of ‘min-content’ or ‘max-content’ by distributing extra space as needed to account for these items' min-content contributions. 
						// Mark any tracks whose growth limit changed from infinite to finite in this step as infinitely growable for the next step. 
						// (aka do not update infinity flag)
						//
						distributeFreeSpace(getMinWidthOf(item), 'limit', 'min-content');
						
						//
						// 4. For max-content maximums: Lastly continue to increase the growth limit of tracks with a max track sizing function of ‘max-content’ by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'limit', 'max-content');
						updateInfiniteLimitFlag();
						
						items_done++;
						
					}
				}

			}
			
			var computeTrackBreadthIncrease = function(xSizes, specifiedSizes, fullSize) {
				
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
					var spaceToDistribute = fullSize;
					for(var cx = xSizes.length; cx--;) {
						spaceToDistribute -= xSizes[cx].base;
					}
					
					// check that there is some space to distribute
					if(spaceToDistribute <= 0) { return; }
					
					// Distribute space up to growth limits
					var tracks = rows_and_limits = rows_and_limits.filter(function(b) { return ((b.minIsMinContent||b.minIsMaxContent) && b.base<b.limit); }, 0);
					var trackAmount = tracks.length; if(trackAmount <= 0) { return; }
					distributeEquallyAmongTracks(xSizes, 'base', tracks, spaceToDistribute, /*enforceLimit:*/true);
					
				}
			}
			
			var computeFlexibleTrackBreadth = function(xSizes, specifiedSizes, fullSize) {
				
				// TODO:
				// If the free space is an indefinite length: The used flex fraction is the maximum of: • Each flexible track’s base size divided by its flex factor. 
				// •The result of finding the size of an fr for each grid item that crosses a flexible track, using all the grid tracks that the item crosses and a space to fill of the item’s max-content contribution. 
				
				var spaceToDistribute = fullSize;
				var tracks = []; var fractionSum = 0;
				for(var x = xSizes.length; x--;) {
					if(specifiedSizes[x].maxType == TRACK_BREADTH_FRACTION) {
						tracks.push(x); fractionSum += specifiedSizes[x].maxValue;
					} else {
						spaceToDistribute -= (xSizes[x].breadth = xSizes[x].base);
					}
				}

				
				while(tracks.length>0) {
					// Let the hypothetical flex fraction be the leftover space divided by the sum of the flex factors of the flexible tracks.
					var currentFraction = spaceToDistribute / fractionSum; var restart = false;
					for(var i = tracks.length; i--;) { var x = tracks[i];
						
						var trackSize = currentFraction * specifiedSizes[x].maxValue;
						
						// If the product of the hypothetical flex fraction and a flexible track’s flex factor is less than the track’s base size:
						if(xSizes[x].base > trackSize) {
							
							// mark as non-flexible
							xSizes[x].breadth = xSizes[x].base;
							
							// remove from computation
							fractionSum -= specifiedSizes[x].maxValue;
							tracks.splice(i,1);
							
							// restart
							restart=true;
							
						} else { 
						
							// set its base size to that product.
							xSizes[x].breadth = trackSize;
							
						}
						
					}
					
					if(!restart) { tracks.length = 0; }
					
				}
				
			}
			
			///////////////////////////////////////////////////////////
			// compute breadth of columns
			///////////////////////////////////////////////////////////
			var mode = 'x';
			var fullSize = fullWidth;
			var xSizes = this.xSizes.map(initializeFromConstraints);
			
			// compute base and limit
			computeTrackBreadth.call(
				this,
				xSizes,
				this.xSizes,
				function(item) { return item.minWidth; },
				function(item) { return item.maxWidth; },
				function(item) { return item.xStart; },
				function(item) { return item.xEnd; }
			);
			
			// ResolveContentBasedTrackSizingFunctions (step 4)
			for(var x = this.xSizes.length; x--;) {
				if(xSizes[x].limit == infinity) { xSizes[x].limit = xSizes[x].base; }
			}
			
			// grow tracks up to their max
			computeTrackBreadthIncrease.call(
				this,
				xSizes,
				this.xSizes,
				fullWidth
			);
			
			// handle flexible things
			computeFlexibleTrackBreadth.call(
				this,
				xSizes,
				this.xSizes,
				fullWidth
			);
			
			///////////////////////////////////////////////////////////
			// position each element absolutely, and set width to compute height
			///////////////////////////////////////////////////////////
			var backup = {
				position: enforceStyle(this.element, "position", ["relative","absolute","fixed"]),
				items: this.items.map(function(item) {
					
					// firstly, compute the breadth of all tracks
					var totalBreadth = 0;
					for(var cx = item.xStart; cx<item.xEnd; cx++) {
						totalBreadth += xSizes[cx].base;
					}
					
					// secondly, adapt to the alignment properties
					//TODO: alignment
					
					// finally, set the style
					return {
						position: enforceStyle(item.element, "position", "absolute"),
						width: enforceStyle(item.element, "width", totalBreadth+'px')
					};
						
				})
			}
			
			///////////////////////////////////////////////////////////
			// compute breadth of columns
			///////////////////////////////////////////////////////////
			var mode = 'y';
			var fullSize = fullHeight;
			var ySizes = this.ySizes.map(initializeFromConstraints);
			
			computeTrackBreadth.call(
				this,
				ySizes,
				this.ySizes,
				function(item) { return item.element.offsetHeight; },
				function(item) { return item.element.offsetHeight; },
				function(item) { return item.yStart; },
				function(item) { return item.yEnd; }
			);
			
			// ResolveContentBasedTrackSizingFunctions (step 4)
			for(var y = this.ySizes.length; y--;) {
				if(ySizes[y].limit == infinity) { ySizes[y].limit = ySizes[y].base; }
			}
			
			// grow tracks up to their max
			computeTrackBreadthIncrease.call(
				this,
				ySizes,
				this.ySizes,
				0 // TODO: ...
			);
			
			// handle flexible things
			computeFlexibleTrackBreadth.call(
				this,
				ySizes,
				this.ySizes,
				0 // TODO: ...
			);
						
			///////////////////////////////////////////////////////////
			// release the override style of elements
			///////////////////////////////////////////////////////////
			restoreStyle(this.element, backup.position); var items = this.items;
			backup.items.forEach(function(backup, i) { if(backup) restoreStyle(items[i].element, backup.position); });
			backup.items.forEach(function(backup, i) { if(backup) restoreStyle(items[i].element, backup.width); });
			
			///////////////////////////////////////////////////////////
			// save the results
			////
			this.finalXSizes = xSizes;
			this.finalYSizes = ySizes;
			
			///////////////////////////////////////////////////////////
			// log the results
			///////////////////////////////////////////////////////////
			console.log({
				x: xSizes,
				y: ySizes,
			});
		
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
		
			var xSizes = this.finalXSizes;
			var ySizes = this.finalYSizes;
			
			var width = 0;
			for(var x = 0; x<xSizes.length; x++) {
				width += xSizes[x].breadth;
			}
			
			var height = 0;
			for(var y = 0; y<ySizes.length; y++) {
				height += ySizes[y].breadth;
			}
			
			enforceStyle(this.element, "display", "block");
			enforceStyle(this.element, "position", ["relative","absolute","fixed"]);
			
			var s = usedStyleOf(this.element);
			if(["absolute","fixed"].indexOf(s.getPropertyValue("position")) >= 0) { enforceStyle(this.element, "width", width+'px'); }
			if(["auto","0px"].indexOf(s.getPropertyValue("height")) >= 0) { enforceStyle(this.element, "height", height+'px'); }

			
			for(var i=this.items.length; i--;) { var item = this.items[i]; 
				
				item.element.style.setProperty("position", "absolute");
				
				var left = 0;
				for(var x = 0; x<item.xStart; x++) {
					left += xSizes[x].breadth;
				}
				
				var width = 0;
				for(var x = item.xStart; x<item.xEnd; x++) {
					width += xSizes[x].breadth;
				}
				
				var top = 0;
				for(var y = 0; y<item.yStart; y++) {
					top += ySizes[y].breadth;
				}
				
				var height = 0;
				for(var y = item.yStart; y<item.yEnd; y++) {
					height += ySizes[y].breadth;
				}
					
				item.element.style.setProperty("top" , top +'px');
				item.element.style.setProperty("left", left+'px');
				// TODO: if(width >= item.minWidth || usedStyleOf(item.element)) 
				// TODO: same for height
				item.element.style.setProperty("width" , width +'px');
				item.element.style.setProperty("height", height+'px');
				
			}
			
		},
		
		findXStart: function(item) {
			
			var xStart = -1;
			if(item.specifiedXStart.type !== LOCATE_LINE) return -1;
			
			if(item.specifiedXStart.name) {
				
				//
				// <interger>? <custom-ident>
				//
				
				if(item.specifiedXStart.index === undefined) {
					
					// First attempts to match the grid area’s edge to a named grid area
					xStart = this.findXLine(item.specifiedXStart.name+"-start", 0, 0);
					
				}
				if(xStart==-1) {
				
					// Otherwise, if there is a named line with the specified name, contributes the first such line to the grid item’s placement. 
					xStart = this.findXLine(item.specifiedXStart.name, 0, (item.specifiedXStart.index||1)-1);
					
					// If no line with that name exists, it instead specifies the first grid line
					if(xStart==-1) { xStart = 0; } 
					
				}
				
			} else {
				
				//
				// <integer>
				//
				xStart = (item.specifiedXStart.index||1)-1;
				
			}
			
			return item.xStart = xStart;
		},
		
		findYStart: function(item) {
			
			var yStart = -1;
			if(item.specifiedYStart.type !== LOCATE_LINE) return -1;

			if(item.specifiedYStart.name) {
				
				//
				// <interger>? <custom-ident>
				//
				
				if(item.specifiedYStart.index === undefined) {
					
					// First attempts to match the grid area’s edge to a named grid area
					xStart = this.findYLine(item.specifiedYStart.name+"-start", 0, 0);
					
				}
				if(yStart == -1) {
					
					// Otherwise, if there is a named line with the specified name, contributes the first such line to the grid item’s placement. 
					yStart = this.findYLine(item.specifiedYStart.name, 0,(item.specifiedYStart.index||1)-1);
					
					// If no line with that name exists, it instead specifies the first grid line
					if(yStart==-1) { yStart = 0; } 
					
				}
				
			} else {
				
				//
				// <integer>
				//
				yStart = (item.specifiedYStart.index||1)-1;
				
			}
			
			return item.yStart = yStart;
		},
		
		findXEnd: function(item) {
			
			var xEnd = -1;
			var xStart = item.xStart;
			switch(item.specifiedXEnd.type) {
				
				case LOCATE_LINE:
					if(item.specifiedXEnd.name) {
						if(item.specifiedXEnd.index === undefined) {
							
							// First attempts to match the grid area’s edge to a named grid area
							xEnd = this.findXLine(item.specifiedXEnd.name+"-end", 0, 0);
							
						}
						if(xEnd == -1) {
							
							// Otherwise, if there is a named line with the specified name, contributes the first such line to the grid item’s placement. 
							xEnd = this.findXLine(item.specifiedXEnd.name, 0, (item.specifiedXEnd.index||1)-1);
							
							// If no line with that name exists, it instead specifies the first grid line
							if(xEnd==-1) { xEnd = 0; } 
							
						}
					} else {
						xEnd = (item.specifiedXEnd.index||1)-1;
					}
					break;
					
				case LOCATE_SPAN:
					if(item.specifiedXEnd.name) {
					
						// Set the corresponding edge N lines apart from its opposite edge. 
						xEnd = this.findXLine(item.specifiedXEnd.name, xStart+1, (item.specifiedXEnd.index||1)-1);
						
						// TODO: I'm having the wrong behavior here, I sent a mail to csswg to get the spec changed
						// "The spec is more what you'd call 'guidelines' than actual rules"
						if(xEnd==-1) { xEnd = 0; }
						
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
							
							// First attempts to match the grid area’s edge to a named grid area
							yEnd = this.findYLine(item.specifiedYEnd.name+"-end", 0, 0);
							
						}
						if(yEnd == -1) {
							
							// Otherwise, if there is a named line with the specified name, contributes the first such line to the grid item’s placement. 
							yEnd = this.findYLine(item.specifiedYEnd.name, 0, (item.specifiedYEnd.index||1)-1);
							
							// If no line with that name exists, it instead specifies the first grid line
							if(yEnd==-1) { yEnd = 0; } 
							
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
			
			return item.yEnd = yEnd;

		},
		
		findXLine: function(name, startIndex, skipCount) {
		
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
				if(this.xLines[i].indexOf(name)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}

			//If not enough lines of that name exist, it specifies the last such named line; or the first, if the <integer> is negative			
			return last;
			
		},
		
		findYLine: function(name, startIndex, skipCount) {

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
				if(this.yLines[i].indexOf(name)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}
			
			//If not enough lines of that name exist, it specifies the last such named line; or the first, if the <integer> is negative			
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