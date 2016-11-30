
var physicsWorldManager = function (Ammo) {

	this.Ammo = Ammo;//Physics Engine
	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
	this.rigidBodiesIndex = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
	this.RigidBodyConstructor  = require(__dirname +'/rigidBodyConstructor.js');

	this.dispatcher; //Collision Manager
	this.physicsWorld;//WORLD
	this.init();
	
	//Fill arrays with defaults	
	this.cubeShapeCode = 0;
}	


physicsWorldManager.prototype.DefaultBlueprint_cube = function(replacments){
	
	var defaults = {
		w:2,
		h:2,
		d:2,
		mass:1,
		x:0,
		y:1,
		z:0,
		Rx:0,
		Ry:0,
		Rz:0,
		Rw:1,
		LVx:0,
		LVy:0,
		LVz:0,
		AVx:0,
		AVy:0,
		AVz:0,
		breakApartForce:0,
		shape:this.cubeShapeCode
	}

	//if there are replacement values replace/add them
	if(arguments.length > 0){
		var defaults  = Object.assign(defaults,replacments);
	}
	
	return defaults;
}


physicsWorldManager.prototype.createPhysicsForCube = function (blueprint){

	const CollisionMargin = 0.04;//just trust me you want this, research if you want to learn more
		
	/*set the position of our physics object using our reusable vector object*/
   //The 0.5 is because bullet uses half extents for boxShape: http://bulletphysics.org/Bullet/BulletFull/btBoxShape_8cpp_source.html
	//the full extents of the box will be twice the half extents, e. g. from -x to +x on the local x-axis.	
	this.vector3Aux1.setValue( blueprint.w*0.5, blueprint.h*0.5, blueprint.d*0.5 )
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	this.quaternionAux1.setValue(blueprint.Rx,blueprint.Ry,blueprint.Rz,blueprint.Rw);
		
	var physicsShape = new this.Ammo.btBoxShape(this.vector3Aux1);
	
	//set the collision margin
	physicsShape.setMargin(CollisionMargin);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	this.transformAux1.setIdentity();
	
	this.vector3Aux1.setValue(blueprint.x,blueprint.y,blueprint.z);
	
	this.transformAux1.setOrigin( this.vector3Aux1 );
    
	//setRotation() is for Orientation
	this.transformAux1.setRotation( this.quaternionAux1 );
	
	//set the motion state and inertiab of our object
	var motionState = new this.Ammo.btDefaultMotionState( this.transformAux );
	
	var localInertia = this.vector3Aux1.setValue(0,0,0);

	physicsShape.calculateLocalInertia(blueprint.mass, localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new this.Ammo.btRigidBodyConstructionInfo( blueprint.mass, motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new this.Ammo.btRigidBody( rbInfo );

	blueprint.physics = Cube;
	blueprint.id = Cube.ptr;
	
	//return our object which is now ready to be added to the world
	return blueprint;
}



physicsWorldManager.prototype.AddToRigidBodiesIndex = function(obj){
	
	//indicates if this object can break. If it can breakApartForce is the force required to break it in Newtons
	//if it's 0 it means object cant break
	if(typeof obj.breakApartForce === 'undefined'){obj.breakApartForce = 0};
	
	//master object organizer
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	this.rigidBodiesIndex[ID] = new this.RigidBodyConstructor(obj,(new this.Ammo.btTransform()),new this.Ammo.btVector3());
	
	//add to the actual physics simulations
	this.physicsWorld.addRigidBody( obj.physics );
	
	return obj;
}


physicsWorldManager.prototype.createCube = function (blueprint) {
	
	
	/*WARNING! 
		if createPhysicsForCube() is called without all args, the builder will use some defaults
		setting it up like this could cause errors
	    However, it's nice to have defaults and the flexibility to change one or all, i.e. situations where cube building is happening.
	*/

			
	//replace any required build props not supplied by blueprint with defaults 
	var buildProps = this.DefaultBlueprint_cube(blueprint);
		
	
	var block = this.AddToRigidBodiesIndex(this.createPhysicsForCube(buildProps));

	return block;
}



physicsWorldManager.prototype.AddToPhysicsWorld = function(cubeObjBlueprint){
	
		//build the object
		var cube = this.createPhysicsForCube(cubeObjBlueprint);

		//add to our index used to update clients about objects that have moved
		//IMPORTANT: AddToRigidBodiesIndex expects that cube.physics is an Ammo object. 
		this.AddToRigidBodiesIndex(cube);
		
		return cube;
}

physicsWorldManager.prototype.launchCube = function (data){
		//first 4 bytes will be headers
		//last 48 bytes will be data

/*
TODO:
this should use the setXYZArray functions
*/
		var headers   = new Uint8Array(4);
		headers[0] = this.fireBullet;
		headers[1] = 0//not assigned right now
		headers[2] = 0//not assigned right now
		headers[3] = 0//not assigned right now
		
		
		this.setDimensionsArray(.5,.5,.5);
		this.setPositionArray(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
		this.setOrientationArray(0,0,0,1);
		this.setLinearVelocityArray(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));		
		
		var binaryData   = new Float32Array(12);
		binaryData[0] = 0.5;//width
		binaryData[1] = 0.5;//height
		binaryData[2] = 0.5;//depth
		binaryData[3] = 10;//mass
		binaryData[4] = Math.random() * 0xffffff //RANDOM color
		binaryData[5] = data.readFloatLE(4);//x
		binaryData[6] = data.readFloatLE(8);//y
		binaryData[7] = data.readFloatLE(12);//z
		binaryData[8] = data.readFloatLE(16);//Linear Velocity x
		binaryData[9] = data.readFloatLE(20);//Linear Velocity y
		binaryData[10] = data.readFloatLE(24);//Linear Velocity z
		
		//array positions: w,h,d,mass,x,y,z,Rx,Ry,Rz,Rw
		/*
		TODO!!
		binaryData should be a standard format to send to AddToPhysicsWOrld so dont need two arrays
		*/
		var cubeObjBlueprint = [binaryData[0],binaryData[1],binaryData[2],binaryData[3],binaryData[5],binaryData[6],binaryData[7],0,0,0,1]
		
		//build the object
		/*TODO: Dont use AddToPhysicsWorld, deprecated function */
		var cube = this.AddToPhysicsWorld(cubeObjBlueprint);
		
		
		binaryData[11] = cube.physics.ptr;//the NUMBER portion of ptr ID
		
		//create a vector to apply shot force to our bullet
		this.vector3Aux1.setValue(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));
		
		//apply the movement force of the shot
		cube.physics.applyCentralImpulse(this.vector3Aux1);

		//keep the cube always active		
		cube.physics.setActivationState(4);


		//prepare binary data for shipping
		var dataBuffer = Buffer.from(binaryData.buffer)
		var headersBuffer = Buffer.from(headers.buffer);
		//console.log(dataBuffer.byteLength)
		//console.log(headers.byteLength);
		
		var binaryShot = Buffer.concat([headersBuffer,dataBuffer],(dataBuffer.byteLength+headers.byteLength));
		//console.log(ship.byteLength)
		
		//remove shot from world in 5000 mili seconds	
		this.delayedDestruction(cube.id,5000)
		
		//used to add shot to worlds of players
		return binaryShot;
		
}

physicsWorldManager.prototype.init = function (data){
	/*Private Variables*/
	const gravityConstant = -9.6;
	const broadphase = new this.Ammo.btDbvtBroadphase();//BROAD
	const collisionConfiguration = new this.Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	const solver = new this.Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	const softBodySolver = new this.Ammo.btDefaultSoftBodySolver();//SOLVER
	
	
	/*Public Variables*/
	//dispatcher is used to determine what objects are in collision
	this.dispatcher = new this.Ammo.btCollisionDispatcher( collisionConfiguration );//DISPATCHER
	
	//our World
	this.physicsWorld = new this.Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
				
	//note setGravity accepts (x,y,z), you could set gravitationl force in x or z too if you wanted.	
	this.vector3Aux1.setValue( 0, gravityConstant, 0 )	
	this.physicsWorld.setGravity( this.vector3Aux1 );
}


//IMPORTANT! tells node.js what you'd like to export from this file. 
//module.exports = physicsWorldManager; //constructor

// Export a convenience function that creates an instance
module.exports = function(Ammo) {
  return new physicsWorldManager(Ammo);//Instance
}
