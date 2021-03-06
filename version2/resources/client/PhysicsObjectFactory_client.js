
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
	
	console.log('*******ERROR**********************There is no instance of \'Ammo\'.  Please import ammo.js first before using PhysicsObjectFactory_client****************************');
}
/*
module.exports = {
	//export the constructors
	CubeObject:CubeObject, 
	SphereObject:SphereObject
	MakePhysicsObject:MakePhysicsObject}; 
*/

var objectPhysicsManipulationSuite = function () {
			this.physics;			
};

objectPhysicsManipulationSuite.prototype = {
	
		//consider making physics_indexLocations an external CONST to avoid constant lookups
		//this obj is accessed very often
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
			
			var indexLoc = this.physics_indexLocations();
			
			var array = new Float32Array(14);
			
			array[indexLoc.id] = this.id;
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
			
			return array;
			
		},
		BinaryImport_physics:function(array) {
			//reverse of the Export function, imports a float array of props to apply to an object
			var indexLoc = this.physics_indexLocations();
			var objPhys = this.physics;
			var trans = this.transform;
			var vect = this.vector3;
			var quat = this.quaternion;

			//Consider doing an ID vs. ID check? or slow things down and not worth results?
		  // if(this.id	!== array[indexLoc.id])/*do something*/

			//Apply world position/rotation
			vect.setValue(array[indexLoc.x],array[indexLoc.y],array[indexLoc.z]);
			quat.setValue(array[indexLoc.Rx],array[indexLoc.Ry],array[indexLoc.Rz],array[indexLoc.Rw]);
			trans.setOrigin(vect);			
			trans.getRotation(quat);
			//objPhys.setWorldTransform(trans); DOESNT CHANGE MOTION STATE
			//objPhys.getMotionState().setWorldTransform(trans);  DOESNT CHANGE MOTION STATE
			
			//Change motionState
			var ms = objPhys.getMotionState()
			ms.setWorldTransform(trans);
			objPhys.setMotionState(ms)
			
			//CONSIDER:
			/*Is this more correct/efficient ? 
			For changing world position use a recycle motionstate, set motionstate to new
			mostionstate.setWorldTransform(transform)
			then pass in to physics with objPhys.setMotionState(motionstate);
			*/
			
			//Apply linear velocity
		   vect.setValue(array[indexLoc.LVx],array[indexLoc.LVy],array[indexLoc.LVz]);
			objPhys.setLinearVelocity(vect);
			
			//Apply angular velocity
			vect.setValue(array[indexLoc.AVx],array[indexLoc.AVy],array[indexLoc.AVz]);
			objPhys.setAngularVelocity(vect);
		
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
var RigidBodyBase = function(blueprint){
		
		objectPhysicsManipulationSuite.call(this);
		var index = this.physics_indexLocations();
		
		this.id = blueprint.physics[index.id];
		
		this.x = blueprint.physics[index.x];
		this.y = blueprint.physics[index.y];
		this.z = blueprint.physics[index.z];
		this.Rx = blueprint.physics[index.Rx];
		this.Ry = blueprint.physics[index.Ry];
		this.Rz = blueprint.physics[index.Rz];
		this.Rw = blueprint.physics[index.Rw];
		this.LVx = blueprint.physics[index.LVx];
		this.LVy = blueprint.physics[index.LVy];
		this.LVz = blueprint.physics[index.LVz];
		this.AVx = blueprint.physics[index.AVx];
		this.AVy = blueprint.physics[index.AVy];
		this.AVz = blueprint.physics[index.AVz];
		
		//IMPORTANT: mass is in geometry branch, not physics

		
		this.graphics = {};//if obj has associated graphics they will be placed here
		
		//TODO: Should callback() be added to RigidBodyBase?
		//concept would be to assign a callback that execpts for example an object ID of an object
		//that was in collision with this object.
		//so for a player the callback would be able to process the collision with a powerup or other obj
		//sticking a blank function will help prevent errors when called for objects that don't use
		this.callbackCollision = function(){null};
};
RigidBodyBase.prototype =  Object.create(objectPhysicsManipulationSuite.prototype); 
RigidBodyBase.prototype.constructor = RigidBodyBase;

//RECYCLE UTILS
RigidBodyBase.prototype.transform = new Ammo.btTransform();
RigidBodyBase.prototype.vector3 = new Ammo.btVector3();
RigidBodyBase.prototype.quaternion = new Ammo.btQuaternion();
RigidBodyBase.prototype.motionState = new Ammo.btDefaultMotionState( this.transform );


RigidBodyBase.prototype.createPhysics = function (){
		
			var physicsShape;
			var shapeCodes = this.ShapeIDCodes();

			//TODO: add more shape specific codes
			
			switch (this.shape){
				case shapeCodes.cube:
					this.vector3.setValue( this.geometry.width*0.5, this.geometry.height*0.5, this.geometry.depth*0.5 );
					physicsShape = new Ammo.btBoxShape(this.vector3);
					break;
				case shapeCodes.sphere:
					physicsShape = new Ammo.btSphereShape(this.geometry.radius);
					break;

				//TODO: ADD MORE SHAPES>>>
				
				default: console.log('ERROR: this.shape either not defined or not a value of a known shape code from ShapeIDCodes()');
			}
			
			const CollisionMargin = 0.04;//just trust me you want this, research if you want to learn more
			physicsShape.setMargin(CollisionMargin);
			
			
			//clear transform
			this.transform.setIdentity();
			//set position vector
			this.vector3.setValue(this.x,this.y,this.z);
			this.transform.setOrigin( this.vector3 );
			//set rotation quaternion
			this.quaternion.setValue(this.Rx,this.Ry,this.Rz,this.Rw);
			this.transform.setRotation( this.quaternion );

			var motionState = new Ammo.btDefaultMotionState( this.transform );
			
			//reset
			this.vector3.setValue(0,0,0);
			var localInertia = this.vector3;

			physicsShape.calculateLocalInertia( this.geometry.mass, localInertia );

			var rbInfo = new Ammo.btRigidBodyConstructionInfo( this.geometry.mass, motionState, physicsShape, localInertia );
			
			//Assign FINAL OBJECT
			this.physics = new Ammo.btRigidBody( rbInfo );			
			
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

RigidBodyBase.prototype.geometry_indexLocations = function(shape){
	
	var shapeCodes = this.ShapeIDCodes();
	
	switch(shape){
		
		case shapeCodes.cube: return{mass:0,width:1,height:2,depth:3}
		break;
		
		case shapeCodes.sphere: return{mass:0,radius:1}
		break;
		
		default: console.log("unknown shape arg in RigidBodyBase.prototype.geometry_indexLocations()")
	}
		
};

RigidBodyBase.prototype.ShapeIDCodes = function(){

		return {
					cube:0,
					sphere:1
				}
	};	
			
//*************




//this needs to be linked to an instance of a physics world manager
RigidBodyBase.prototype.physicsWorldManager = false;
//this needs to be linked to an instance of a graphics world manager
RigidBodyBase.prototype.graphicsWorldManager = false;




RigidBodyBase.prototype.addGraphics = function(blueprint){
	//GOOD SPHERE EXAMPLE
	//http://learningthreejs.com/blog/2013/09/16/how-to-make-the-earth-in-webgl/
	
	//blueprint has props: shape,material, colors, textures
	//add the shapes geometry to the blueprint
	blueprint.geometry = this.geometry;
	//add the objects ID
	blueprint.id = this.id;
	
	//now get a graphic
	this.graphics = this.graphicsWorldManager.createGraphics(blueprint); 
	
	//now position the graphic where the physics are
	this.graphics.position.set(this.x(), this.y(), this.z() );
	this.graphics.quaternion.set(this.Rx(), this.Ry(), this.Rz(),this.Rw() );
}



//*************
//CUBE
var CubeConstructorBase = function(blueprint){
		
		RigidBodyBase.call(this,blueprint);
		
		this.shape = blueprint.shape;
		
		var indexLoc  = this.geometry_indexLocations(this.shape);
		
		this.geometry = {};
		
		this.geometry.width = blueprint.geometry[indexLoc.width];
		this.geometry.height = blueprint.geometry[indexLoc.height];
		this.geometry.depth = blueprint.geometry[indexLoc.depth];
		this.geometry.mass = blueprint.geometry[indexLoc.mass];

}
//CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype.constructor = CubeConstructorBase;
		
		
//SPHERE
var SphereConstructorBase = function(blueprint){
		RigidBodyBase.call(this,blueprint);
		
		this.shape = blueprint.shape;
		
		var indexLoc  = this.geometry_indexLocations(this.shape);
		
		this.geometry = {};
		
		this.geometry.radius = blueprint.geometry[indexLoc.radius];
		this.geometry.mass = blueprint.geometry[indexLoc.mass];

}
SphereConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
SphereConstructorBase.prototype.constructor = SphereConstructorBase;

/********************************************/

var CubeObject = function(blueprint){
	//console.log('buildBlueprint',blueprint)
	CubeConstructorBase.call(this,blueprint);
	this.createPhysics();
	//if(this.mass>0)this.physics.forceActivationState(1);
}
CubeObject.prototype =  Object.create(CubeConstructorBase.prototype); 
CubeObject.prototype.constructor = CubeObject;


var SphereObject = function(blueprint){
	//console.log('buildBlueprint',blueprint)
	SphereConstructorBase.call(this,blueprint);
	this.createPhysics();
	
}
SphereObject.prototype =  Object.create(SphereConstructorBase.prototype); 
SphereObject.prototype.constructor = SphereObject;

var PlayerObject = function(blueprint){
	
	CubeConstructorBase.call(this,blueprint);
	this.createPhysics();
	//DEFAULT call addGraphics to assign 'no assignment'.  call again on the actual obj to assign real graphics.
	this.addGraphics();
	
	var defaults = {
		health:100,
		bullets:10
	};	  
		
	//over write defaults if any build params sent
	blueprint = Object.assign(defaults,blueprint);
	
	this.attributes = {
		health: blueprint.health,
		bullets: blueprint.bullets		
		};
	this.attribute_indexLocations = {
		health: 0,
		bullets: 1		
		};
}
PlayerObject.prototype =  Object.create(CubeConstructorBase.prototype); 
PlayerObject.prototype.constructor = PlayerObject;
PlayerObject.prototype.BinaryExport_attributes = function () {
	
		var indexLoc = this.attribute_indexLocations;
		var attributes =  this.attributes;
		
		var int8attributes = new Int8Array(2);//ORDER: health,bullets	
		int8attributes[indexLoc.health] = attributes.health;
		int8attributes[indexLoc.bullets] = attributes.bullets;
		
		return Buffer.from(int8attributes.buffer);
	
}

