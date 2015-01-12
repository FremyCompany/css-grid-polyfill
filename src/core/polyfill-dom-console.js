!(function(window, document) { "use strict";

	//
	// some code for console polyfilling
	//
	if(!window.console) {
			
		window.console = {
			backlog: '',
			
			log: function(x) { this.backlog+=x+'\n'; if(window.debug) alert(x); },
			
			dir: function(x) { try { 
				
				var elm = function(e) {
					if(e.innerHTML) {
						return {
							tagName: e.tagName,
							className: e.className,
							id: e.id,
							innerHTML: e.innerHTML.substr(0,100)
						}
					} else {
						return {
							nodeName: e.nodeName,
							nodeValue: e.nodeValue
						}
					}
				};
				
				var jsonify = function(o) {
					var seen=[];
					var jso=JSON.stringify(o, function(k,v){
						if (typeof v =='object') {
							if ( !seen.indexOf(v) ) { return '__cycle__'; }
							if ( v instanceof window.Node) { return elm(v); }
							seen.push(v);
						} return v;
					});
					return jso;
				};
				
				this.log(jsonify(x)); 
				
			} catch(ex) { this.log(x) } },
			
			warn: function(x) { this.log(x) },
			
			error: function(x) { this.log("ERROR:"); this.log(x); }
			
		};
		
		if(!window.onerror) {
			window.onerror = function() {
				console.log([].slice.call(arguments,0).join("\n"))
			};
		}
		
	}

	//
	// this special console is used as a proxy emulating the CSS console of browsers
	//
	window.cssConsole = {
		enabled: (!!window.debug), warnEnabled: (true),
		log: function(x) { if(this.enabled) console.log(x) },
		dir: function(x) { if(this.enabled) console.dir(x) },
		warn: function(x) { if(this.warnEnabled) console.warn(x) },
		error: function(x) { console.error(x); }
	}

})(window, document);