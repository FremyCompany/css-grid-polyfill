"use strict";

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
		
		warn: function(x) { this.log(x) }
		
	};
	
	window.onerror = function() {
	    console.log([].slice.call(arguments,0).join("\n"))
	};
	
}

window.cssConsole = {
	enabled: (!!window.debug), warnEnabled: (true),
	log: function(x) { if(this.enabled) console.log(x) },
	dir: function(x) { if(this.enabled) console.dir(x) },
	warn: function(x) { if(this.warnEnabled) console.warn(x) },
}


//
// some other basic om code
//
var basicObjectModel = {
    
    //
    // the following functions are about event cloning
    //
    cloneMouseEvent: function cloneMouseEvent(e) {
        var evt = document.createEvent("MouseEvent");
        evt.initMouseEvent( 
            e.type, 
            e.canBubble||e.bubbles, 
            e.cancelable, 
            e.view, 
            e.detail, 
            e.screenX, 
            e.screenY, 
            e.clientX, 
            e.clientY, 
            e.ctrlKey, 
            e.altKey, 
            e.shiftKey, 
            e.metaKey, 
            e.button, 
            e.relatedTarget
        );
        return evt;
    },
    
    cloneKeyboardEvent: function cloneKeyboardEvent(e) {
        // TODO: this doesn't work cross-browswer...
        // see https://gist.github.com/termi/4654819/ for the huge code
        return basicObjectModel.cloneCustomEvent(e);
    },
    
    cloneCustomEvent: function cloneCustomEvent(e) {
        var ne = document.createEvent("CustomEvent");
        ne.initCustomEvent(e.type, e.canBubble||e.bubbles, e.cancelable, "detail" in e ? e.detail : e);
        for(var prop in e) {
            try {
                if(e[prop] != ne[prop] && e[prop] != e.target) {
                    try { ne[prop] = e[prop]; }
                    catch (ex) { Object.defineProperty(ne,prop,{get:function() { return e[prop]} }) }
                }
            } catch(ex) {}
        }
        return ne;
    },
    
    cloneEvent: function cloneEvent(e) {
        
        if(e instanceof MouseEvent) {
            return basicObjectModel.cloneMouseEvent(e);
        } else if(e instanceof KeyboardEvent) {
            return basicObjectModel.cloneKeyboardEvent(e);
        } else {
            return basicObjectModel.cloneCustomEvent(e);
        }
        
    },
    
    //
    // allows you to drop event support to any class easily
    //
    EventTarget: {
        implementsIn: function(eventClass, static_class) {
            
            if(!static_class && typeof(eventClass)=="function") eventClass=eventClass.prototype;
            
            eventClass.dispatchEvent = basicObjectModel.EventTarget.prototype.dispatchEvent;
            eventClass.addEventListener = basicObjectModel.EventTarget.prototype.addEventListener;
            eventClass.removeEventListener = basicObjectModel.EventTarget.prototype.removeEventListener;
            
        },
        prototype: {}
    }
    
};

basicObjectModel.EventTarget.prototype.addEventListener = function(eventType,f) {
    if(!this.eventListeners) this.eventListeners=[];
    
    var ls = (this.eventListeners[eventType] || (this.eventListeners[eventType]=[]));
    if(ls.indexOf(f)==-1) {
        ls.push(f);
    }
    
}

basicObjectModel.EventTarget.prototype.removeEventListener = function(eventType,f) {
    if(!this.eventListeners) this.eventListeners=[];

    var ls = (this.eventListeners[eventType] || (this.eventListeners[eventType]=[])), i;
    if((i=ls.indexOf(f))!==-1) {
        ls.splice(i,1);
    }
    
}

basicObjectModel.EventTarget.prototype.dispatchEvent = function(event_or_type) {
    if(!this.eventListeners) this.eventListeners=[];
    
    // abort quickly when no listener has been set up
    if(typeof(event_or_type) == "string") {
        if(!this.eventListeners[event_or_type] || this.eventListeners[event_or_type].length==0) {
            return;
        }
    } else {
        if(!this.eventListeners[event_or_type.type] || this.eventListeners[event_or_type.type].length==0) {
            return;
        }
    }
    
    // convert the event
    var event = event_or_type;
    function setUpPropertyForwarding(e,ee,key) {
        Object.defineProperty(ee,key,{
            get:function() {
                var v = e[key]; 
                if(typeof(v)=="function") {
                    return v.bind(e);
                } else {
                    return v;
                }
            },
            set:function(v) {
                e[key] = v;
            }
        });
    }
    function setUpTarget(e,v) {
        try { Object.defineProperty(e,"target",{get:function() {return v}}); }
        catch(ex) {}
        finally {
            
            if(e.target !== v) {
                
                var ee = Object.create(Object.getPrototypeOf(e));
                ee = setUpTarget(ee,v);
                for(key in e) {
                    if(key != "target") setUpPropertyForwarding(e,ee,key);
                }
                return ee;
                
            } else {
                
                return e;
                
            }
            
        }
    }
    
    // try to set the target
    if(typeof(event)=="object") {
        try { event=setUpTarget(event,this); } catch(ex) {}
        
    } else if(typeof(event)=="string") {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent(event_or_type, /*canBubble:*/ true, /*cancelable:*/ false, /*detail:*/this);
        try { event=setUpTarget(event,this); } catch(ex) {}
        
    } else {
        throw new Error("dispatchEvent expect an Event object or a string containing the event type");
    }
    
    // call all listeners
    var ls = (this.eventListeners[event.type] || (this.eventListeners[event.type]=[]));
    for(var i=ls.length; i--;) {
        try { 
            ls[i](event);
        } catch(ex) {
            setImmediate(function() { throw ex; });
        }
    }
    
    return event.isDefaultPrevented;
}