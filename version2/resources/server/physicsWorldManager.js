
var physicsWorldManager = function (Ammo) {

	this.Ammo = Ammo;//Physics Engine
	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
	this.gravityConstant = -9.6;
	this.rigidBodiesIndex = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
	this.RigidBodyConstructor  = require(__dirname +'/rigidBodyConstructor.js');

	
	this.dispatcher; //Collision Manager
	this.physicsWorld;//WORLD
	this.init();
}	

physicsWorldManager.prototype.createPhysicalCube = function (blueprint){
			/*
		TODO!!
		this function should accept a standard format array used in binary.  which may have more points like color, which would just be ignored
		*/
		/*		
		blueprint Array index key:
		*/
		const	w = 0;
		const	h = 1;
		const	d = 2;
		const	m = 3;//mass
		const	x = 4;
		const	y = 5;
		const	z = 6;
		const	Rx = 7;
		const	Ry = 8;
		const	Rz = 9;
		const	Rw = 10;

	
	var mass =  blueprint[m];
	
	/*set the position of our physics object using our reusable vector object*/

	this.vector3Aux1.setValue( blueprint[w] * 0.5, blueprint[h] * 0.5, blueprint[d]* 0.5 )
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	this.quaternionAux1.setValue(blueprint[Rx],blueprint[Ry],blueprint[Rz],blueprint[Rw]);
		
	var physicsShape = new this.Ammo.btBoxShape(this.vector3Aux1);
	
	//set the collision margin, don't use zero, default is typically 0.04
	physicsShape.setMargin(0.04);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	this.transformAux1.setIdentity();
	
	this.vector3Aux1.setValue(blueprint[x],blueprint[y],blueprint[z]);
	
	this.transformAux1.setOrigin( this.vector3Aux1 );
    
	//setRotation() is for Orientation
	this.transformAux1.setRotation( this.quaternionAux1 );
	
	//set the motion state and inertia of our object
	var motionState = new this.Ammo.btDefaultMotionState( this.transformAux );
	
	var localInertia = this.vector3Aux1.setValue(0,0,0);

	physicsShape.calculateLocalInertia( blueprint[m], localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new this.Ammo.btRigidBodyConstructionInfo( blueprint[m], motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new this.Ammo.btRigidBody( rbInfo );

	
	//assign the objects uniqueID
	var id = 'id'+Cube.ptr.toString();
	//blueprint.id = Cube.ptr;

	//return our object which is now ready to be added to the world
	return {physics:Cube,id:id};
}


physicsWorldManager.prototype.createCubeTower = function (tex_index,height,width,depth){
	
	//defaults if no args passed for the TOWER, not the blocks
	var height = height || 10;
	var width = width || 2;
	var depth = depth || 2;
	
	//create random location for our tower, near other blocks
	var randX =  Math.floor(Math.random() * 300) - 100;
	var randZ =  Math.floor(Math.random() * 300) - 100;
	var randY = 1;//...not random
	
	this.vector3.setValue(randX,randY,randZ)
	var pos = this.vector3;

	var blockMass = 1; //zero mass makes objects static.  Objects can hit them but they dont move or fall 
	var blockW = 2;
	var blockH = 2;
	var blockD = 2;
	var blockShape = 0;//box =0
	var blockColor = 0xededed;//light gray, rubble will be based on this color
	var blockTexture = this.texture_files_index[tex_index];
	var blockBreakApartForce = 5 ;//DONT HARD CODE THIS
	
		
	//three nested loops will create the tower
	//inner loop lays blocks in a row
	//mid loop starts a new column
	//outer loop starts next new layer up 
	/*IMPORTANT: the number 2 is hard coded because CreateCube() creates 2x2x2 cubes.  bad form... but be aware!*/
	for (var h=1;h<=height;h++) {
		
		for (var w=0;w<width;w++) {
		
			for(var d =0; d<depth;d++){

				var block = this.createPhysicalCube({
						mass : blockMass, 
						w : blockW,
						h : blockH,
						d : blockD,
						shape:blockShape,
						color: blockColor,
						texture:blockTexture,
						x: pos.x(),
						y: pos.y(),
						z: pos.z(),
						Rx: 0,
						Ry: 0,
						Rz: 0,
						breakApartForce: blockBreakApartForce
					});
					
				// block.physics.setActivationState(1);

				this.physicsWorld.addRigidBody( block.physics );
				
				this.AddToRigidBodiesIndex(block);

				//add to pos, used in the placement for our next block being created	
				pos.setX(randX+blockW) //+X dimention
			}

			//Start our new row shifted over depth of our object
			pos.setX(randX);
			pos.setZ(randZ+blockD);//+Z dimention;

		}
		//reset our Z axis
		//start the new grid up one level
		//reset for next column
		pos.setX(randX);
		pos.setZ(randZ);//+Z dimention;
			
		//Start our new layer by moving up the height of our cubes
		pos.setY(blockH*h);

	}
};


physicsWorldManager.prototype.AddToRigidBodiesIndex = function(obj){
	/*used for binary exporting world*/
	const BYTE_COUNT_INT32 = 5;//id,w,h,d,mass,
	const BYTE_COUNT_INT8  = 3;//texture,shape,player
	const BYTE_COUNT_F32 = 8;//color,x,y,z,Rx,Ry,Rz,Rw

	//indicates if the object is a players cube
	if(typeof obj.player === 'undefined'){obj.player = 0};

	//indicates if this object can break, if it can - force requied to break it in Newtons
	if(typeof obj.breakApartForce === 'undefined'){obj.breakApartForce = 0};

	this.rigidBodiesIndex[obj.id] = new this.RigidBodyConstructor(obj,BYTE_COUNT_INT32,BYTE_COUNT_INT8,BYTE_COUNT_F32);

}

physicsWorldManager.prototype.AddToPhysicsWorld = function(cubeObjBlueprint){
	
		//build the object
		var cube = this.createPhysicalCube(cubeObjBlueprint);
		
		//add to physics world
		this.physicsWorld.addRigidBody( cube.physics );
		
		//add to our index used to update clients about objects that have moved
		//IMPORTANT: AddToRigidBodiesIndex expects that obj.physics is an Ammo object.  NOT the values sent used in the blueprint to build the object
		this.AddToRigidBodiesIndex(cube);
		
		return cube;
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
		
		//array positions: w,h,d,mass,x,y,z,Rx,Ry,Rz,Rw
		/*
		TODO!!
		binaryData should be a standard format to send to AddToPhysicsWOrld so dont need two arrays
		*/
		var cubeObjBlueprint = [binaryData[0],binaryData[1],binaryData[2],binaryData[3],binaryData[5],binaryData[6],binaryData[7],0,0,0,1]
		
		//build the object
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
	var broadphase = new this.Ammo.btDbvtBroadphase();//BROAD
	var collisionConfiguration = new this.Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	var solver = new this.Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	var softBodySolver = new this.Ammo.btDefaultSoftBodySolver();//SOLVER
	
	
	/*Public Variables*/
	//dispatcher is used to determine what objects are in collision
	this.dispatcher = new this.Ammo.btCollisionDispatcher( collisionConfiguration );//DISPATCHER
	
	//our World
	this.physicsWorld = new this.Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
				
	//note setGravity accepts (x,y,z), you could set gravitationl force in x or z too if you wanted.	
	this.vector3Aux1.setValue( 0, this.gravityConstant, 0 )	
	this.physicsWorld.setGravity( this.vector3Aux1 );
}


//IMPORTANT! tells node.js what you'd like to export from this file. 
//module.exports = physicsWorldManager;

// Export a convenience function that creates an instance
module.exports = function(Ammo) {
  return new physicsWorldManager(Ammo);
}
