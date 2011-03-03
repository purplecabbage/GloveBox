/*
The MIT License

Copyright (c) 2010-2011 Jesse MacFadyen 
jesse.macfadyen@nitobi.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the 
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit 
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the 
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE 
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR 
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var GloveBox = (function(){
    
    var Gbx = function(elemOrId,opts) 
    {
        if ( this instanceof Gbx ) 
        {
        	if (typeof elemOrId == "string" || elemOrId instanceof String) 
        	{
        		this.element = document.getElementById(elemOrId);
        	}
        	else 
        	{
        		this.element = elemOrId;
        	}
    	
            this.par.addEventListener(Gbx.StartEvent, this, false);
            this.par.addEventListener('click', this, true);
            
            this.element.addEventListener("webkitTransitionEnd", this, true );
            this.element.style.webkitTransformOrigin = "0% 0%";
        
            for(var v in opts)
        	{
        	    this[v] = opts[v];
        	}
   	
        } 
        else
        {
            return new Gbx(elemOrId);
        }
    }

    // set defaults for mouse
    Gbx.StartEvent = "mousedown";
    Gbx.EndEvent = "mouseup";
    Gbx.MoveEvent = "mousemove";
    Gbx.CancelEvent = "touchcancel"; 
    // This used to be mouseout, but we still want to track once the mouse leave, so we leave it to touchcancel
    // even though it will not be fired 

    Gbx.DraggingTransition =   "-webkit-transform none";
    Gbx.AfterTouchTransition = "-webkit-transform 400ms ease-out";
    Gbx.BounceBackTransition = "-webkit-transform 200ms ease-out"; 
    Gbx.Friction = 0.002;
    

    try 
    { 
        document.createEvent("TouchEvent"); 
        Gbx.CanTouch = true; 
        // update events to use touch events, they are available
        Gbx.StartEvent = "touchstart";
        Gbx.EndEvent = "touchend";
        Gbx.MoveEvent = "touchmove";
        Gbx.CancelEvent = "touchcancel";
    } 
    catch (e) //look for exception to feature-detection touch events.
    { 
        Gbx.CanTouch = false; 
    }

    Gbx.prototype = 
    {
        formElements:null,
        state:"ready",

        //Scaling stuff
        _scalable:false,
        isScaling:false,
        startScale:1.0,
        _scale:1.0,
        maxScale:4.0,
        minScale:0.2,  
        _scaleCenter:{x:0,y:0}, 
    
        // Rotation stuff ( buggy )
    
        _rotation:0,
        canRotate:false,
        startAngle:0,
        _angle:0,
    
        isDragging:false,
        _x:0,_y:0,
    
        startTime:0,
    
        // snapping to coords ex. {x:20,y:20}
        snap:null,
    
        clampX:false,clampY:false,
    
        lastX:0,lastY:0,
    
        scrollX:false,scrollY:true,
    
        _dragT:null,
        _afterT:null,
        _bounceT:null,
        _dragThreshold:20,
        
        par:function(){ return this.element.parentNode;},
    
        get_x:function(){ return this._x; },  
    	set_x:function(inX){ this.setPos(inX,this._y);},
	
    	get_y:function(){ return this._y;},
    	set_y:function(inY){ this.setPos(this._x,inY);},
	
    	get_scale:function(){return this._scale;},
    	set_scale:function(inS)
    	{
    		this._scale = Math.max(Math.min(inS,this.maxScale),this.minScale);
    		this._updateTransform();
    	},
	
    	// Transition to display while the user is dragging
    	get_dragTrans:function(){
    		return this._dragT ? this._dragT : Gbx.DraggingTransition;
    	},
    	set_dragTrans:function(t){
    		this._dragT = t;
    	},
	
    	// Transition to display when the user releases
    	get_afterTrans:function(){
    		return this._afterT ? this._afterT : Gbx.AfterTouchTransition;
    	},
    	set_afterTrans:function(t){
    		this._afterT = t;
    	},
	
    	// Transition to display when we enforce the boundaries
    	get_bounceTrans:function(){
    		return this._bounceT ? this._bounceT : Gbx.BounceBackTransition;
    	},
    	set_bounceTrans:function(t){
    		this._bounceT = t;
    	},
	
    	get_canScale:function(){return this._scalable;},
    	set_canScale:function(b)
    	{
    		this._scalable = (b === true);
    		if(this._scalable)
    		{
    			this.par.addEventListener("gesturestart", this,true);
    		}
    		else
    		{
    			this.par.removeEventListener("gesturestart", this,true);
    		}
    	},
    	
    	getContentSize:function()
    	{
    	    return {"y":this.element.scrollHeight * this.scale,
    	            "x":this.element.scrollWidth * this.scale};
    	},
	
    	handleEvent:function(evt) 
        {
            if(typeof this[evt.type] === "function")
            {
                return this[evt.type](evt);
            }
            else
            {
                console.log("event handler is not a function :: " + evt.type);
            }
        },
    
        setPos:function(x,y)
        {
        	this._x = (this.scrollX ? x : this._x);
        	this._y = (this.scrollY ? y : this._y);
        	this._updateTransform();
        },
    
        scrollToBottom:function()
        {	
        	var minY = this.par.offsetHeight - this.par.scrollHeight;
        	this.setPos(this._x,minY);
        },
    
        _updateTransform:function()
        {
        	var transformTemplate = "translate3d(XXXpx,YYYpx,ZZZpx) scale3D(SCALE,SCALE,1.0)";
        	var wkTrans = transformTemplate.replace(/XXX/, this._x);
        		wkTrans = wkTrans.replace(/YYY/,this._y);
        		wkTrans = wkTrans.replace(/ZZZ/,0); // future use?
        		wkTrans = wkTrans.replace(/SCALE/g,this.scale);
        	this.element.style.webkitTransform =  wkTrans;
        },
    
        addTouchListeners:function()
        {
        	var evtNames = [Gbx.EndEvent,Gbx.MoveEvent,Gbx.CancelEvent ];

        	for(var n in evtNames)
        	{
        		window.addEventListener(evtNames[n], this, false);
        	}
        },
    
        removeTouchListeners:function()
        {
            var evtNames = [Gbx.EndEvent,Gbx.MoveEvent,Gbx.CancelEvent ];
        	for(var n in evtNames)
        	{
        		window.removeEventListener(evtNames[n], this, false);
        	}
        },
    
        disableInputs:function()
        {
        	var src = document;
        	if("getElementsByTagName" in this.par)
        	{
        		src = this.par;
        	}
        	this.formElements = [];
        	var tags = ["select","input","textarea"];
        	for(var s in tags)
        	{
        		var elems = src.getElementsByTagName(tags[s]);
        		if (elems) 
        		{
        			for(var n = 0, len = elems.length; n < len; n++)
        			{
        				var elem = elems[n];
        				if(!elem.disabled)
        				{
        					elem.disabled = true;
        					this.formElements.push(elem);
        				}
        			}
        		}
        	}
        },
    
        reenableInputs:function()
        {
        	if(this.formElements)
        	{
        		for(var n = 0, len = this.formElements.length; n < len; n++)
        		{
        			this.formElements[n].disabled = false;
        		}
        		this.formElements = null; 
        	}
        },
    
        click:function(e)
        {
            console.log("click :: " + this.isDragging);
        	if(this.isDragging)
        	{
        		e.preventDefault();
        		e.stopPropagation();
        	}
        },
    
        getClampedX:function(x)
        {
        	if(!this.clampX)
        		return x;

        	var parentNode = this.par;
        	// get updated x position

            var pWidth = parentNode.clientWidth;

            var selfWidth = this.element.scrollWidth * this.scale;

        	var maxX =  0;
            var minX =  ( ( parentNode.offsetWidth - this.element.scrollWidth ) * this.scale);
            var newLeft = x;

        	if(newLeft > maxX)
        	{
        		newLeft = maxX;
        		this.xVel = 0;
        	}
        	else if(newLeft < minX)
        	{
        		newLeft = minX;
        		this.xVel = 0;
        	}

        	return newLeft;
        },
    
        getClampedY:function(y)
        {
        	if(!this.clampY)
        		return y;

        	var parentNode = this.par;
        	// get updated y position

            var selfHeight = this.element.scrollHeight * this.scale;

        	var maxY =  0;
            var minY =  ((parentNode.offsetHeight - this.element.scrollHeight ) * this.scale);
            var newTop = y;

        	if(newTop > maxY)
        	{
        		newTop = maxY;
        		this.yVel = 0;
        	}
        	else if(newTop < minY)
        	{
        		newTop = minY;
        		this.yVel = 0;
        	}

        	return newTop;
        },
    
        // Transition Ended
        webkitTransitionEnd:function(e)
        {
            console.log("webkitTransitionEnd::" + this.state);
            // this is only really here in case we decide to support event broadcasting later
        	switch(this.state)
        	{
        		case "ready" :  // fallthrough is intentional
        		case "starting" :
        		case "moving" :
        		case "scaling" :
        		case "done":
        			break;
        		case "ending" :
        			this.finishScrolling();
        			break;
        	}
        },
    
        /* :: Mouse Events :: */
    
        mousedown:function(e)
        {   
            e.preventDefault(); // this prevents Chrome's drag action on images!
            this.isDragging = true;
            var touchEvent = {timeStamp:e.timeStamp};
                touchEvent.preventDefault = function(){e.preventDefault();};
                touchEvent.stopPropagation = function(){e.stopPropagation();};
                touchEvent.targetTouches = [{pageX:e.x,pageY:e.y}];
            return this.touchstart(touchEvent);
        },

        mousemove:function(e)
        {   
            if(this.isDragging)
            {
                var touchEvent = {timeStamp:e.timeStamp};
                    touchEvent.preventDefault = function(){e.preventDefault();};
                    touchEvent.stopPropagation = function(){e.stopPropagation();};
                    touchEvent.targetTouches = [{pageX:e.x,pageY:e.y}];
                return this.touchmove(touchEvent);
            }
            return false;
        },

        mouseup:function(e)
        {
            var touchEvent = {timeStamp:e.timeStamp};
                touchEvent.preventDefault = function(){e.preventDefault();};
                touchEvent.stopPropagation = function(){e.stopPropagation();};
            return this.touchend(touchEvent);
        },
    
        /* :: Touch Events :: */
    
        touchstart:function(e)
        {
        	// Start tracking
        	if (e.targetTouches.length != 1 || this.isScaling)
        	{
        		return false;
        	}
        	this.stopMomentum();
        	
        	this.state = "starting";
        	

        	e.stopPropagation();

        	this.startX = e.targetTouches[0].pageX;
        	this.startY = e.targetTouches[0].pageY;

        	this.lastX = this.startX;
        	this.lastY = this.startY;

        	this.xVel = 0;
        	this.yVel = 0;

        	this.startTime = e.timeStamp;

        	this.addTouchListeners();

        	return false;
        },


        touchmove:function(e)
        {
        	// Don't track motion when multiple touches are down in this element (that's a gesture)
        	if(!e.targetTouches || e.targetTouches.length != 1 || this.isScaling)
        	{
        		return false;
        	}

        	var currentX = e.targetTouches[0].pageX;
        	var currentY = e.targetTouches[0].pageY;
        	
        	// TODO: this should allow velocity to be added
        	// instead of always moving it to where the finger is now,
        	// we could move it to where it was + ( velocity * elapsed )
        	// currently speed is NOT used while we are scrolling, and recalculated
        	// once we let go

            if(this.formElements == null)
            {
                this.disableInputs();
            }

        	this.state = "moving";

        	// Prevent the browser from doing its default thing (scroll, zoom)
        	e.preventDefault();

        	var dX = (currentX - this.lastX);
        	var dY = (currentY - this.lastY);

        	if(!this.isDragging)
        	{
        		if( Math.abs(dX) > this._dragThreshold || Math.abs(dY) > this._dragThreshold )
        		{
        			this.isDragging = true;
        			// use a tighter animation during dragging [ or NONE! ]
        			this.element.style.webkitTransition = this.dragTrans;
        		}
        	}
        	// it may have been changed by the statement above
        	if(this.isDragging)
        	{
        		var newX = this.x;
        		var newY = this.y;

        		if(this.scrollX)
        		{
        			newX = this.getClampedX(this.x + dX); 
        		}

        		if(this.scrollY)
        		{
        			newY = this.getClampedY(this.y + dY); 
        		}

        		this.setPos(newX,newY);

        		this.lastX = currentX;
        		this.lastY = currentY;
        	}
        },


        touchend:function(e)
        {
        	if (this.isDragging) 
        	{
        		var self = this;
        		// reenable inputs after a short wait
        		setTimeout(function(){ self.reenableInputs(); }, 1500);

        		// Prevent the browser from doing its default thing (scroll, zoom)
        		this.removeTouchListeners();

        		this.state = "ending";
        		var elapsed = e.timeStamp - this.startTime;

        		if(this.scrollY)
        		{
        		    var dY = this.lastY - this.startY;
        		    this.yVel = dY / elapsed;
        		    if( Math.abs(this.yVel) < 0.5 )
        		    {
        		        this.yVel = 0;
        		    }
        		}
        		
        		if(this.scrollX)
        		{
        		    var dX = this.lastX - this.startX;
        		    this.xVel = dX / elapsed;
                    if(Math.abs(this.xVel) < 0.5)
                    {
                        this.xVel = 0;
                    }
        		}

        		// if we are not really moving, we can skip the extra logic of momentum
        		if (Math.abs(this.xVel) + Math.abs(this.yVel) < 0.5) 
        		{
        			// can we get out early?
        			this.finishScrolling();
        		}
        		else 
        		{
        			this.doMomentum();
        		}
        	}
        	return false;
        },

        touchcancel:function(e)
        {
            this.touchend(e);
        },
        
        /* :: Momentum ::  aka Fauxmentum :: */
        
        isDecelerating:function()
        {
            return this.state == "ending";
        },

        doMomentum:function() 
        {
            // calculate the vector velocity, using both xVelocity and yVelocity
            // this velocity value is a normalized vector, it is always positive
            var velocity = Math.sqrt( this.xVel * this.xVel + this.yVel * this.yVel);
            
            // how long until we are stopped completely
            var time =  Math.floor( velocity / Gbx.Friction );
            // delta Distance = velocity * time OR px * ms / ms
            var dY = this.yVel * time;
            var dX = this.xVel * time;
            
            // Now do bounds checking
            var pHeight = this.par.clientHeight;
            var selfHeight = this.element.scrollHeight * this.scale;
            
            var maxY = 0;
    		var minY = pHeight - selfHeight;
    		var newTop = Math.min(Math.max(this.y + dY,minY),maxY);
    		
    		var pWidth = this.par.clientWidth;
            var selfWidth = this.element.scrollWidth * this.scale;
            
    		var maxX = 0;
    		var minX = pWidth - selfWidth;
    		var newLeft = Math.min(Math.max(this.x + dX,minX),maxX);
     
            this.element.style.webkitTransition = '-webkit-transform ' + time + 'ms cubic-bezier(0, 0, 0.44, 1)';
            this.setPos(newLeft,newTop);

        },

        stopMomentum:function() 
        {
          if (this.isDecelerating()) 
          {
            // Get the computed style object.
            var style = document.defaultView.getComputedStyle(this.element, null);
            // Computed the transform in a matrix object given the style.
            var transform = new WebKitCSSMatrix(style.webkitTransform);
            // Clear the active transition so it doesn’t apply to our next transform.
            this.element.style.webkitTransition = "none";
            // Set the element transform to where it is right now.
            this.setPos(transform.m41,transform.m42);
          }
        },
    
        /* :: Gestures - still a work in progress  aka Jestures -jm :: */
    
        addGestureListeners:function()
        {
            var f = this.par.addEventListener;
        	f('gesturechange', this, true);
            f('gestureend', this, true);
        },

        removeGestureListeners:function()
        {
            var f = this.par.removeEventListener;
        	f('gesturechange', this, true);
            f('gestureend', this, true);
        },

        gesturestart:function(e)
        {
        	this.addGestureListeners();
        	this.isDragging = false;
        	this.isScaling = true;
        	this.startScale = this._scale;
        	this.startAngle = this._angle;
        	this.element.style.webkitTransition = this.dragTrans;
        	return false;
        },

        gesturechange:function(e)
        {
        	this.isScaling = true;
        	this.scale = this.startScale * e.scale;
        	return false;
        },

        gestureend:function(e)
        {
        	this.removeGestureListeners();
        	this.isScaling = false;
        	this.finishScrolling();
        	return false;
        },
    
        finishScrolling:function()
        {
            console.log("finishScrolling");
        	this.state = "done";
        	this.element.style.webkitTransition = this.bounceTrans;
        	this.isDragging = false;

        	var parentNode = this.par;
        	// get updated x position

            var pWidth = parentNode.clientWidth;
            var selfWidth = this.element.scrollWidth * this.scale;

        	var maxX = 0;
        	var minX = 0;
        	var newLeft = 0;

        	if (pWidth > selfWidth) 
        	{
        		maxX = pWidth - selfWidth;
        		minX = 0;
        		newLeft = (pWidth - selfWidth)/2;
        	}
        	else
        	{
        		maxX = 0;
        		minX = pWidth - selfWidth;
        		newLeft = Math.min(Math.max(this.x,minX),maxX);
        	}

        	// get updated y

            var pHeight = parentNode.clientHeight;
            var selfHeight = this.element.scrollHeight * this.scale;

        	var minY = 0;
        	var maxY = 0;
        	var newTop = 0;

        	if(pHeight > selfHeight)
        	{
        		minY = 0;
        		maxY = pHeight - selfHeight;
        		newTop = (pHeight - selfHeight)/2;
        	}
        	else
        	{
        		maxY = 0;
        		minY = pHeight - selfHeight;
        		newTop = Math.min(Math.max(this.y,minY),maxY);
        	}

        	if(this.snap != null)
        	{
        		newLeft = this.snap.x ? Math.round(newLeft / this.snap.x ) * this.snap.x : newLeft;
        		newTop = this.snap.y ? Math.round(newTop / this.snap.y ) * this.snap.y : newTop;
        	}

        	this.setPos(newLeft,newTop);
        }
    };

    // Utility function for allowing obj.x to call an accessor function pointing to obj.get_x()
    function makeAccessors(obj,props)
    {
        function makeAccessor(prop)
        {
            Object.defineProperty(obj, prop, { get : obj["get_" + prop], set : obj["set_" + prop] } );
        }
        props.forEach(makeAccessor);
    }
    // turn gb.x into a call to gb.get_x() which in turn uses gb._x
    makeAccessors(Gbx.prototype,[ "x", "y", "scale", "dragTrans", "afterTrans", "bounceTrans", "canScale" ]);
    Object.defineProperty(Gbx.prototype, "par", { get :function(){return this.element.parentNode;}});
  return Gbx;
  
})();

