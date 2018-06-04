// TODO: document the "no_auto_css_grid" flag?
// TOOD: document the "no_ms_grid_implementation" flag?

!(function() { "use strict";

	var cssGrid = require('lib/grid-layout');
	console.log("css-grid-polyfill");

	var layoutProperties = ['display','position','box-sizing','margin-left','margin-right','margin-top','margin-bottom','padding-left','padding-right','padding-top','padding-bottom','border-left-width','border-right-width','border-top-width','border-bottom-width'];
	registerLayout('grid', class GridLayout {
		
		//
		// [0] define css properties
		//
		static get inputProperties() {
			return ['--grid','--grid-template','--grid-template-rows','--grid-template-columns','--grid-template-areas','--grid-areas','--grid-auto-flow',...layoutProperties];
		}
		static get childInputProperties() {
			return ['--grid-area','--grid-row','--grid-column','--grid-row-start','--grid-row-end','--grid-column-start','--grid-column-end','order',...layoutProperties]
		}

		*intrinsicSizes() { /* ... */ }

		*layout(children, edges, constraints, styleMap) {

			//
			// Initialize the grid layout
			//

			var grid = new cssGrid.GridLayout({ 
				styleMap:styleMap, 
				children:children,
				fixedInlineSize:constraints.fixedInlineSize, 
				fixedBlockSize:constraints.fixedBlockSize
			});

			//
			// Get data from parent
			// 
			
			var parentGridData = constraints.data ? constraints.data.parentGridData : null;

			//
			// Prepare the grid layout
			//

			yield* grid.updateFromElement(parentGridData);

			//
			// Perform the grid layout
			// 

			yield* grid.performLayout();

			//
			// Return the layout results
			//
			
			var dataForParentGrid = null;
			if(parentGridData && (grid.isSubgridX||grid.isSubgridY)) {
				// prepare the items for copy, because @bfgeek isn't a merciful god
				let grid_items = grid.items.map(item => Object.assign({}, item, { element:undefined, parentGrid:undefined, fragment:{blockSize:item.fragment.blockSize} }));
				dataForParentGrid = {
					items: grid_items,
					xSizes: grid.xSizes,
					ySizes: grid.ySizes
				};
			}

			console.log({
				autoBlockSize: grid.gridHeight + grid.vtPadding + grid.vbPadding, 
				childFragments: grid.items.map(item => item.fragment).filter(fragment => fragment instanceof LayoutFragment),
				data: { dataForParentGrid }
			});

			return {
				autoBlockSize: grid.gridHeight + grid.vtPadding + grid.vbPadding, 
				childFragments: grid.items.map(item => item.fragment).filter(fragment => fragment instanceof LayoutFragment),
				data: { dataForParentGrid }
			};

		}

	});

})()