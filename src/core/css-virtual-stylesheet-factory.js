module.exports = (function(window, document) { "use strict";
	
	var VSS_COUNT = 0;
	function VirtualStylesheetFactory() {
		var This = this || Object.create(VirtualStylesheet.prototype);
		
		// create the style sheet
		var styleElement = document.createElement('style');
		styleElement.id = "virtual-stylesheet-" + (VSS_COUNT++);
		styleElement.setAttribute('data-no-css-polyfill', 'true');
		styleElement.appendChild(document.createTextNode(''));
		document.querySelector(':root > head').appendChild(styleElement);
		
		// grab its stylesheet object
		var ss = styleElement.sheet;
		if(!ss.cssRules) ss.cssRules = ss.rules;
		ss.removeRule = ss.removeRule || function(i) {
			return ss.deleteRule(i);
		}
		ss.addRule = ss.addRule || function(s,d,i) {
			var rule = s+'{'+d+'}'
			var index = typeof(i)=='number' ? i : ss.cssRules.length;
			return ss.insertRule(rule, index);
		}
		
		// create the mapping table
		var rules = [];
		
		// add the factory
		
		This.stylesheets = Object.create(null);
		This.createStyleSheet = function(name) {
			return This.stylesheets[name] || (This.stylesheets[name] = new VirtualStylesheet(this, name));
		}
		
		// add the methods
		
		This.addRule = function(selector, declarations, stylesheet, enabled) {
			
			// convert selector & declarations to a non-empty string
			selector = '' + selector + ' ';
			declarations = '' + declarations + ' ';
			
			// add the rule to the known rules
			rules.push({ stylesheet: stylesheet, selector: selector, declarations: declarations, enabled: enabled });
			
			// add the rule to the enabled stylesheet, if needed
			if(enabled) {
				ss.addRule(selector, declarations);
			}
			
		}
		
		This.disableAllRules = function(stylesheet) {
			var ssIndex = ss.cssRules.length;
			for(var i = rules.length; i--;) { var rule = rules[i];
				if(rule.enabled) {
					ssIndex--;
					if(rule.stylesheet == stylesheet) {
						ss.removeRule(ssIndex);
						rule.enabled = false;
					}
				}
			}
		}
		
		This.enableAllRules = function(stylesheet) {
			var ssIndex = 0;
			for(var i = 0; i<rules.length; i++) { var rule = rules[i];
				if(rule.enabled) {
					ssIndex++;
				} else {
					if(rule.stylesheet == stylesheet) {
						ss.addRule(rule.selector, rule.declarations, ssIndex);
						rule.enabled = true;
						ssIndex++;
					}
				}
			}
		}
		
		This.deleteAllRules = function(stylesheet) {
			var ssIndex = ss.cssRules.length;
			for(var i = rules.length; i--;) { var rule = rules[i];
				if(rule.enabled) {
					ssIndex--;
					if(rule.stylesheet == stylesheet) {
						ss.removeRule(ssIndex);
						rules.splice(i, 1);
					}
				}
			}
		}
		
	}
	
	function VirtualStylesheet(factory, name) {
		this.factory = factory;
		this.name = name;
		this.enabled = true;
	}
	
	VirtualStylesheet.prototype.addRule = function(selector, declarations) {
		this.factory.addRule(selector, declarations, this.name, this.enabled);
	}
	
	VirtualStylesheet.prototype.set = function(element, properties) {
		
		// give an id to the element
		if(!element.id) { element.id = element.uniqueID; }
	
		// compute the css rule to add
		var selector = "#"+element.id;
		var rule = ""; for(var property in properties) {
			if(properties.hasOwnProperty(property)) {
				rule += property + ": " + properties[property] + " !important; ";
			}
		}
		
		// and then add it
		this.addRule(selector, rule);
		
	}
	
	VirtualStylesheet.prototype.enable = function() {
		this.factory.enableAllRules(this.name); this.enabled=true;
	}
	
	VirtualStylesheet.prototype.disable = function() {
		this.factory.disableAllRules(this.name); this.enabled=false;
	}
	
	VirtualStylesheet.prototype.clear = function() {
		this.factory.deleteAllRules(this.name);
	}
	
	VirtualStylesheet.prototype.revoke = function() {
		this.clear();
	}
	
	VirtualStylesheetFactory.VirtualStylesheet = VirtualStylesheet;
	VirtualStylesheetFactory.VirtualStylesheetFactory = VirtualStylesheetFactory;
	return VirtualStylesheetFactory;
	
})(window, document)