
//http://www.htmlgoodies.com/html5/javascript/javascript-object-chaining-using-prototypal-inheritance.html#fbid=1W1osQ4qGFs
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Prototype-based_programming
/* FUNCTION TREE of 'physics' property of objects.
	activate: (arg0)
	applyCentralForce: (arg0) => arg0 = btVector3()
	applyCentralImpulse: (arg0) => arg0 = btVector3()
	applyCentralLocalForce: (arg0) => arg0 = btVector3()
	applyForce: (arg0,arg1) => arg0 = btVector3()
	applyImpulse: (arg0,arg1)  => arg0 = btVector3()
	applyLocalTorque: (arg0) => arg0 = btVector3()
	applyTorque: (arg0) => arg0 = btVector3()
	applyTorqueImpulse: (arg0) => arg0 = btVector3()
	constructor: btRigidBody(arg0)
	forceActivationState: (arg0)
	getAngularVelocity: ()
	getCenterOfMassTransform: ()
	getCollisionFlags: ()
	getCollisionShape: ()
	getLinearVelocity: ()
	getMotionState: () => returns ms obj, do getWorldTransform() on the ms obj
	getUserIndex: ()
	getUserPointer: ()
	getWorldTransform: ()
	isActive: ()
	isKinematicObject: ()
	setActivationState: (arg0) => arg0 can be #: 1 (ACTIVE_TAG)
											     2 (ISLAND_SLEEPING) 
											     3 (WANTS_DEACTIVATION) 
											     4 (DISABLE_DEACTIVATION)
											     5 (DISABLE_SIMULATION)
	setAngularFactor: (arg0)
	setAngularVelocity: (arg0) => arg0 = btVector3()
	setAnisotropicFriction: (arg0,arg1)
	setCcdMotionThreshold: (arg0)
	setCcdSweptSphereRadius: (arg0)
	setCenterOfMassTransform: (arg0)
	setCollisionFlags: (arg0)
	setCollisionShape: (arg0)
	setContactProcessingThreshold: (arg0)
	setDamping: (arg0,arg1)
	setFriction: (arg0)
	setLinearFactor: (arg0)
	setLinearVelocity: (arg0) => arg0 = btVector3()
	setMassProps: (arg0,arg1)
	setMotionState: (arg0)
	setRestitution: (arg0)
	setRollingFriction: (arg0)
	setSleepingThresholds: (arg0,arg1)
	setUserIndex: (arg0)
	setUserPointer: (arg0)
	setWorldTransform: (arg0) => arg0 = btTransform()
	upcast: (arg0)
	updateInertiaTensor: ()
*/

if(typeof Ammo === 'undefined'){
	
	console.log('*******ERROR**********************There is no instance of \'node-ammo\'.  Please import first with require(node-ammo) before using PhysicsObjectFactory****************************');
}

var objectPhysicsManipulationSuite = function () {
			this.physics;
			this.f32arrayPhysics = new Float32Array(14);//ORDER: id,x,y,z,Rx,Ry,Rz,Rw,LVx,LVy,LVz,AVx,AVy,AVz
			
};

