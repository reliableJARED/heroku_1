
//http://www.htmlgoodies.com/html5/javascript/javascript-object-chaining-using-prototypal-inheritance.html#fbid=1W1osQ4qGFs
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Prototype-based_programming

if(typeof Ammo === 'undefined'){
	
	console.log('there is no instance of \'node-ammo\'.  Please import first with require(node-ammo) before using PhysicsObjectFactory');
}

var objectPhysicsManipulationSuite = function () {
			this.physics;
			this.f32array4export = new Float32Array(14);//ORDER: id,x,y,z,Rx,Ry,Rz,Rw,LVx,LVy,LVz,AVx,AVy,AVz
};

objectPhysicsManipulationSuite.prototype = {
	
		physics_indexLocations:function () {
			return {
						id:0,
						x:1,
						y:2,
						z:3,
						Rx:4,
						Ry:5,
						Rz:6,
						Rw:7,
						LVx:8,
						LVy:9,
						LVz:10,
						AVx:11,
						AVy:12,
						AVz:13
			}
		},
		
		prepBinaryExportData:function () {
			//this.physics is deep on proto chain so assign local after lookup
			var objPhys = this.physics;
			var trans = this.transform;
			objPhys.getWorldTransform(trans);
			var pos = trans.getOrigin();
			var rot = trans.geRotation();
			var LV =  objPhys.getLinearVelocity();
			var AV =  objPhys.getAngularVelocity();
			//Total is 56 bytes (index 0 is ID)
			//if updates are sent at a rate of 2 per second
			//100 objects being updated
			//~11.2kbs
			//doesn't count header info sent in socket.io
			
			var array = this.f32array4export;
			
			//array[0] is our objects ID
			var indexLoc = physics_indexLocations();
			array[indexLoc.x] = pos.x();
			array[indexLoc.y] = pos.y();
			array[indexLoc.z] = pos.z();
			array[indexLoc.Rx] = rot.x();
			array[indexLoc.Ry] = rot.y();
			array[indexLoc.Rz] = rot.z();
			array[indexLoc.Rw] = rot.w();
		    array[indexLoc.LVx] = LV.x();
			array[indexLoc.LVy] = LV.y();
			array[indexLoc.LVz] = LV.z();
			array[indexLoc.AVx] = AV.x();
			array[indexLoc.AVy] = AV.y();
			array[indexLoc.AVz] = AV.z();
			
			return Buffer.from(array);
		},
		
		getOrigin:function(){
				this.physics.getWorldTransform(this.transform);
				var pos = this.transform.getOrigin();
				return {x:pos.x(),y:pos.y(),z:pos.z()};
				},
				
		setOrigin:function(x,y,z){
				this.vector3.setValue(x,y,z);
				this.transform.setOrigin(this.vector3);
				this.physics.setWorldTransform(this.transform);
				this.physics.setActivationState(1);
				},
						
		getRotation:function(){
				this.physics.getWorldTransform(this.transform)
				var quat = this.transform.getRotation();
				return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
				},
		
		setRotation:function(x,y,z,w){
				this.quaternion.setValue(x,y,z,w);
				this.transform.setRotation(this.quaternion);
				this.physics.setWorldTransform(this.transform);
				this.physics.setActivationState(1);
				},
				
		getLinearVelocity:function(){
			var LV =  this.physics.getLinearVelocity();
			return {x:LV.x(), y:LV.y(), z:LV.z()};
			},

		setLinearVelocity:function(x,y,z){
			this.vector3.setValue(x,y,z);
			this.physics.setLinearVelocity(this.vector3);
			this.physics.setActivationState(1);
			},

		getAngularVelocity:function(){
			var AV =  this.physics.getAngularVelocity();
			return {x:AV.x(), y:AV.y(), z:AV.z()};
			},
			
		setAngularVelocity:function(x,y,z){
			this.vector3.setValue(x,y,z);
			this.physics.setAngularVelocity(this.vector3);
			this.physics.setActivationState(1);
			}
};

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
		
		//**used in binary data export.  Angular Velocity NOT updated to save 16bytes/obj		
		this.int8arrayShape = new Int8Array(1);//ORDER: shape	
};
RigidBodyBase.prototype =  Object.create(objectPhysicsManipulationSuite.prototype); 
RigidBodyBase.prototype.constructor = RigidBodyBase;
			
RigidBodyBase.prototype.aux_indexLocations = function () {
		return {
				shape:0};
	};	
