


function GloveBox(element)
{
	var self = this;
	
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
	this.element = element;
	this._x = 0;
	this._y = 0;
	
	this.startTime = 0;
	
	this.lastX = 0;
	this.lastY = 0;
	
	this.xVel = 0;
	this.yVel = 0;
	
	this.scrollY = true;
	this.scrollX = false;
	
	this._dragT  = null;
	this._afterT  = null;
	this._bounceT = null;
	this._dragThreshold = 10;
	
	var par = element.parentNode;
	if("createTouch" in document)
	{
	    par.addEventListener('touchstart', this, false);
	}
	else
	{
	    par.addEventListener("mousedown",this,false);
	}
	par.addEventListener('click', this, true);
	element.addEventListener("webkitTransitionEnd", this, true );
}

GloveBox.DraggingTransition =   "-webkit-transform none";
GloveBox.AfterTouchTransition = "-webkit-transform 400ms ease";
GloveBox.BounceBackTransition = "-webkit-transform 300ms ease-out";

GloveBox.isDragging = false;

GloveBox.prototype = 
{
	get x()
	{
		return this._x;
	},
	set x(inX)
	{
		this.setPos(inX,this._y);
	},
	
	get y()
	{
		return this._y;
	},
	set y(inY)
	{
		this.setPos(this._x,inY);
	},
	
	set scale(inS)
	{
		this._scale = Math.max(Math.min(inS,this.maxScale),this.minScale);
		this._updateTransform();
	},
	get scale()
	{
		return this._scale;
	},
	
	// Transition to display while the user is dragging
	get dragTrans()
	{
		return this._dragT ? this._dragT : GloveBox.DraggingTransition;
	},
	set dragTrans(t)
	{
		this._dragT = t;
	},
	
	// Transition to display when the user releases
	get afterTrans()
	{
		return this._afterT ? this._afterT : GloveBox.AfterTouchTransition;
	},
	set afterTrans(t)
	{
		this._dragT = t;
	},
	
	// Transition to display when we enforce the boundaries
	get bounceTrans()
	{
		return this._bounceT ? this._bounceT : GloveBox.BounceBackTransition;
	},
	set bounceTrans(t)
	{
		this._bounceT = t;
	},
	
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
	},
	get canScale()
	{
		return this._scalable;
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
	this._x = x;
	this._y = y;
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
	var transformTemplate = "translate3d(XXXpx,YYYpx,ZZZpx) scale(SCALE)";// rotate(DEGREESdeg)"; // Coming soon ?
	
	var wkTrans = transformTemplate.replace(/XXX/, this._x);
		wkTrans = wkTrans.replace(/YYY/,this._y);
		wkTrans = wkTrans.replace(/ZZZ/,0); // future use?
		wkTrans = wkTrans.replace(/SCALE/,this.scale);
		//wkTrans = wkTrans.replace(/DEGREES/,this._rotation);
	
	this.element.style.webkitTransform =  wkTrans;
}

GloveBox.prototype.addTouchListeners = function()
{
	var par = this.element.parentNode;
	if("createTouch" in document)
	{
	    par.addEventListener('touchmove', this, false);
        par.addEventListener('touchend', this, false);
        par.addEventListener('touchcancel', this, false);
    }
    else
    { 
	    par.addEventListener("mousemove", this, false);
	    par.addEventListener("mouseup", this, false);
	    par.addEventListener("mousewheel",this,false);
    }
	
}

GloveBox.prototype.removeTouchListeners = function()
{
	var par = this.element.parentNode;
	if("createTouch" in document)
	{
	    par.removeEventListener('touchmove', this, false);
        par.removeEventListener('touchend', this, false);
        par.removeEventListener('touchcancel', this, false);
    }
    else
    {
	    par.removeEventListener("mousemove", this, false);
	    par.removeEventListener("mouseup", this, false);
	    par.removeEventListener("mousewheel",this,false);
    }
        
}

