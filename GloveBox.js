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


*/

GloveBox.touchEvents = ["touchmove","touchend","touchcancel"];
GloveBox.mouseEvents = ["mousemove","mouseup","mouseout","mousewheel"];
GloveBox.DraggingTransition =   "-webkit-transform none";
GloveBox.AfterTouchTransition = "-webkit-transform 400ms ease";
GloveBox.BounceBackTransition = "-webkit-transform 300ms ease-out"; 
try { document.createEvent("TouchEvent"); GloveBox.CanTouch = true; } //look for exception to feature-detection touch events.
catch(e) { GloveBox.CanTouch = false; }
GloveBox.GetOffset = function (el) {
	// Thank you Stack Overflow http://stackoverflow.com/questions/442404/dynamically-retrieve-html-element-x-y-position-with-javascript
    var _x = 0;
    var _y = 0;
	var obj = {
		width: el.clientWidth,
		height: el.clientHeight
	};
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.parentNode;
    }
	obj.top = _y;
	obj.left = _x;
    return obj;
};

function GloveBox(elem)
{
	this.formElements = null;
	this.state = "ready";
	this._scalable = false;
	this.isScaling = false;
	
	this._rotation = 0;
	this.canRotate = true;
	
	this.startScale = this._scale = 1.0;
	this.startAngle = this._angle = 0;
	this.maxScale = 4.0;
	this.minScale = 0.1;
	
	this.isDragging = false;

	if (typeof elem == "string" || elem instanceof String) 
	{
		this.element = document.getElementById(elem);
	}
	else 
	{
		this.element = elem;
	}
	this._x = 0;
	this._y = 0;
	
	this.startTime = 0;
	
	this.snap = null;// assign this an {x:pageWidth,y:pageHeight} to get scrolling to page offsets
	
	this.lastX = 0;
	this.lastY = 0;
	
	this.clampX = false;
	this.clampY = false;
	
	this.xVel = 0;
	this.yVel = 0;
	
	this.scrollY = true;
	this.scrollX = false;
	
	this._dragT  = null;
	this._afterT  = null;
	this._bounceT = null;
	this._dragThreshold = 20;
	this._scaleCenter = {x:0,y:0};
	
	var par = this.element.parentNode,
		self = this;
	if(GloveBox.CanTouch)
	{
	    par.addEventListener('touchstart', this, false);
	}
	else
	{
	    par.addEventListener("mousedown",this,false);
	}
	par.addEventListener('click', this, true);
	// save parent coordinates for mouse events.
	this.parentCoords = GloveBox.GetOffset(par);
	window.addEventListener('resize', function() {
		self.parentCoords = GloveBox.GetOffset(par);
	}, false);
	
	this.element.addEventListener("webkitTransitionEnd", this, true );
	this.element.style.webkitTransformOrigin = "0% 0%";
}




GloveBox.prototype = 
{
	get x(){ return this._x; },
	set x(inX){ this.setPos(inX,this._y);},
	
	get y(){ return this._y;},
	set y(inY){ this.setPos(this._x,inY);},
	
	get scale(){return this._scale;},
	set scale(inS)
	{
		this._scale = Math.max(Math.min(inS,this.maxScale),this.minScale);
		this._updateTransform();
	},
	
	// Transition to display while the user is dragging
	get dragTrans(){
		return this._dragT ? this._dragT : GloveBox.DraggingTransition;
	},
	set dragTrans(t){
		this._dragT = t;
	},
	
	// Transition to display when the user releases
	get afterTrans(){
		return this._afterT ? this._afterT : GloveBox.AfterTouchTransition;
	},
	set afterTrans(t){
		this._afterT = t;
	},
	
	// Transition to display when we enforce the boundaries
	get bounceTrans(){
		return this._bounceT ? this._bounceT : GloveBox.BounceBackTransition;
	},
	set bounceTrans(t){
		this._bounceT = t;
	},
	
	get canScale(){return this._scalable;},
	set canScale(b)
	{
		this._scalable = (b == true);
		if(this._scalable)
		{
			this.element.parentNode.addEventListener("gesturestart", this,true);
		}
		else
		{
			this.element.parentNode.removeEventListener("gesturestart", this,true);
		}
	}
}

GloveBox.prototype.handleEvent = function(evt) 
{
    if(typeof this[evt.type] === "function")
    {
        return this[evt.type](evt);
    }
    else
    {
        console.log("event handler is not a function :: " + evt.type);
    }
}

GloveBox.prototype.setPos = function(x,y)
{
	this._x = (this.scrollX?x:this._x);
	this._y = (this.scrollY?y:this._y);
	this._updateTransform();
}

GloveBox.prototype.scrollToBottom = function()
{
	var parentNode = this.element.parentNode;	
	// get updated y
	var minY = parentNode.offsetHeight - parentNode.scrollHeight;
	this.setPos(this._x,minY);
}


