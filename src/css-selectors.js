/////////////////////////////////////////////////////////////////
////                                                         ////
////                 prerequirements of qSL                  ////
////                                                         ////
/////////////////////////////////////////////////////////////////
////                                                         ////
////   Please note that I require querySelectorAll to work   ////
////                                                         ////
////   See http://github.com/termi/CSS_selector_engine/      ////
////   for a polyfill for older browsers                     ////
////                                                         ////
/////////////////////////////////////////////////////////////////

// global todos:
// - wrap this into a module
// - look for a few optimizations ideas in gecko/webkit
// - use arrays in myCompositeEventStream to avoid nested debouncings
"use strict";

///
/// event stream implementation
/// please note this is required to 'live update' the qSA requests
///
function myEventStream(connect, disconnect, reconnect) {
    var self=this;
    
    // validate arguments
    if(!disconnect) disconnect=function(){};
    if(!reconnect) reconnect=connect;
    
    // high-level states
    var isConnected=false;
    var isDisconnected=false;
    var shouldDisconnect=false;
    
    // global variables
    var callback=null;
    var yieldEvent = function() {
        
        // call the callback function, and pend disposal
        shouldDisconnect=true;
        try { callback && callback(self); } catch(ex) { setImmediate(function() { throw ex; }); }
        
        // if no action was taken, dispose
        if(shouldDisconnect) { dispose(); }
        
    }
    
    // export the interface
    var schedule = this.schedule = function(newCallback) {
    
        // do not allow to schedule on disconnected event streams
        if(isDisconnected) { throw new Error("Cannot schedule on a disconnected event stream"); }
        
        // do not allow to schedule on already scheduled event streams
        if(isConnected && !shouldDisconnect) { throw new Error("Cannot schedule on an already-scheduled event stream"); }
        
        // schedule the new callback
        callback=newCallback; shouldDisconnect=false;
        
        // reconnect to the stream
        if(isConnected) {
            reconnect(yieldEvent);
        } else {
            connect(yieldEvent);
            isConnected=true;
        }
    }
    
    var dispose = this.dispose = function() {
    
        // do not allow to dispose non-connected streams
        if(isConnected) {
        
            // disconnect & save resources
            disconnect(); 
            self=null; yieldEvent=null; callback=null; 
            isConnected=false; isDisconnected=true; shouldDisconnect=false;
            
        }
    }
}

///
/// call a function every frame
///
function myAnimationFrameEventStream(options) {
    
    // flag that says whether the observer is still needed or not
    var rid = 0;
        
    // start the event stream
    myEventStream.call(
        this, 
        function connect(yieldEvent) { rid = requestAnimationFrame(yieldEvent); },
        function disconnect() { cancelAnimationFrame(rid); }
    );
    
}

///
/// call a function every timeout
///
function myTimeoutEventStream(options) {
    
    // flag that says whether the observer is still needed or not
    var rid = 0; var timeout=(typeof(options)=="number") ? (+options) : ("timeout" in options ? +options.timeout : 333);
        
    // start the event stream
    myEventStream.call(
        this, 
        function connect(yieldEvent) { rid = setTimeout(yieldEvent, timeout); },
        function disconnect() { clearTimeout(rid); }
    );
    
}

///
/// call a function every time the mouse moves
///
function myMouseEventStream() {
    var self=this; var pointermove = (("PointerEvent" in window) ? "pointermove" : (("MSPointerEvent" in window) ? "MSPointerMove" : "mousemove"));

    // flag that says whether the event is still observered or not
    var scheduled = false; var interval=0;
    
    // handle the synchronous nature of mutation events
    var yieldEvent=null;
    var yieldEventDelayed = function() {
        if(scheduled) return;
        window.removeEventListener(pointermove, yieldEventDelayed, true);
        scheduled = requestAnimationFrame(yieldEvent);
    }
    
    // start the event stream
    myEventStream.call(
        this, 
        function connect(newYieldEvent) {
            yieldEvent=newYieldEvent;
            window.addEventListener(pointermove, yieldEventDelayed, true);
        },
        function disconnect() { 
            window.removeEventListener(pointermove, yieldEventDelayed, true);
            cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
        },
        function reconnect(newYieldEvent) { 
            yieldEvent=newYieldEvent; scheduled=false;
            window.addEventListener(pointermove, yieldEventDelayed, true);
        }
    );
    
}