objectPhysicsManipulationSuite.prototype = {
	
		physics_indexLocations:function() {
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
		
		BinaryExport_physics:function() {
			//assign this.physics and this.transform locally because we use a few times
			var objPhys = this.physics;
			var trans = this.transform;
			
			objPhys.getMotionState().getWorldTransform(trans);
			var pos = trans.getOrigin();
			var rot = trans.getRotation();
			var LV =  objPhys.getLinearVelocity();
			var AV =  objPhys.getAngularVelocity();
			//Total is 56 bytes (index 0 is ID)
			//if updates are sent at a rate of 2 per second
			//100 objects being updated
			//~11.2kbs
			//doesn't count header info sent in socket.io
			
			var array = this.f32arrayPhysics;
			
			//array[0] is our objects ID it's only set once at instatiation
			var indexLoc = this.physics_indexLocations();
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
			
			return Buffer.from(array.buffer);
		},
		
		getOrigin:function(){
				this.physics.getMotionState().getWorldTransform(this.transform);
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
				this.physics.getMotionState().getWorldTransform(this.transform)
				var quat = this.transform.getRotation();
				return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
				},
		
		setRotation:function(x,y,z,w){
				this.quaternion.setValue(x,y,z,w);
				this.transform.setRotation(this.quaternion);
				this.physics.setWorldTransform(this.transform);
				this.physics.setActivationState(1);
				},
		
		//should this even exist? just go direct off this.physics		
		getLinearVelocity:function(){
			var LV =  this.physics.getLinearVelocity();
			return {x:LV.x(), y:LV.y(), z:LV.z()};
			},

		setLinearVelocity:function(x,y,z){
			this.vector3.setValue(x,y,z);
			this.physics.setLinearVelocity(this.vector3);
			this.physics.setActivationState(1);
			},
			
		//should this even exist? just go direct off this.physics	
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

/*********************************************
IMPORTANT Note on collision objects:------->
when two rigidbodies collide there is a representitive 'collisionObject' that can be accessed from the
physics world dispatcher.  Because Ammo is javascript port of a c++ lib, many things pointer related are broken.  However!  there is a 

this.dispatcher.getManifoldByIndexInternal(i).getBody0().getUserPointer() returns an object: VoidPtr{ptr:number}
or
this.dispatcher.getManifoldByIndexInternal(i).getBody0().getUserIndex() returns the ptr value of the
VoidPtr object

This can be used as a flag.  to indicate specific actions.  The ptr can be accessed by the physics property
of the rigid body.  Its one of the few if only direct links between a collision object and it's coresponding rigid body when using Ammo (obv in bullet you get actual pointers because it's c++)
there are coresponding set methods setUserPointer(number) setUserIndex(number).  they do what you'd expect.
--------/>
*/
var RigidBodyBase = function(obj){
		
		objectPhysicsManipulationSuite.call(this);
		
		var defaults = {
				x:0,y:0,z:0,
				Rx:0,Ry:0,Rz:0,Rw:1,
				LVx:0,LVy:0,LVz:0,
				AVx:0,AVy:0,AVz:0,
				mass:1};
					  
		var blueprint = Object.assign(defaults,obj);
		
		this.x = blueprint.x;
		this.y = blueprint.y;
		this.z = blueprint.z;
		this.Rx = blueprint.Rx;
		this.Ry = blueprint.Ry;
		this.Rz = blueprint.Rz;
		this.Rw = blueprint.Rw;
		this.LVx = blueprint.LVx;
		this.LVy = blueprint.LVy;
		this.LVz = blueprint.LVz;
		this.AVx = blueprint.AVx;
		this.AVy = blueprint.AVy;
		this.AVz = blueprint.AVz;
		this.mass = blueprint.mass;
		this.shape;
		this.id;
		this.graphics = false;//if obj has associated graphics they will be placed here
		
		//TODO: Should callback() be added to RigidBodyBase?
		//concept would be to assign a callback that execpts for example an object ID of an object
		//that was in collision with this object.
		//so for a player the callback would be able to process the collision with a powerup or other obj
		//sticking a blank function will help prevent errors when called for objects that don't use
		this.callbackCollision = function(){null};
};
RigidBodyBase.prototype =  Object.create(objectPhysicsManipulationSuite.prototype); 
RigidBodyBase.prototype.constructor = RigidBodyBase;


RigidBodyBase.prototype.transform = new Ammo.btTransform();
RigidBodyBase.prototype.vector3 = new Ammo.btVector3();
RigidBodyBase.prototype.quaternion = new Ammo.btQuaternion();
RigidBodyBase.prototype.createPhysics = function (){
	
			var physicsShape;
			var shapeCodes = this.ShapeIDCodes();

			//TODO: add more shape specific codes
			
			switch (this.shape){
				case shapeCodes.cube:
					this.vector3.setValue( this.width*0.5, this.height*0.5, this.depth*0.5 );
					physicsShape = new Ammo.btBoxShape(this.vector3);
					break;
				case shapeCodes.sphere:
					physicsShape = new Ammo.btSphereShape(this.radius);
					break;

				//TODO: ADD MORE SHAPES>>>
				
				default: console.log('ERROR: this.shape either not defined or not a value of a known shape code from ShapeIDCodes()');
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
	
			//reset
			this.vector3.setValue(0,0,0);
			var localInertia = this.vector3;

			physicsShape.calculateLocalInertia( this.mass, localInertia );

			var rbInfo = new Ammo.btRigidBodyConstructionInfo( this.mass, motionState, physicsShape, localInertia );
			
			//Assign FINAL OBJECT
			this.physics = new Ammo.btRigidBody( rbInfo );
			//UNIQUIE 7 digit number ID
			this.id = this.physics.ptr;
			//set id index in the float array used in binary data exports
			this.f32arrayPhysics[this.physics_indexLocations().id] = this.id;
			
			//Apply velocity, if any
			this.vector3.setValue(this.LVx,this.LVy,this.LVz);
			this.physics.setLinearVelocity(this.vector3);
			this.vector3.setValue(this.AVx,this.AVy,this.AVz);
			this.physics.setAngularVelocity(this.vector3);
			
			
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
					this.physics.getMotionState().getWorldTransform(this.transform);
					return this.transform.getOrigin().x();
				}; 
				
	this.y = function(){
					this.physics.getMotionState().getWorldTransform(this.transform);
					return this.transform.getOrigin().y();
				}; 
				
	this.z = function(){
					this.physics.getMotionState().getWorldTransform(this.transform);
					return this.transform.getOrigin().z();
				};
}

RigidBodyBase.prototype.assignRotationPropsToGetFunctions = function(){
	
	this.Rx = function(){
				this.physics.getMotionState().getWorldTransform(this.transform)
				return this.transform.getRotation().x();
			};	

	this.Ry = function(){
				this.physics.getMotionState().getWorldTransform(this.transform)
				return this.transform.getRotation().y();
			};	
			
	this.Rz = function(){
				this.physics.getMotionState().getWorldTransform(this.transform)
				return this.transform.getRotation().z();
			};	
			
	this.Rw = function(){
				this.physics.getMotionState().getWorldTransform(this.transform)
				return this.transform.getRotation().w();
			};	
};


RigidBodyBase.prototype.ShapeIDCodes = function(){
		return {
					cube:0,
					sphere:1
				}
	};	
RigidBodyBase.prototype.geometry_indexLocations = function(shape){
	
	var shapeCodes = this.ShapeIDCodes();
	
	switch(shape){
		
		case shapeCodes.cube: return {mass:0,width:1,height:2,depth:3}
		break;
		
		case shapeCodes.sphere: return{mass:0,radius:1}
		break;
		
		default: console.log("unknown shape arg in RigidBodyBase.prototype.geometry_indexLocations()")
	}
		
};
			
RigidBodyBase.prototype.BinaryExport_geometry = function () {
		
		//type of shape
		//**although direct Buffer.from(int shape, 'binary') will work, using typed array
		//https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings		
		var int8Shape = new Int8Array(1);//ORDER: shape	
		int8Shape[0] = this.shape;
		var shapeBuffer = Buffer.from(int8Shape.buffer);
	
		//the shapes geometry
		var geometryBuffer = Buffer.from(this.f32arrayGeometry.buffer);
		
		var totalBytes = geometryBuffer.length + shapeBuffer.length;
			
		var buffer = Buffer.concat([shapeBuffer,geometryBuffer],totalBytes);
		
		return buffer;
};	

RigidBodyBase.prototype.BinaryExport_graphics = function () {
		
		//type of shape
		//**although direct Buffer.from(int shape, 'binary') will work, using typed array
		//https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings		
		var ID = new Int32Array(1);//ORDER: ID	
		ID[0] = this.id;
	
		//the shapes MATERIAL
		var materialArray = new Int8Array(2);
		materialArray[0] = this.material;
		materialArray[1] = this.shape;

		//get string names of all the shapes faces
		var propArrayFaces = Object.keys(this.graphicsDefaultMapping());
		//base the size of array on number of default properties
		var propArraySize = propArrayFaces.length;
		
		//keep color and texture separate arrays YES, technically could combine, but dont
		var colorArray = new Float32Array(propArraySize);
		var textureArray = new Int16Array(propArraySize);
		
		for(var face = 0; face<propArraySize;face++){
			//the shapes COLOR
			colorArray[face] = this.colors[propArrayFaces[face]];
			//the shapes TEXTURE
			textureArray[face] = this.textures[propArrayFaces[face]];
		}
		
		//create the buffers
		var IDbuffer = Buffer.from(ID.buffer);
		var materialBuffer = Buffer.from(materialArray.buffer);
		var colorBuffer = Buffer.from(colorArray.buffer);
		var textureBuffer = Buffer.from(textureArray.buffer);

		//how big will total buffer be
		var totalBytes = IDbuffer.length + materialBuffer.length + colorBuffer.length + textureBuffer.length;
			
		//combine to single buffer
		var buffer = Buffer.concat([IDbuffer,materialBuffer,colorBuffer,textureBuffer],totalBytes);
		
		return buffer;
};	
		
RigidBodyBase.prototype.BinaryExport_ALL = function () {
	//**********
	//DOES NOT EXPORT ANY GRAPICS INFO !!!
	//use: BinaryExport_graphics()
	//... Which means this method is not named right....
	//**********
	
	//physics portion - ALL float32
	//INDEX ORDER: id,x,y,z,Rx,Ry,Rz,Rw,LVx,LVy,LVz,AVx,AVy,AVz
	var physicsBuffer = this.BinaryExport_physics();
	
	//shape geometry buffer
	//INDEX ORDER:shapeCode[int8],geometry props [float32]
	//geometry props is of varible length depending on shape code.  i.e. cube has w,h,d where sphere has only radius
	var geometryBuffer = this.BinaryExport_geometry();
	
	var totalBytes = physicsBuffer.length + geometryBuffer.length
	var buffer = Buffer.concat([physicsBuffer,geometryBuffer],totalBytes);
	
	return buffer;
}
	
RigidBodyBase.prototype.MappingGeometricFaceCodes = function(){
	//cube texture index map:
					//0 -left
					//1 - right
					//2 - top
					//3 - bottom
					//4 - front
					//5 - back
	return{
		cube:{
			face1: 'left',
			face2: 'right',
			face3: 'top',
			face4: 'bottom',
			face5: 'front',
			face6: 'back'
		},
		sphere:{
			face1:'front'
		}
	}
}
RigidBodyBase.prototype.graphicsDefaultMapping = function(){
	
	var NoAssignment = -1;
	
	var FaceKeys = this.MappingGeometricFaceCodes();
	var shapeCodes = this.ShapeIDCodes();
	
	switch (this.shape){
			case shapeCodes.cube:
					return {
						[FaceKeys.cube.face1]:NoAssignment,
						[FaceKeys.cube.face2]:NoAssignment,
						[FaceKeys.cube.face3]:NoAssignment,
						[FaceKeys.cube.face4]:NoAssignment,
						[FaceKeys.cube.face5]:NoAssignment,
						[FaceKeys.cube.face6]:NoAssignment
						}
					break;
				
			case shapeCodes.sphere:
					return {
						//wrapps whole sphere
						[FaceKeys.sphere.face1]:NoAssignment
						}
					break;

				//TODO: ADD MORE SHAPES>>>
				
				default: console.log('ERROR: this.shape either not defined or not a value of a known shape code from ShapeIDCodes()');
			}
}	

RigidBodyBase.prototype.graphicsMaterialCodes = function(){
	/*
	TYPES:
	MeshBasicMaterial -> https://threejs.org/docs/api/materials/MeshBasicMaterial.html
	MeshDepthMaterial - > https://threejs.org/docs/api/materials/MeshDepthMaterial.html
	MeshLambertMaterial -> https://threejs.org/docs/api/materials/MeshLambertMaterial.html
	MeshNormalMaterial -> https://threejs.org/docs/api/materials/MeshNormalMaterial.html
	MeshPhongMaterial - https://threejs.org/docs/api/materials/MeshPhongMaterial.html
	MeshStandardMaterial -> https://threejs.org/docs/api/materials/MeshStandardMaterial.html
	*/
	return {
		basic:0,
		depth:1,
		lambert:2,
		normal:3,
		phong:4,
		standard:5
	}


}


RigidBodyBase.prototype.visualComponentMaker = function(visualComponent){
	
	var DefaultNone = this.graphicsDefaultMapping();
	
	//check if a texture arg was passed in
	if(typeof visualComponent !== 'undefined'){
		//Deal with key word 'wrap'
		if(typeof visualComponent.wrap !== 'undefined'){
			//for each face that shape has, apply the arg in wrap to that face
			for(var face in DefaultNone){
				
				visualComponent[face] = visualComponent.wrap;
			}
		}
	}else{
		//Deal with NO texture args passed at all
		visualComponent = DefaultNone;
	}
	
	// replace the defaults with arguments passed in and return
	return Object.assign(DefaultNone,visualComponent);
}

RigidBodyBase.prototype.addGraphics = function(inputObj){
	//GOOD SPHERE EXAMPLE
	//http://learningthreejs.com/blog/2013/09/16/how-to-make-the-earth-in-webgl/

	var inputObj = inputObj || {};
	
	//for color or texture not assigned to an object face, default is none
	//note that the wrap prop of passed in arg is used to 'wrap' so don't have to assign each face	
	this.textures = this.visualComponentMaker(inputObj.textures);
	
	this.colors = this.visualComponentMaker(inputObj.colors);
	
	var matCodes = this.graphicsMaterialCodes();
	
	if(typeof inputObj.material === 'undefined'){
		this.material = matCodes.basic;
	}
	else{
		var stringNameOfMats = Object.keys(matCodes);
		switch (inputObj.material){
			
			case stringNameOfMats[matCodes.basic]: this.material = matCodes.basic
												 break;
			case stringNameOfMats[matCodes.depth]:this.material = matCodes.depth
												 break;
			case stringNameOfMats[matCodes.lambert]:this.material = matCodes.lambert
												 break;
			case stringNameOfMats[matCodes.normal]:this.material = matCodes.normal
												 break;
			case stringNameOfMats[matCodes.standard]:this.material = matCodes.standard
												 break;
			default: console.log('error in RigidBodyBase.prototype.addGraphics');
		}
	}
	
	
}


/********************************************/
//CUBE Class
var CubeObject = function(blueprint){
	    //inherit
		RigidBodyBase.call(this,blueprint);
		
		var defaults = {depth:1,height:1,width:1};	  
		
		//over write defaults if any build params sent
		var blueprint = Object.assign(defaults,blueprint);
		
		this.width = blueprint.width;
		this.height = blueprint.height;
		this.depth = blueprint.depth;

		this.shape = this.ShapeIDCodes().cube;
		var indexLoc = this.geometry_indexLocations(this.shape);
		
		this.f32arrayGeometry = new Float32Array(4);//ORDER: mass,width,height,depth
		this.f32arrayGeometry[indexLoc.mass] = this.mass;
		this.f32arrayGeometry[indexLoc.width] = this.width;
		this.f32arrayGeometry[indexLoc.height] = this.height;
		this.f32arrayGeometry[indexLoc.depth] = this.depth;
		
	this.createPhysics();
	//DEFAULT call addGraphics to assign 'no assignment'.  call again on the actual obj to assign real graphics.
	this.addGraphics();
}
CubeObject.prototype =  Object.create(RigidBodyBase.prototype); 
CubeObject.prototype.constructor = CubeObject;

//SPHERE Class
var SphereObject = function(blueprint){
	   //inherit
		RigidBodyBase.call(this,blueprint);
		
		var defaults = {radius:1};	
		
		var blueprint = Object.assign(defaults,blueprint);
		
		this.radius = blueprint.radius;
		
		this.shape = this.ShapeIDCodes().sphere;
		var indexLoc = this.geometry_indexLocations(this.shape);
		
		this.f32arrayGeometry = new Float32Array(2);//ORDER: mass,radius
		this.f32arrayGeometry[indexLoc.mass] = this.mass;
		this.f32arrayGeometry[indexLoc.radius] = this.radius;
	
		this.createPhysics();
	
	//DEFAULT call addGraphics to assign 'no assignment'.  call again on the actual obj to assign real graphics.
	this.addGraphics();
}
SphereObject.prototype =  Object.create(RigidBodyBase.prototype); 
SphereObject.prototype.constructor = SphereObject;



//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = {
	//export the constructors
	CubeObject:CubeObject, 
	SphereObject:SphereObject}; 