RigidBodyBase.prototype.transform = new Ammo.btTransform();
RigidBodyBase.prototype.vector3 = new Ammo.btVector3();
RigidBodyBase.prototype.quaternion = new Ammo.btQuaternion();
RigidBodyBase.prototype.createPhysics = function (){
	
			var physicsShape;
			var shapeCodes = this.ShapeIDCodes();

			//TODO: add more shape specific codes
			
			switch (this.shape){
				case shapeCodes.cube:
					this.vector3.setValue( this.w*0.5, this.h*0.5, this.d*0.5 );
					physicsShape = new Ammo.btBoxShape(this.vector3);
					var index = this.aux_indexLocations().shape;
					this.int8arrayShape[index] = shapeCodes.cube;
					break;
				case shapeCodes.sphere:
					physicsShape = new Ammo.btSphereShape(this.radius);
					var index = this.aux_indexLocations().shape;
					this.int8arrayShape[index] = shapeCodes.sphere;
					break;

				//TODO: ADD MORE SHAPES>>>
				
				default: console.log('NO SHAPE PROP');
			}
	
			//setup require d to build an object
			this.quaternion.setValue(this.Rx,this.Ry,this.Rz,this.Rw);
			
			const CollisionMargin = 0.04;//just trust me you want this, research if you want to learn more
			physicsShape.setMargin(CollisionMargin);
			
			this.transform.setIdentity();
			this.vector3.setValue(this.x,this.y,this.z);
			this.transform.setOrigin( this.vector3 );
			this.transform.setRotation( this.quaternion );

			var motionState = new Ammo.btDefaultMotionState( this.transform );
	
			var localInertia = this.vector3.setValue(0,0,0);

			physicsShape.calculateLocalInertia( this.mass, localInertia );

			var rbInfo = new Ammo.btRigidBodyConstructionInfo( this.mass, motionState, physicsShape, localInertia );

			//Assign FINAL OBJECT
			this.physics = new Ammo.btRigidBody( rbInfo );
			//UNIQUIE 7 digit number ID
			this.id = this.physics.ptr;
			//set id index in the float array used in binary data exports
			this.f32array4export[this.physics_indexLocations().id] = this.id;
			
			
			/*To prevent accessing the wrong values, reassign location props to get functions.
			The reason is these props are currently static, but the object can move.  
			therefore doing object.x will reference the x at time of creation, not it's current.  we must access the current x position through the physics
			like: 
				  this.physics.getWorldTransform(this.transform);
			      this.x =  this.transform.getOrigin().x();
			*/

			this.assignPositionPropsToGetFunctions();
			this.assignRotationPropsToGetFunctions();
		};
RigidBodyBase.prototype.assignPositionPropsToGetFunctions = function(){

	this.x = function(){
					this.physics.getWorldTransform(this.transform);
					return this.transform.getOrigin().x();
				}; 
				
	this.y = function(){
					this.physics.getWorldTransform(this.transform);
					return this.transform.getOrigin().y();
				}; 
				
	this.z = function(){
					this.physics.getWorldTransform(this.transform);
					return this.transform.getOrigin().z();
				};
}

RigidBodyBase.prototype.assignRotationPropsToGetFunctions = function(){
	
	this.Rx = function(){
				this.physics.getWorldTransform(this.transform)
				return this.transform.getRotation().x();
			};	

	this.Ry = function(){
				this.physics.getWorldTransform(this.transform)
				return this.transform.getRotation().y();
			};	
			
	this.Rz = function(){
				this.physics.getWorldTransform(this.transform)
				return this.transform.getRotation().z();
			};	
			
	this.Rw = function(){
				this.physics.getWorldTransform(this.transform)
				return this.transform.getRotation().w();
			};	
};


RigidBodyBase.prototype.ShapeIDCodes = function(){
		return {
					cube:0,
					sphere:1
				}
			};		
		
RigidBodyBase.prototype.exportBinary = function () {
	
	//prepare binary data
	//INDEX ORDER: id,x,y,z,Rx,Ry,Rz,Rw,LVx,LVy,LVz,AVx,AVy,AVz
	var buffer = this.prepBinaryExportData();

	//export binary data buffer
	return buffer;
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

		this.f32arrayDimensions = new Float32Array(3);//ORDER: w,h,d
		this.f32arrayDimensions[0] = blueprint.w;
		this.f32arrayDimensions[1] = blueprint.h;
		this.f32arrayDimensions[2] = blueprint.d;
}
//CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype.constructor = CubeConstructorBase;

CubeConstructorBase.prototype.cube_indexLocations = function () {
			return {x:0,
					y:1,
					z:2}
		},
		
		
CubeConstructorBase.prototype.prepBinaryExportData_dimensions = function () {
		var shapeArray = Buffer.from(this.f32arrayDimensions);
		var dimArray = Buffer.from(this.int8arrayShape);
		var totalBytes = 	shapeArray.length + dimArray.length
			
		var buffer = Buffer.concat([shapeArray,dimArray],totalBytes);
		
		return buffer;
};

CubeConstructorBase.prototype.initBinaryExportData = function () {
	//physical props
	//INDEX ORDER: id,x,y,z,Rx,Ry,Rz,Rw,LVx,LVy,LVz,AVx,AVy,AVz
	var physicsBuffer = this.prepBinaryExportData();
	
	//attributes
	//
	var attributesBuffer = this.prepBinaryExportData_dimensions();
	
	var totalBytes = 	physicsBuffer.length + attributesBuffer.length
	var buffer = Buffer.concat([physicsBuffer,attributesBuffer],totalBytes);
	
	return buffer;
}


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



//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = {CubeObject:CubeObject, SphereObject:SphereObject}; //constructors

