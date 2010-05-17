


function GloveBox(element)
{
	var self = this;
	this.state = "ready";
	this._scalable = false;
	this.isScaling = false;

	this.startScale = this._scale = 1.0;
	
	this.startAngle = this._angle = 0;
	
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
	
	var par = element.parentNode;

	par.addEventListener("touchstart",  function(e) { return self.onTouchStart(e) } , false);
	par.addEventListener("touchmove", function(e) { return self.onTouchMove(e) }, false);
	par.addEventListener("touchend", function(e) { return self.onTouchEnd(e) }, false);
	par.addEventListener("webkitTransitionEnd", function(e) { self.onTransitionEnd(e); }, false );
	
	par.addEventListener("gesturestart", function(e) { return self.onGestureStart(e) }, false);
	par.addEventListener("gesturechange", function(e) { return self.onGestureChange(e) }, false);
    par.addEventListener("gestureend", function(e) { return self.onGestureEnd(e) }, false); 
    
    par.addEventListener("mousedown",function(e) { return self.onMouseDown(e) }, false); 
	par.addEventListener("mousemove",function(e) { return self.onMouseMove(e) }, false); 
	par.addEventListener("mouseup",function(e) { return self.onMouseUp(e) }, false); 
	element.style.webkitTransformOrigin = "0% 0%";

}

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
		this._scale = Math.max(Math.min(inS,2.0),0.25);
		this._updateTransform();
	},
	get scale()
	{
		return this._scale;
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
/*
	document.getElementById("spScale").innerHTML = "Scale: " + this.scale;
	document.getElementById("spX").innerHTML = "X: " + this.x;
	document.getElementById("spY").innerHTML = "Y: " + this.y;
*/
	this.element.style.webkitTransform =  "scale3D(" + this._scale + "," + this._scale +  ",1.0) translate3D(" + ( this._scale * this._x ) + "px, " + ( this._scale * this._y ) + "px,0px)";
	
}

GloveBox.prototype.onMouseDown = function(e)
{
   this.isDragging = true;
   var touchEvent = {timestamp:e.timestamp};
   touchEvent.preventDefault = function(){e.preventDefault();};
   touchEvent.targetTouches = [{clientX:e.x,clientY:e.y}];
   this.onTouchStart(touchEvent);
   // with the mouse the sliding seems a little weak
   this.element.style.webkitTransition = "-webkit-transform 200ms ease-out"; 
    
   return false;
}

GloveBox.prototype.onMouseMove = function(e)
{
   if(this.isDragging)
   {
        var touchEvent = {timestamp:e.timestamp};
        touchEvent.preventDefault = function(){e.preventDefault();};
        touchEvent.targetTouches = [{clientX:e.x,clientY:e.y}];
        return this.onTouchMove(touchEvent);
   }
}

GloveBox.prototype.onMouseUp = function(e)
{
    this.isDragging = false;
    var touchEvent = {timestamp:e.timestamp};
    touchEvent.preventDefault = function(){e.preventDefault();};
    return this.onTouchEnd(touchEvent);
}





GloveBox.prototype.onGestureStart = function(e)
{
	this.isScaling = true;
	this.startScale = this._scale;
	this.startAngle = this._angle;
	
	e.preventDefault();
	return false;
}

GloveBox.prototype.onGestureChange = function(e)
{
	this.isScaling = true;
	e.preventDefault();

	this.scale = this.startScale * e.scale;
    //this.rotation = e.rotation;
	
	return false;
}

GloveBox.prototype.onGestureEnd = function(e)
{
	this.isScaling = false;
	e.preventDefault();
	return false;
}	



GloveBox.prototype.onTouchStart = function(e)
{
	// Start tracking when the first finger comes down in this element
	if (e.targetTouches.length != 1 || this.isScaling)
	{
		return false;
	}
	this.state = "starting";
	
	// use a tighter animation during dragging
	this.element.style.webkitTransition = "-webkit-transform 50ms ease";
	
	this.startX = e.targetTouches[0].clientX;
	this.startY = e.targetTouches[0].clientY;
	
	this.lastX = this.startX;
	this.lastY = this.startY;
	
	this.xVel = 0;
	this.yVel = 0;
	
	this.startTime = e.timeStamp;
	
	return false;
}


GloveBox.prototype.onTouchMove = function(e)
{
	// Don't track motion when multiple touches are down in this element (that's a gesture)
	if (e.targetTouches.length != 1 || this.isScaling)
	{
		return false;
	}
	
	this.state = "moving";
	
	// Prevent the browser from doing its default thing (scroll, zoom)
	e.preventDefault();
	
	GloveBox.isDragging = true;
	
	var currentX = e.targetTouches[0].clientX;
	var currentY = e.targetTouches[0].clientY;
	
	var dX = (currentX - this.lastX) / this.scale;
	var dY = (currentY - this.lastY) / this.scale;
	
	this.xVel = (dX + this.xVel * 9 ) / 10;
	this.yVel = (dY + this.yVel * 9 ) / 10;
	
	var newX = this.scrollX ? ( (this.x) + dX ) : this.x;
	var newY =  this.scrollY ? ( (this.y) + dY ) : this.y;

	this.setPos(newX,newY);
	
	this.lastX = currentX;
	this.lastY = currentY;
	
	return false;
}

GloveBox.prototype.onTouchEnd = function(e)
{
	
	setTimeout(function(){GloveBox.isDragging = false;},1000);
	
	// Prevent the browser from doing its default thing (scroll, zoom)
	e.preventDefault();
	

	
	this.state = "ending";
	this.element.style.webkitTransition = "-webkit-transform 300ms ease-out"; 
	
	var dT = e.timeStamp - this.startTime;
	
	var totDist = this.startY - this.y;

	var speed = totDist / dT;
	
	var projY = this.y - speed;
	
	if ((dT < 600) && totDist > 50) 
	{
		// Flicks should go farther
		projY *=  1.2;
	}

	
	var newLeft = this.scrollX ? ( this.x + (2 * this.xVel) ) : this.x;
	var newTop = this.scrollY ? ( this.y + (2 * this.yVel) ) : this.y;
	
	this.setPos(newLeft,newTop);
	
	return false;
}

GloveBox.prototype.finishScrolling = function()
{
	this.state = "done";
	this.element.style.webkitTransition = "-webkit-transform 300ms ease-in";
	
	var parentNode = this.element.parentNode;
	// get updated x position
	

	var progWidth = parentNode.scrollWidth * this.scale;
	//document.getElementById("spWidth").innerHTML = "Width: " + progWidth;
	
	
	var minX = ((parentNode.offsetWidth - parentNode.scrollWidth ) * this.scale );
	
	var newLeft = (this.x > 0) ? 0 : this.x;
	if(newLeft < minX)
	{
		newLeft = minX;
	}
	
	// get updated y
	var minY = ( ( parentNode.offsetHeight -  parentNode.scrollHeight ) * this.scale ); 
	
	var newTop = (this.y > 0) ? 0 : this.y;
	if(newTop < minY)
	{
		newTop = minY;
	}
	
	this.setPos(newLeft,newTop);
}

GloveBox.prototype.onTransitionEnd = function(e)
{
	switch(this.state)
	{
		case "ready" :  // fallthrough is intentional
		case "starting" :
		case "moving" :
		case "done":
			break;
		case "ending" :
			this.finishScrolling();
			break;
	}
	
}






