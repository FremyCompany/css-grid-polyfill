// TODO: document the "no_auto_css_grid" flag?
// TOOD: document the "no_ms_grid_implementation" flag?

!(function(window, document) { "use strict";

	require('core:polyfill-dom-console');
	var cssCascade = require('core:css-cascade');
	var cssGrid = require('lib/grid-layout');
	
	var enabled = false;
	var enablePolyfill = function() { if(enabled) { return; } else { enabled = true; }

		//
		// [0] define css properties
		// those properties can now be set using Element.myStyle.xyz if they weren't already
		//
		
		var gridProperties = ['grid','grid-template','grid-template-rows','grid-template-columns','grid-template-areas','grid-areas','grid-auto-flow'];
		var gridItemProperties = ['grid-area','grid-row','grid-column','grid-row-start','grid-row-end','grid-column-start','grid-column-end'];
		for(var i=gridProperties.length; i--;)     { cssCascade.polyfillStyleInterface(gridProperties[i]); }
		for(var i=gridItemProperties.length; i--;) { cssCascade.polyfillStyleInterface(gridItemProperties[i]); }
		
		// 
		// [1] when any update happens:
		// construct new content and region flow pairs
		// restart the region layout algorithm for the modified pairs
		// 
		
		cssCascade.startMonitoringProperties(
			gridProperties, 
			{
				onupdate: function onupdate(element, rule) {

					// log some message in the console for debug
					cssConsole.dir({message:"onupdate",element:element,selector:rule.selector.toCSSString(),rule:rule});
					
					// check if the element already has a grid or grid-item layout
					if(element.gridModel) {
					
						// the layout must be recomputed
						element.gridModel.scheduleRelayout();
						
					} else {
					
						// setup a new grid model, and schedule a relayout
						element.gridLayout = new cssGrid.GridLayout(element);
						element.gridLayout.scheduleRelayout();
					
						// TODO: watch DOM for updates in the element?
						// TODO: watch resize events for relayout?
						var lastWidth = element.offsetWidth;
						var lastHeight = element.offsetHeight;
						var updateOnResize = function() {
							if(lastWidth != element.offsetWidth || lastHeight != element.offsetHeight) {
								lastWidth = element.offsetWidth;
								lastHeight = element.offsetHeight;
								element.gridLayout.scheduleRelayout();
							}
							requestAnimationFrame(updateOnResize);
						}
						requestAnimationFrame(updateOnResize);
						// TODO: watch the load event for relayout?
						window.addEventListener('load', updateOnResize);
					
					}
					
				}
			}
		);
		
		cssCascade.startMonitoringProperties(
			gridItemProperties, 
			{
				onupdate: function onupdate(element, rule) {

					// log some message in the console for debug
					cssConsole.dir({message:"onupdate",element:element,selector:rule.selector.toCSSString(),rule:rule});
					
					// check if the element already has a grid or grid-item layout
					if(element.parentGridLayout) {
						
						// the parent layout must be recomputed
						element.parentGridLayout.scheduleRelayout();
						
					}
					
				}
			}
		);
		
	}

	// expose the enabler
	cssGrid.enablePolyfill = enablePolyfill;
	
	// enable the polyfill automatically
	try {
		if(!("no_auto_css_grid" in window)) { enablePolyfill(); }
	} catch (ex) {
		setImmediate(function() { throw ex; });
	}
	
	// return the module
	return cssGrid;
	
})(window, document);