GloveBox.prototype.disableInputs = function()
{
	var selects = document.getElementsByTagName("select");
	var inputs = document.getElementsByTagName("input");
	var textAreas = document.getElementsByTagName("textarea");
	
	this.formElements = [];
	if(selects != null)
	{
		for(var n = 0; n < selects.length; n++)
		{
			var elem = selects[n];
			if(!elem.disabled)
			{
				elem.disabled = true;
				this.formElements.push(elem);
			}
		}
	}
	
	if(inputs != null)
	{
		for(var n = 0; n < inputs.length; n++)
		{
			var elem = inputs[n];
			if(!elem.disabled)
			{
				elem.disabled = true;
				this.formElements.push(elem);
			}
		}
	}
	
	if(textAreas != null)
	{
		for(var n = 0; n < textAreas.length; n++)
		{
			var elem = textAreas[n];
			if(!elem.disabled)
			{
				elem.disabled = true;
				this.formElements.push(elem);
			}
		}
	}
}

GloveBox.prototype.reenableInputs = function()
{
	if(this.formElements)
	{
		for(var n = 0; n < this.formElements.length; n++)
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
	if (e.targetTouches.length != 1 || this.isScaling)
	{
		return false;
	}
	if(this.formElements == null)
	{
		this.disableInputs();
	}
	this.state = "moving";
	
	// Prevent the browser from doing its default thing (scroll, zoom)
	e.preventDefault();
	
	var currentX = e.targetTouches[0].pageX;
	var currentY = e.targetTouches[0].pageY;
	
	var dX = (currentX - this.lastX);
	var dY = (currentY - this.lastY);
	
	if(!this.isDragging)
	{
		if( Math.abs(dX) > this._dragThreshold || Math.abs(dY) > this._dragThreshold )
		{
			this.isDragging = GloveBox.isDragging = true;
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
	
		var newX = this.scrollX ? ( (this.x) + dX ) : this.x;
		var newY =  this.scrollY ? ( (this.y) + dY ) : this.y;

		this.setPos(newX,newY);
	
		this.lastX = currentX;
		this.lastY = currentY;
	}
}


GloveBox.prototype.touchend = function(e)
{
	if(this.isDragging)
	{
		var self = this;
		setTimeout( function(){self.isDragging = GloveBox.isDragging = false; self.reenableInputs();} ,1000);
		// Prevent the browser from doing its default thing (scroll, zoom)
		this.removeTouchListeners();
		var closure = function()
		{
		    e.preventDefault();
		};
		// pass on our mock event
		this.touchmove({targetTouches:e.changedTouches,preventDefault:closure});

		this.state = "ending";
		this.element.style.webkitTransition = this.afterTrans;
	    // magic number 2 is a projection of how far we will throw the scroll content before
	    // snapping it back, this will take the length of the afterTrans, and is a poor-man's
	    // interpretation of momentum
		var newLeft = Math.round(this.scrollX ? ( this.x + (2 * this.xVel) ) : this.x);
		var newTop =  Math.round(this.scrollY ? ( this.y + (2 * this.yVel) ) : this.y);
	
		this.setPos(newLeft,newTop);
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
    var pWidth = parentNode.offsetWidth;
    var selfWidth = this.element.scrollWidth * this.scale;
    var maxX = ( selfWidth - pWidth ) / 2; // div 2 beacause we scale from the center ( 50% )
    var minX = ( pWidth - selfWidth ) / 2;
	
	var newLeft = Math.min(maxX,Math.max(this.x,minX));
	// get updated y

    var pHeight = parentNode.offsetHeight;
    var selfHeight = this.element.scrollHeight * this.scale;
    
    var maxY = 0;
    var minY = ( pHeight - selfHeight );
    
    var newTop = Math.min(maxY,Math.max(this.y,minY));
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
   //this.isDragging = true;
   var touchEvent = {timestamp:e.timestamp};
       touchEvent.preventDefault = function(){e.preventDefault();};
       touchEvent.stopPropagation = function(){e.stopPropagation();};
       touchEvent.targetTouches = [{clientX:e.x,clientY:e.y}];
  // e.preventDefault();
   // with the mouse the sliding seems a little weak
   //this.element.style.webkitTransition = "-webkit-transform 200ms ease-out"; 
   return this.touchstart(touchEvent);
}

GloveBox.prototype.mousemove = function(e)
{
   if(true || this.isDragging)
   {
        var touchEvent = {timestamp:e.timestamp};
        touchEvent.preventDefault = function(){e.preventDefault();};
        touchEvent.stopPropagation = function(){e.stopPropagation();};
        touchEvent.targetTouches = [{clientX:e.x,clientY:e.y}];
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

GloveBox.prototype.mousewheel = function(e)
{
    this.scale += e.wheelDelta / 10;
}