// Based on https://github.com/remy/polyfills/blob/master/classList.js by Remy Sharp
// Licensed under the MIT License

!(function(window, document) {

	if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

	var prototype = Array.prototype,
		push = prototype.push,
		splice = prototype.splice,
		join = prototype.join,
		indexOf = prototype.indexOf;
	
	function DOMTokenList(parentElement) {
		
		// Initialize fields
		this.length = 0;
		this.nodeValue = '';
		this.parentElement = parentElement;
		
		// Initialize content
		LoadDOMTokenList(this);
		
	};
	
	function LoadDOMTokenList(list) {
		
		// Check if an update is necessary
		if(list.nodeValue != list.parentElement.className) {
			
			// Save the current value as handled
			list.nodeValue = list.parentElement.className;
			
			// Trim the className string and split it on whitespace to retrieve a list of classes.
			var classes = list.nodeValue.replace(/^\s+|\s+$/g, '').split(/\s+/);
			for (var i = 0; i < classes.length; i++) {
				push.call(list, classes[i]);
			}
			
		}
		
	}
	
	function SaveDOMTokenList(list) {
		list.parentElement.className = join.call(list, ' ');
		list.nodeValue = list.parentElement.className;
	}

	DOMTokenList.prototype = {
		contains: function(token) {
			LoadDOMTokenList(this);
			return indexOf.call(this, token) != -1;
		},
		item: function(index) {
			LoadDOMTokenList(this);
			return (index in this) ? this[index] : null;
		},
		add: function(token) {
			if (!this.contains(token)) {
				push.call(this, token);
				SaveDOMTokenList(this);
			}
		},
		remove: function(token) {
			if (this.contains(token)) {
				for (var i = this.length; i--;) {
					if (this[i] == token) break;
				}
				splice.call(this, i, 1);
				SaveDOMTokenList(this);
			}
		},
		toString: function() {
			return this.parentElement.className;
		},
		toggle: function(token) {
			return (this.contains(token) ? (this.remove(token),false) : (this.add(token),true));
		}
	};

	window.DOMTokenList = DOMTokenList;

	function defineElementGetter(obj, prop, getter) {
		if (Object.defineProperty) {
			Object.defineProperty(obj, prop, {
				get: getter
			});
		} else {
			obj.__defineGetter__(prop, getter);
		}
	}

	defineElementGetter(Element.prototype, 'classList', function() {
		var classList = new DOMTokenList(this);
		defineElementGetter(this, 'classList', function() { return classList; });
		return classList;
	});

})(window, document);