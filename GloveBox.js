


function GloveBox(element)
{

	var self = this;
	this.state = "ready";
	
	this.isDragging = false;
	this.element = element;
	this._x = 0;
	this._y = 0;
	this.position = "0,0"; 
	this.startTime = 0;
	
	this.lastX = 0;
	this.lastY = 0;
	
	this.xVel = 0;
	this.yVel = 0;
	
	this.scrollY = true;
	this.scrollX = false;

	element.addEventListener("touchstart",  function(e) { return self.onTouchStart(e) } , false);
	element.addEventListener("touchmove", function(e) { return self.onTouchMove(e) }, false);
	element.addEventListener("touchend", function(e) { return self.onTouchEnd(e) }, false);
	element.addEventListener("webkitTransitionEnd", function(e) { self.onTransitionEnd(e); }, false );
	

}

GloveBox.isDragging = false;

GloveBox.prototype = 
{
	// position strings are "x,y" with no units
	set position(pos)
	{
		this._position = pos;

		var components = pos.split(',')
		var x = components[0];
		var y = components[1];
		
		this.element.style.webkitTransform = "translate3D(" + x + "px, " + y + "px,0px)";
	
	},
	// position strings are "x,y" with no units
	get x()
	{
		return parseInt(this._position.split(',')[0]);
	},
	
	set x(inX)
	{
		var comps = this._position.split(',');
		comps[0] = inX;
		this.position = comps.join(',');
	},
	
	get y()
	{
		return parseInt(this._position.split(',')[1]);
	},
	
	set y(inY)
	{
		var comps = this._position.split(',');
		comps[1] = inY;
		this.position = comps.join(',');
	}
}

GloveBox.prototype.scrollToBottom = function()
{
	var parentNode = this.element.parentNode;	
	// get updated y
	var minY = parentNode.offsetHeight - parentNode.scrollHeight;
	this.position = this.x + ',' + minY;
	
}



GloveBox.prototype.onTouchStart = function onTouchStart(e)
{
	
	// Start tracking when the first finger comes down in this element
	if (e.targetTouches.length != 1)
	{
		return false;
	}
	
	this.state = "starting";
	
	// use a tighter animation during dragging
	this.element.style.webkitTransition = "-webkit-transform 50ms ease";//"-webkit-transform 0ms ease";
	
	this.startX = e.targetTouches[0].clientX;
	this.startY = e.targetTouches[0].clientY;
	
	this.lastX = this.startX;
	this.lastY = this.startY;
	
	this.xVel = 0;
	this.yVel = 0;
	
	this.startTime = e.timeStamp;
	
	return false;
}


GloveBox.prototype.onTouchMove = function onTouchMove(e)
{
	
	// Don't track motion when multiple touches are down in this element (that's a gesture)
	if (e.targetTouches.length != 1)
	{
		return false;
	}
	
	this.state = "moving";
	
	// Prevent the browser from doing its default thing (scroll, zoom)
	e.preventDefault();
	
	GloveBox.isDragging = true;
	
	var currentX = e.targetTouches[0].clientX;
	var currentY = e.targetTouches[0].clientY;
	
	var dX = currentX - this.lastX;
	var dY = currentY - this.lastY;
	
	this.xVel = (dX + this.xVel * 9 ) / 10;
	this.yVel = (dY + this.yVel * 9 ) / 10;
	
	
	
	var newX = this.scrollX ? ( (this.x) + dX ) : this.x;
	var newY =  this.scrollY ? ( (this.y) + dY ) : this.y;
		
	this.position = newX + ',' + newY;
	
	this.lastX = currentX;
	this.lastY = currentY;
	
	return false;
}

GloveBox.prototype.onTouchEnd = function onTouchEnd(e)
{
	
	setTimeout(function(){GloveBox.isDragging = false;},1000);
	
	// Prevent the browser from doing its default thing (scroll, zoom)
	e.preventDefault();
	
	if (e.targetTouches.length > 0)
	{
		return false;
	}
	
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
	
	this.position = newLeft + ',' + newTop;
	
	
	return false;
}

GloveBox.prototype.finishScrolling = function finishScrolling()
{
	this.state = "done";
	this.element.style.webkitTransition = "-webkit-transform 300ms ease-in";
	//cubic-bezier(0.43,0.1,0.7,0.89)";
	//cubic-bezier(0.25, 0.1, 0.25, 1.0)";
	
	var parentNode = this.element.parentNode;
	// get updated x position
	var minX = parentNode.offsetWidth - parentNode.scrollWidth;
	var newLeft = (this.x > 0) ? 0 : this.x;
	if(newLeft < minX)
	{
		newLeft = minX;
	}
	
	// get updated y
	var minY = parentNode.offsetHeight - parentNode.scrollHeight; 
	
	var newTop = (this.y > 0) ? 0 : this.y;
	if(newTop < minY)
	{
		newTop = minY;
	}
	this.position = newLeft + ',' + newTop;
}

GloveBox.prototype.onTransitionEnd = function onTransitionEnd(e)
{
	switch(this.state)
	{
		case "ready" :  // fallthrough is intentional
		case "starting" :
		case "moving" :
		case "done":
			break;
		case "ending" :
			//alert("allDone!");
			this.finishScrolling();
			break;
	}
	
}






