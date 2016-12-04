
//http://www.htmlgoodies.com/html5/javascript/javascript-object-chaining-using-prototypal-inheritance.html#fbid=1W1osQ4qGFs
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Prototype-based_programming

var objectPhysicsManipulationSuite = function () {
			this.physics;
};

objectPhysicsManipulationSuite.prototype = {;

/*********************************************/		
var RigidBodyBase = function(obj){
		
		objectPhysicsManipulationSuite.call(this);
		
		var defaults = {
				x:1,y:1,z:1,
				Rx:0,Ry:0,Rz:0,Rw:1,
				mass:1};
					  
		var blueprint = Object.assign(defaults,obj);
		
		this.x = blueprint.x;
		this.y = blueprint.y;
		this.z = blueprint.z;
		this.Rx = blueprint.Rx;
		this.Ry = blueprint.Ry;
		this.Rz = blueprint.Rz;
		this.Rw = blueprint.Rw;
		this.mass = blueprint.mass;
		this.shape;
		this.id;
};
RigidBodyBase.prototype =  Object.create(objectPhysicsManipulationSuite.prototype); 
RigidBodyBase.prototype.constructor = RigidBodyBase;

RigidBodyBase.prototype.ShapeIDCodes = function(){
			var codes ={
					cube:0,
					sphere:1
				}
		return codes;
	};
RigidBodyBase.prototype.transform = new Ammo.btTransform();
RigidBodyBase.prototype.vector3 = new Ammo.btVector3();
RigidBodyBase.prototype.quaternion = new Ammo.btQuaternion();
RigidBodyBase.prototype.createPhysics = function (){
	
			const CollisionMargin = 0.04;//just trust me you want this, research if you want to learn more
			var physicsShape;
			
			//TODO: add more shape specific codes
			switch (this.shape){
				case this.ShapeIDCodes().cube:
					this.vector3.setValue( this.w*0.5, this.h*0.5, this.d*0.5 )
					physicsShape = new Ammo.btBoxShape(this.vector3);
					break;
				case this.ShapeIDCodes().sphere:
					physicsShape = new Ammo.btSphereShape(this.radius);
					break;
				default: console.log('NO SHAPE PROP');
			}
	
			//setup required to build an object
			this.quaternion.setValue(this.Rx,this.Ry,this.Rz,this.Rw);
			physicsShape.setMargin(CollisionMargin);
			this.transform.setIdentity();
			this.vector3.setValue(this.x,this.y,this.z);
			this.transform.setOrigin( this.vector3 );
			this.transform.setRotation( this.quaternion );

			var motionState = new Ammo.btDefaultMotionState( this.transform );
	
			var localInertia = this.vector3.setValue(0,0,0);

			physicsShape.calculateLocalInertia(this.mass, localInertia );

			var rbInfo = new Ammo.btRigidBodyConstructionInfo( this.mass, motionState, physicsShape, localInertia );

			//Assign FINAL OBJECT
			this.physics = new Ammo.btRigidBody( rbInfo );
			//UNIQUIE 7 digit number ID
			this.id = this.physics.ptr;
		};


//CUBE
var CubeConstructorBase = function(obj){
		
		RigidBodyBase.call(this,obj);
		
		var defaults = {d:1,h:1,w:1};	  
		var blueprint = Object.assign(defaults,obj);
		
		this.w = blueprint.w;
		this.h = blueprint.h;
		this.d = blueprint.d;
		this.shape = this.ShapeIDCodes().cube;
}
//CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype.constructor = CubeConstructorBase;


var CubeObject = function(blueprint){
	CubeConstructorBase.call(this,blueprint);
	this.createPhysics();
}
CubeObject.prototype =  Object.create(CubeConstructorBase.prototype); 
CubeObject.prototype.constructor = CubeObject;
/********************************************/

//SPHERE
var SphereConstructorBase = function(obj){
		RigidBodyBase.call(this,obj);
		var defaults = {radius:1};	  
		var blueprint = Object.assign(defaults,obj);
		this.radius = blueprint.radius;
		this.shape = this.ShapeIDCodes().sphere;
}
SphereConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
SphereConstructorBase.prototype.constructor = SphereConstructorBase;

var SphereObject = function(blueprint){
	SphereConstructorBase.call(this,blueprint);
	this.createPhysics();
}
SphereObject.prototype =  Object.create(SphereConstructorBase.prototype); 
SphereObject.prototype.constructor = SphereObject;
/********************************************/

var myNewCube = new CubeObject({x:10});
var myNewSphere = new SphereObject({Rx:2})

console.log(myNewCube)
console.log(myNewSphere.getOrigin())