GloveBox.prototype._updateTransform = function()
{
	var transformTemplate = "translate3d(XXXpx,YYYpx,ZZZpx) scale3D(SCALE,SCALE,1.0)";// rotate(DEGREESdeg)"; // Coming soon ?
	
	var wkTrans = transformTemplate.replace(/XXX/, this._x);
		wkTrans = wkTrans.replace(/YYY/,this._y);
		wkTrans = wkTrans.replace(/ZZZ/,0); // future use?
		wkTrans = wkTrans.replace(/SCALE/g,this.scale);
		//wkTrans = wkTrans.replace(/DEGREES/,this._rotation);
	
	this.element.style.webkitTransform =  wkTrans;
}



GloveBox.prototype.addTouchListeners = function()
{
	var par = this.element.parentNode;
	var evtNames = GloveBox.CanTouch ? GloveBox.touchEvents : GloveBox.mouseEvents;
	for(var n in evtNames)
	{
		par.addEventListener(evtNames[n], this, false);
	}
}

GloveBox.prototype.removeTouchListeners = function()
{
	var par = this.element.parentNode;
	var evtNames = GloveBox.CanTouch ? GloveBox.touchEvents : GloveBox.mouseEvents;
	for(var n in evtNames)
	{
		par.removeEventListener(evtNames[n], this, false);
	}
}

GloveBox.prototype.disableInputs = function()
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
}

GloveBox.prototype.reenableInputs = function()
{
	if(this.formElements)
	{
		for(var n = 0, len = this.formElements.length; n < len; n++)
		{
			this.formElements[n].disabled = false;
		}
		this.formElements = null; 
	}
}

GloveBox.prototype.click = function(e)
{
	if(this.isDragging)
	{
		e.preventDefault();
		e.stopPropagation();
	}
}

GloveBox.prototype.touchstart = function(e)
{
	// Start tracking when the first finger comes down in this element
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
}


GloveBox.prototype.touchmove = function(e)
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
}

GloveBox.prototype.getClampedX = function(x)
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
}

GloveBox.prototype.getClampedY = function(y)
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
}


GloveBox.prototype.touchend = function(e)
{
	if (this.isDragging) 
	{
		var self = this;
		setTimeout(function(){ self.reenableInputs(); }, 1500);
		// Prevent the browser from doing its default thing (scroll, zoom)
		this.removeTouchListeners();
		var closure = function()
		{
			e.preventDefault();
		};
		// pass on our mock event
		//this.touchmove({targetTouches:e.changedTouches,preventDefault:closure});
		
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
}

GloveBox.prototype.touchcancel = function(e)
{
    this.touchend(e);
}

GloveBox.prototype.finishScrolling = function()
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

GloveBox.prototype.webkitTransitionEnd = function(e)
{
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
}

/********************************************* Jestures? ************/

GloveBox.prototype.addGestureListeners = function()
{
	var par = this.element.parentNode;
	par.addEventListener('gesturechange', this, true);
    par.addEventListener('gestureend', this, true);
}

GloveBox.prototype.removeGestureListeners = function()
{
	var par = this.element.parentNode;
	par.removeEventListener('gesturechange', this, true);
    par.removeEventListener('gestureend', this, true);
}

GloveBox.prototype.gesturestart = function(e)
{
	this.addGestureListeners();
	this.isDragging = false;
	this.isScaling = true;
	this.startScale = this._scale;
	this.startAngle = this._angle;
	this.element.style.webkitTransition = this.dragTrans;
	return false;
}

GloveBox.prototype.gesturechange = function(e)
{

	this.isScaling = true;
	//this._rotation = e.rotation;
	this.scale = this.startScale * e.scale;
	return false;
}

GloveBox.prototype.gestureend = function(e)
{
	this.removeGestureListeners();
	this.isScaling = false;
	this.finishScrolling();
	return false;
}
 
// Mouse events are fuct!

GloveBox.prototype.mousedown = function(e)
{
   this.isDragging = true;
   var touchEvent = {timestamp:e.timestamp};
       touchEvent.preventDefault = function(){e.preventDefault();};
       touchEvent.stopPropagation = function(){e.stopPropagation();};
       touchEvent.targetTouches = [{pageX:e.x,pageY:e.y}];
  // e.preventDefault();
   // with the mouse the sliding seems a little weak
   //this.element.style.webkitTransition = "-webkit-transform 200ms ease-out"; 
   return this.touchstart(touchEvent);
}

GloveBox.prototype.mousemove = function(e)
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
}

GloveBox.prototype.mouseup = function(e)
{
    var touchEvent = {timestamp:e.timestamp};
    touchEvent.preventDefault = function(){e.preventDefault();};
    touchEvent.stopPropagation = function(){e.stopPropagation();};
    return this.touchend(touchEvent);
}

GloveBox.prototype.mouseout = function(e)
{
	// compare mouse coords to parent coords + dimensions and conditionally fire mouseup event; only 'finish the touch' if we mouseout'ed out of the element
	if (e.pageX > (this.parentCoords.left + this.parentCoords.width) || e.pageX < this.parentCoords.left || e.pageY > (this.parentCoords.top + this.parentCoords.height) || e.pageY < this.parentCoords.top) {
		return this.mouseup(e);
	} else {
		return false;
	}
}

GloveBox.prototype.mousewheel = function(e)
{
    //this.scale += e.wheelDelta / 10;
}