///
/// call a function every time the mouse is clicked/unclicked
///
function myMouseButtonEventStream() {
    var self=this; 
    var pointerup = (("PointerEvent" in window) ? "pointerup" : (("MSPointerEvent" in window) ? "MSPointerUp" : "mouseup"));
    var pointerdown = (("PointerEvent" in window) ? "pointerdown" : (("MSPointerEvent" in window) ? "MSPointerDown" : "mousedown"));

    // flag that says whether the event is still observered or not
    var scheduled = false; var interval=0;
    
    // handle the synchronous nature of mutation events
    var yieldEvent=null;
    var yieldEventDelayed = function() {
        if(scheduled) return;
        window.removeEventListener(pointerup, yieldEventDelayed, true);
        window.removeEventListener(pointerdown, yieldEventDelayed, true);
        scheduled = requestAnimationFrame(yieldEvent);
    }
    
    // start the event stream
    myEventStream.call(
        this, 
        function connect(newYieldEvent) {
            yieldEvent=newYieldEvent;
            window.addEventListener(pointerup, yieldEventDelayed, true);
            window.addEventListener(pointerdown, yieldEventDelayed, true);
        },
        function disconnect() { 
            window.removeEventListener(pointerup, yieldEventDelayed, true);
            window.removeEventListener(pointerdown, yieldEventDelayed, true);
            cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
        },
        function reconnect(newYieldEvent) { 
            yieldEvent=newYieldEvent; scheduled=false;
            window.addEventListener(pointerup, yieldEventDelayed, true);
            window.addEventListener(pointerdown, yieldEventDelayed, true);
        }
    );
    
}

///
/// call a function whenever the DOM is modified
///
var myDOMUpdateEventStream;
if("MutationObserver" in window) {
    myDOMUpdateEventStream = function myDOMUpdateEventStream(options) {
         
        // configuration of the observer
        if(options) {
            var target = "target" in options ? options.target : document.documentElement;
            var config = { 
                subtree: "subtree" in options ? !!options.subtree : true, 
                attributes: "attributes" in options ? !!options.attributes : true, 
                childList: "childList" in options ? !!options.childList : true, 
                characterData: "characterData" in options ? !!options.characterData : false
            };
        } else {
            var target = document.documentElement;
            var config = { 
                subtree: true, 
                attributes: true, 
                childList: true, 
                characterData: false
            };
        }
                            
        // start the event stream
        var observer = null;
        myEventStream.call(
            this, 
            function connect(yieldEvent) { if(config) { observer=new MutationObserver(yieldEvent); observer.observe(target,config); target=null; config=null; } },
            function disconnect() { observer && observer.disconnect(); observer=null; },
            function reconnect() { observer.takeRecords(); }
        );

    }
} else if("MutationEvent" in window) {
    myDOMUpdateEventStream = function myDOMUpdateEventStream(options) {
        var self=this;

        // flag that says whether the event is still observered or not
        var scheduled = false;
        
        // configuration of the observer
        if(options) {
            var target = "target" in options ? options.target : document.documentElement;
        } else {
            var target = document.documentElement;
        }
        
        // handle the synchronous nature of mutation events
        var yieldEvent=null;
        var yieldEventDelayed = function() {
            if(scheduled || !yieldEventDelayed) return;
            document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
            document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
            target.removeEventListener("DOMSubtreeModified", yieldEventDelayed, false);
            scheduled = requestAnimationFrame(yieldEvent);
        }
        
        // start the event stream
        myEventStream.call(
            this, 
            function connect(newYieldEvent) {
                yieldEvent=newYieldEvent;
                document.addEventListener("DOMContentLoaded", yieldEventDelayed, false);
                target.addEventListener("DOMSubtreeModified", yieldEventDelayed, false);
            },
            function disconnect() { 
                document.removeEventListener("DOMContentLoaded", yieldEventDelayed, false);
                target.removeEventListener("DOMSubtreeModified", yieldEventDelayed, false);
                cancelAnimationFrame(scheduled); yieldEventDelayed=null; yieldEvent=null; scheduled=false;
            },
            function reconnect(newYieldEvent) { 
                yieldEvent=newYieldEvent; scheduled=false;
                target.addEventListener("DOMSubtreeModified", yieldEventDelayed, false);
            }
        );
        
    }
} else {
    myDOMUpdateEventStream = myAnimationFrameEventStream;
}

