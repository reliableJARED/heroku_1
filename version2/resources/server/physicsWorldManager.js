
var physicsWorldManager = function (Ammo) {
	
	this.Ammo = Ammo;

	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
	this.broadphase = new this.Ammo.btDbvtBroadphase();//BROAD
	this.collisionConfiguration = new this.Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	this.dispatcher = new ths.Ammo.btCollisionDispatcher( this.collisionConfiguration );//DISPATCHER
	this.solver = new this.Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	this.softBodySolver = new this.Ammo.btDefaultSoftBodySolver();//SOLVER
	this.gravityConstant = -9.6;
	this.world;
	this.init();
		
		
}	

physicsWorldManager.prototype.createPhysicalCube = function (blueprint){
	
	var mass =  blueprint.mass;
	
	/*set the position of our physics object using our reusable vector object*/

	this.vector3Aux1.setValue( blueprint.w * 0.5, blueprint.h * 0.5, blueprint.d * 0.5 )
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	this.quaternionAux1.setEulerZYX(blueprint.Rz,blueprint.Ry,blueprint.Rx);
		
	var physicsShape = new this.Ammo.btBoxShape(this.vector3Aux1);
	
	//set the collision margin, don't use zero, default is typically 0.04
	physicsShape.setMargin(0.04);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	this.transformAux1.setIdentity();
	
	this.vector3Aux1.setValue(blueprint.x,blueprint.y,blueprint.z);
	
	this.transformAux1.setOrigin( this.vector3Aux1 );
    
	//setRotation() is for Orientation
	this.transformAux1.setRotation( this.quaternionAux1 );
	
	//set the motion state and inertia of our object
	var motionState = new this.Ammo.btDefaultMotionState( this.transformAux );
	
	var localInertia = this.vector3Aux1.setValue(0,0,0);

	physicsShape.calculateLocalInertia( blueprint.mass, localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new this.Ammo.btRigidBodyConstructionInfo( blueprint.mass, motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new this.Ammo.btRigidBody( rbInfo );
	
	//clean up our blueprint to be returned as the final object
	delete blueprint.x;
	delete blueprint.y;
	delete blueprint.z;
	delete blueprint.Rx;
	delete blueprint.Ry;
	delete blueprint.Rz;
	
	//add new prop holding our object
	blueprint.physics = Cube;
	
	//assign the objects uniqueID
	blueprint.id = 'id'+Cube.ptr.toString();
	//blueprint.id = Cube.ptr;

	//return our object which is now ready to be added to the world
	return blueprint;
}

}

physicsWorldManager.prototype.launchCube = function (data){
		//first 4 bytes will be headers
		//last 48 bytes will be data

		var headers   = new Uint8Array(4);
		headers[0] = this.fireBullet;
		headers[1] = 0//not assigned right now
		headers[2] = 0//not assigned right now
		headers[3] = 0//not assigned right now
		
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
		
		
		var cubeObjBlueprint = {
			w : binaryData[0],
			h : binaryData[1],
			d : binaryData[2],
			mass : binaryData[3],
			x: binaryData[5],
			y: binaryData[6],
			z: binaryData[7],
			Rx: binaryData[8],
			Ry: binaryData[9],
			Rz: binaryData[10]
		}
		
		//build the object
		var cube = this.createPhysicalCube(cubeObjBlueprint);
		binaryData[11] = cube.physics.ptr;//the NUMBER portion of ptr ID
		
		//create a vector to apply shot force to our bullet
		this.vector3Aux1.setValue(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));
		
		//apply the movement force of the shot
		cube.physics.applyCentralImpulse(this.vector3Aux1);

		//keep the cube always active		
		cube.physics.setActivationState(4);

		//add to physics world
		this.physicsWorld.addRigidBody( cube.physics );
		
		//add to our index used to update clients about objects that have moved
		/*IMPORTANT: AddToRigidBodiesIndex expects that obj.physics is an Ammo object.  NOT the values sent used in the blueprint to build the object*/
		this.AddToRigidBodiesIndex(cube);

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



physicsWorldManager.prototype.init = function() {

		/*apply our selected components to the world*/
		//WORLD
		this.world = new this.Ammo.btSoftRigidDynamicsWorld( this.dispatcher, this.broadphase, this.solver, this.collisionConfiguration, this.softBodySolver);
				
		//note setGravity accepts (x,y,z), you could set gravitationl force in x or z too if you wanted.	
		this.vector3Aux1.setValue( 0, gravityConstant, 0 )	
		this.world.setGravity( this.vector3Aux1 );

};



//IMPORTANT! tells node.js what you'd like to export from this file. 
//module.exports = physicsWorldManager;

// Export a convenience function that creates an instance
module.exports = function(Ammo) {
  return new physicsWorldManager(Ammo);
}
