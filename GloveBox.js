/*
The MIT License

Copyright (c) 2010 Jesse MacFadyen 
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

/*
	
Changelog::
	
July 9, 2010 - jm
	- PinchZoom support added.
	- Customizable transitions.
	- disables form elements while scrolling
	- does not fire click events on elements if _dragThreshold has been exceeded

July 13, 2010 -jm
	- added check for createTouch in document ( mouse handlers are experimental only )
	- listeners are added using delegate self, instead of closure function
	- allows nested gloveboxes
	- does not interfere with other touch events in the DOM 
        - commented out debug doc writing

August 4th, 2010 -fm
	- fixed on android 2.2 (no createTouch function in document, check with 'TouchEvent' on window instead).

:: Scaling is exceptionally buggy, use at your own risk|peril - jm

Sept 20, 2010 -jm
    - cleaned up scaling code, still does not scale from correct point, but positioning after is correct.
    - moved touchEvents/mouseEvents to static vars
    - accepts constructor arg of string-id or dom element
    - added clamping ( buggy, not ready for primetime )
    - added snapping, to specify pixel grid to snap to, can be used for paging ( no events yet )
    - mouse events are still fuct
    - added GloveBox.CanTouch, incorporated fil maj's changes for android touch checking
  
Oct 14, 2010 -jm
    - merged wildabeast's bug fix :: afterTrans setter was actually setting dragTrans  

Feb 16, 2011 -jm
    - major rewrite + restruct
    - api remains the same, but implementation has been updated, code is more concise
    
    

*/

var GloveBox = function(elemOrId,opts) 
{
    if ( this instanceof GloveBox ) 
    {
    	if (typeof elemOrId == "string" || elemOrId instanceof String) 
    	{
    		this.element = document.getElementById(elemOrId);
    	}
    	else 
    	{
    		this.element = elemOrId;
    	}
    	
        var par = this.element.parentNode;
            par.addEventListener(GloveBox.StartEvent, this, false);
            par.addEventListener('click', this, true);
            
        this.element.addEventListener("webkitTransitionEnd", this, true );
        this.element.style.webkitTransformOrigin = "0% 0%";
        
        for(var v in opts)
    	{
    	    this[v] = opts[v];
    	}
   	
    } 
    else
    {
        return new GloveBox(elemOrId);
    }
}

// set defaults for mouse
GloveBox.StartEvent = "mousedown";
GloveBox.EndEvent = "mouseup";
GloveBox.MoveEvent = "mousemove";
GloveBox.CancelEvent = "mouseout";


GloveBox.DraggingTransition =   "-webkit-transform none";
GloveBox.AfterTouchTransition = "-webkit-transform 400ms ease";
GloveBox.BounceBackTransition = "-webkit-transform 300ms ease-out"; 

try 
{ 
    document.createEvent("TouchEvent"); 
    GloveBox.CanTouch = true; 
    // update events to use touch events, they are available
    GloveBox.StartEvent = "touchstart";
    GloveBox.EndEvent = "touchend";
    GloveBox.MoveEvent = "touchmove";
    GloveBox.CancelEvent = "touchcancel";
} 
catch (e) //look for exception to feature-detection touch events.
{ 
    GloveBox.CanTouch = false; 
}

