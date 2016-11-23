
//a child class
var childClass = function(base){
	
	//base is a class NOT an instance	
	
	base.call(this);//this will inherit class props but NOT prototype chain (see below when prototype is inherited)
	
	this.child = "Hello from childClass"
};


//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = function(base) {

  //first create a childClass.prototype object that inherits from base.prototype.
  childClass.prototype = Object.create(base.prototype);
  
  //second add the new methods for the child class
	childClass.prototype.printChild = function(){
	
		console.log(this.child);
	}
	
  //now return an INSTANCE of our class (this is for example, could return constructor like we did with base)
  return new childClass(base);
}