///
/// call a function every time the focus shifts
///
function myFocusEventStream() {
    var self=this;
    
    // handle the filtering nature of focus events
    var yieldEvent=null; var previousActiveElement=null; var previousHasFocus=false; var rid=0;
    var yieldEventDelayed = function() {
        
        // if the focus didn't change
        if(previousActiveElement==document.activeElement && previousHasFocus==document.hasFocus()) {
            
            // then do not generate an event
            setTimeout(yieldEventDelayed, 333); // focus that didn't move is expected to stay
            
        } else {
            
            // else, generate one & save config
            previousActiveElement=document.activeElement;
            previousHasFocus=document.hasFocus();
            yieldEvent();
            
        }
    }
    
    // start the event stream
    myEventStream.call(
        this, 
        function connect(newYieldEvent) {
            yieldEvent=newYieldEvent;
            rid=setTimeout(yieldEventDelayed, 500); // let the document load
        },
        function disconnect() { 
            clearTimeout(rid); yieldEventDelayed=null; yieldEvent=null; rid=0;
        },
        function reconnect(newYieldEvent) { 
            yieldEvent=newYieldEvent;
            rid=setTimeout(yieldEventDelayed, 100); // focus by tab navigation moves fast
        }
    );
    
}

///
/// composite event stream
/// because sometimes you need more than one event source
///
function myCompositeEventStream(stream1, stream2) {
    var self=this;
    
    // fields
    var yieldEvent=null; var s1=false, s2=false;
    var yieldEventWrapper=function(s) { 
        if(s==stream1) s1=true;
        if(s==stream2) s2=true;
        if(s1&&s2) return;
        yieldEvent(self);
    }
    
    // start the event stream
    myEventStream.call(
        this, 
        function connect(newYieldEvent) {
            yieldEvent=newYieldEvent;
            stream1.schedule(yieldEventWrapper);
            stream2.schedule(yieldEventWrapper);
        },
        function disconnect() { 
            stream1.dispose();
            stream2.dispose();
        },
        function reconnect(newYieldEvent) { 
            yieldEvent=newYieldEvent;
            s1 && stream1.schedule(yieldEventWrapper);
            s2 && stream2.schedule(yieldEventWrapper);
            s1 = s2 = false;
        }
    );
}


/////////////////////////////////////////////////////////////////
////                                                         ////
////                  implementation of qSL                  ////
////                                                         ////
/////////////////////////////////////////////////////////////////