GloveBox.prototype = 
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
		return this._dragT ? this._dragT : GloveBox.DraggingTransition;
	},
	set_dragTrans:function(t){
		this._dragT = t;
	},
	
	// Transition to display when the user releases
	get_afterTrans:function(){
		return this._afterT ? this._afterT : GloveBox.AfterTouchTransition;
	},
	set_afterTrans:function(t){
		this._afterT = t;
	},
	
	// Transition to display when we enforce the boundaries
	get_bounceTrans:function(){
		return this._bounceT ? this._bounceT : GloveBox.BounceBackTransition;
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
			this.element.parentNode.addEventListener("gesturestart", this,true);
		}
		else
		{
			this.element.parentNode.removeEventListener("gesturestart", this,true);
		}
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
    	var parentNode = this.element.parentNode;	
    	var minY = parentNode.offsetHeight - parentNode.scrollHeight;
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
    	var par = this.element.parentNode;
    	var evtNames = [GloveBox.EndEvent,GloveBox.MoveEvent,GloveBox.CancelEvent ];

    	for(var n in evtNames)
    	{
    		window.addEventListener(evtNames[n], this, false);
    	}
    },
    
    removeTouchListeners:function()
    {
        var evtNames = [GloveBox.EndEvent,GloveBox.MoveEvent,GloveBox.CancelEvent ];

    	for(var n in evtNames)
    	{
    		window.removeEventListener(evtNames[n], this, false);
    	}
    },
    
    disableInputs:function()
    {
    	var src = document;
    	if("getElementsByTagName" in this.element.parentNode)
    	{
    		src = this.element.parentNode;
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

    	var parentNode = this.element.parentNode;
    	// get updated x position

        var pWidth = parentNode.clientWidth;

        var selfWidth = this.element.scrollWidth * this.scale;

    	var maxX =  (selfWidth - pWidth );
        var minX =  ((parentNode.offsetWidth - parentNode.scrollWidth ) * this.scale);
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

    	var parentNode = this.element.parentNode;
    	// get updated y position

        var pHeight = parentNode.scrollHeight * this.scale;
        var selfHeight = this.element.scrollHeight * this.scale;

    	var maxY =  (selfHeight - pHeight );
        var minY =  ((parentNode.offsetHeight - parentNode.scrollHeight ) * this.scale);
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
        this.isDragging = true;
        var touchEvent = {timestamp:e.timestamp};
            touchEvent.preventDefault = function(){e.preventDefault();};
            touchEvent.stopPropagation = function(){e.stopPropagation();};
            touchEvent.targetTouches = [{pageX:e.x,pageY:e.y}];
        return this.touchstart(touchEvent);
    },

    mousemove:function(e)
    {   
        if(this.isDragging)
        {
            var touchEvent = {timestamp:e.timestamp};
                touchEvent.preventDefault = function(){e.preventDefault();};
                touchEvent.stopPropagation = function(){e.stopPropagation();};
                touchEvent.targetTouches = [{pageX:e.x,pageY:e.y}];
            return this.touchmove(touchEvent);
        }
        return false;
    },

    mouseup:function(e)
    {
        var touchEvent = {timestamp:e.timestamp};
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
    	    // poor-man's input filter 
    		this.xVel = (dX + this.xVel * 10 ) / 10;
    		this.yVel = (dY + this.yVel * 10 ) / 10;
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
    		setTimeout(function(){ self.reenableInputs(); }, 1500);

    		// Prevent the browser from doing its default thing (scroll, zoom)
    		this.removeTouchListeners();

    		this.state = "ending";
    		this.element.style.webkitTransition = this.afterTrans;

    		// if we are not really moving, we can skip the extra logic of momentum
    		if (Math.abs(this.xVel) + Math.abs(this.yVel) < 2) 
    		{
    			// can we get out early?
    			this.finishScrolling();
    		}
    		else 
    		{
    			// magic number 2 is a projection of how far we will throw the scroll content before
    			// snapping it back, this will take the length of the afterTrans, and is a poor-man's
    			// interpretation of momentum
    			var newLeft = Math.round(this.scrollX ? (this.x + (2 * this.xVel)) : this.x);
    			var newTop = Math.round(this.scrollY ? (this.y + (2 * this.yVel)) : this.y);

    			this.setPos(newLeft, newTop);
    		}
    	}
    	return false;
    },

    touchcancel:function(e)
    {
        this.touchend(e);
    },
    
    /* :: Gestures - still a work in progress  aka Jestures -jm :: */
    
    addGestureListeners:function()
    {
    	var par = this.element.parentNode;
    	par.addEventListener('gesturechange', this, true);
        par.addEventListener('gestureend', this, true);
    },

    removeGestureListeners:function()
    {
    	var par = this.element.parentNode;
    	par.removeEventListener('gesturechange', this, true);
        par.removeEventListener('gestureend', this, true);
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
    	this.state = "done";
    	this.element.style.webkitTransition = this.bounceTrans;
    	this.isDragging = false;

    	var parentNode = this.element.parentNode;
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
GloveBox.makeAccessors = function(obj,props)
{
	for(var n = 0; n < props.length; n++)
	{
	    var prop = props[n];
	    obj.__defineGetter__(prop,obj["get_" + prop]);
	    obj.__defineSetter__(prop,obj["set_" + prop]);
    }
}
// turn gb.x into a call to gb.get_x() which in turn uses gb._x
GloveBox.makeAccessors(GloveBox.prototype,[ "x", "y", "scale", "dragTrans", "afterTrans", "bounceTrans", "canScale" ]);

