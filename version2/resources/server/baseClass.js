
//our class
var baseClass = function(){
	
	this.base = 'hello from the baseClass';
}


//a method for our class
baseClass.prototype.printBase = function(){
	
	console.log(this.base);
}

//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = baseClass;//constructor