///
/// the live querySelectorAll implementation
///
window.myQuerySelectorLive = function(selector, handler, root) {
    
    // restrict the selector coverage to some part of the DOM only
    var root = root || document;
    
    // TODO: make use of "mutatedAncestorElement" to update only elements inside the mutated zone
    
    var currentElms = [];
    var loop = function loop(eventStream) {
        
        // schedule next run
        eventStream.schedule(loop);
        
        // update elements matching the selector
        var newElms = [];
        var oldElms = currentElms.slice(0);
        var temps = root.querySelectorAll(selector);
        for(var i=newElms.length=temps.length; i;) { newElms.push(temps[--i]); }
        currentElms = newElms.slice(0); temps=null;
        
        // first let's clear all elements that have been removed from the document
        oldElms = oldElms.filter(function(e) {
            
            // check whether the current element is still there
            var isStillInDocument = (
                e===document.documentElement 
                || document.documentElement.contains(e)
            );
            
            if(isStillInDocument) {
                
                // NEED_COMPARE: we will compare this element to the new list
                return true;
                
            } else {
                
                // DELETE: raise onremoved, pop old elements
                try { handler.onremoved && handler.onremoved(e); } catch(ex) { setImmediate(function() {throw ex})}
                return false;
                
            }
            
        });
        
        // now pop and match until both lists are exhausted
        // (we use the fact the returned elements are in document order)
        var el1 = oldElms.pop();
        var el2 = newElms.pop();
        while(el1 || el2) {
            if(el1===el2) {
            
                // MATCH: pop both elements
                el1 = oldElms.pop();
                el2 = newElms.pop();
                
            } else if (el2 && /*el1 is after el2*/(!el1||(el2.compareDocumentPosition(el1) & (1|2|8|32))===0)) {
                
                // INSERT: raise onadded, pop new elements
                try { handler.onadded && handler.onadded(el2); } catch(ex) { setImmediate(function() {throw ex})}
                el2 = newElms.pop();
                
            } else {
            
                // DELETE: raise onremoved, pop old elements
                try { handler.onremoved && handler.onremoved(el1); } catch(ex) { setImmediate(function() {throw ex})}
                el1 = oldElms.pop();
                
            }
        }
        
    };
    
    // use the event stream that best matches our needs
    var simpleSelector = selector.replace(/:(dir|lang|root|empty|blank|nth-child|nth-last-child|first-child|last-child|only-child|nth-of-type|nth-last-of-child|fist-of-type|last-of-type|only-of-type|not|matches|default)\b/gi,'')
    var eventStream; if(simpleSelector.indexOf(':') == -1) {
        
        // static stuff only
        eventStream = new myDOMUpdateEventStream(root); 
        
    } else {
        
        // dynamic stuff too
        eventStream = new myDOMUpdateEventStream(root); 
        if(myDOMUpdateEventStream != myAnimationFrameEventStream) {
        
            // detect the presence of focus-related pseudo-classes
            var reg = /:(focus|active)\b/gi;
            if(reg.test(simpleSelector)) {
                
                // mouse events should be listened
                eventStream = new myCompositeEventStream(
                    new myFocusEventStream(),
                    eventStream
                );
                
                // simplify simpleSelector
                var reg = /:(focus)\b/gi;
                simpleSelector = simpleSelector.replace(reg, ''); // :active has other hooks
                
            }
            
            // detect the presence of mouse-button-related pseudo-classes
            var reg = /:(active)\b/gi;
            if(reg.test(simpleSelector)) {
                
                // mouse events should be listened
                eventStream = new myCompositeEventStream(
                    new myMouseButtonEventStream(),
                    eventStream
                );
                
                // simplify simpleSelector
                simpleSelector = simpleSelector.replace(reg, '');
                
            }

            // detect the presence of user input pseudo-classes
            var reg = /:(target|checked|indeterminate|valid|invalid|in-range|out-of-range|user-error)\b/gi;
            if(reg.test(simpleSelector)) {
                
                // slowly dynamic stuff do happen
                eventStream = new myCompositeEventStream(
                    new myTimeoutEventStream(250),
                    eventStream
                );
                
                // simplify simpleSelector
                simpleSelector = simpleSelector.replace(reg, '');

                var reg = /:(any-link|link|visited|local-link|enabled|disabled|read-only|read-write|required|optional)\b/gi;
                // simplify simpleSelector
                simpleSelector = simpleSelector.replace(reg, '');
                
            }
            
            // detect the presence of nearly-static pseudo-classes
            var reg = /:(any-link|link|visited|local-link|enabled|disabled|read-only|read-write|required|optional)\b/gi;
            if(reg.test(simpleSelector)) {
                
                // nearly static stuff do happen
                eventStream = new myCompositeEventStream(
                    new myTimeoutEventStream(333),
                    eventStream
                );
                
                // simplify simpleSelector
                simpleSelector = simpleSelector.replace(reg, '');
                
            }
            
            // detect the presence of mouse-related pseudo-classes
            var reg = /:(hover)\b/gi;
            if(reg.test(simpleSelector)) {
                
                // mouse events should be listened
                eventStream = new myCompositeEventStream(
                    new myMouseEventStream(),
                    eventStream
                );
                
                // simplify simpleSelector
                simpleSelector = simpleSelector.replace(reg, '');
                
            }
            
            // detect the presence of unknown pseudo-classes
            if(simpleSelector.indexOf(':') !== -1) {
                
                // other stuff do happen, too (let's give up on events)
                eventStream = new myAnimationFrameEventStream(); 
                
            }
            
        }
        
    }
    
    // start handling changes
    loop(eventStream);
    
}    

/////////////////////////////////////////////////////////////////
////                                                         ////
////        here's some other stuff I may user later         ////
////                                                         ////
/////////////////////////////////////////////////////////////////

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