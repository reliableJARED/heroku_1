var GameClock = function (updateFrequency) {
	this.startTime = Date.now();
	this.oldTime = Date.now();
	this.timeToSendUpdate = false;
	this.updateFrequency = updateFrequency;
};


GameClock.prototype.getDelta = function () {
	var delta = 0;
	var newTime = Date.now();
	//convert from mili seconds to seconds 
	delta = 0.001 * ( newTime - this.oldTime );
	this.oldTime = newTime;
	this.timeToSendUpdate += delta;
	return delta;
};

GameClock.prototype.start = function () {
	this.startTime = Date.now();
	this.oldTime = Date.now();
};
GameClock.prototype.UpdateTime = function () {
	//Change frequence of updates here
	var update = Boolean(this.timeToSendUpdate > this.updateFrequency);	
	if(update)this.timeToSendUpdate = 0;
	return update;
}

//IMPORTANT! tells node.js what you'd like to export from this file. 
// Export a convenience function that creates an instance
module.exports = function(updateFrequency) {
  return new GameClock(updateFrequency);
}