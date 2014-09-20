// TODO: document the "no_auto_css_grid" flag?
// TOOD: document the "no_ms_grid_implementation" flag?

!(function(window, document) { "use strict";

	require('dom-window-console');
	var cssCascade = require('css-cascade');
	var cssGrid = require('css-grid-model');

	function enablePolyfill() {

		//
		// [0] define css properties
		// those properties can now be set using Element.myStyle.xyz if they weren't already
		//
		
		var gridProperties = ['grid','grid-template','grid-template-rows','grid-template-columns','grid-template-areas','grid-areas'];
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
					
						// watch DOM for updates in the element?
						// whact resize events for relayout?
						// watch the load event for relayout?
					
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

	if(!("no_auto_css_grid" in window)) { enablePolyfill(); }
	
})(window, document);