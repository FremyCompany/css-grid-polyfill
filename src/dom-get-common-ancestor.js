module.exports = (function(window) { "use strict"; 
	
	///
	/// get the common ancestor from a list of nodes
	///
	function getCommonAncestor(nodes) {

		// validate arguments
		if (!nodes || !nodes.length) { return null; }
		if (nodes.length < 2) { return nodes[0]; }

		// start bubbling from the first node
		var currentNode = nodes[0];
		
		// while we still have a candidate ancestor
		bubbling: while(currentNode && currentNode.nodeType!=9) {
			
			// walk all other intial nodes
			var i = nodes.length;    
			while (--i) {
				
				// if the curent node doesn't contain any of those nodes
				if (!currentNode.contains(nodes[i])) {
					
					// consider the parent node instead
					currentNode = currentNode.parentNode;
					continue bubbling;
					
				}
				
			}
			
			// if all were contained in the current node:
			// we found the solution
			return currentNode;
		}

		return null;
	}
	
	return getCommonAncestor;

})(window);