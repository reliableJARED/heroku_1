
var physicsWorldManager = function (Ammo) {

	this.Ammo = Ammo;//Physics Engine
	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
	this.rigidBodiesIndex = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
	this.RigidBodyConstructor  = require(__dirname +'/rigidBodyConstructor.js');

	/*Universal Arrays Used for Objects*/
	this.ObjectIDArray = new Int32Array(1);	
	this.ObjectID = 0;
	
	//position array index keys
	this.PositionArray = new Float32Array(3);
	this.posX = 0;
	this.posY = 1;
	this.posZ = 2;
	
	//orientation array index keys
	this.OrientationArray = new Float32Array(4);
	this.QuatX = 0;
	this.QuatY = 1;
	this.QuatZ = 2;
	this.QuatW = 3;
	
	//linear velocity array index keys
	this.LinearVelocityArray = new Float32Array(3);
	this.LVx = 0;
	this.LVy = 1;
	this.LVz = 2;
	
	//angular velocity array index keys
	this.AngularVelocityArray = new Float32Array(3);
	this.AVx = 0;
	this.AVy = 1;
	this.AVz = 2;

	//dimensions array index keys
	this.DimensionsArray = new Float32Array(3);
	this.width = 0;
	this.height = 1;
	this.depth = 2;

	//properties array index keys
	this.PropertiesArray = new Float32Array();
	this.mass = 0;
	this.shape = 1;
	this.blockBreakApartForce = 2;
	
	this.dispatcher; //Collision Manager
	this.physicsWorld;//WORLD
	this.init();
	
	//Fill arrays with defaults	
	this.setArrays_EnvironmentBlock();
}	

physicsWorldManager.prototype.createPhysicsForCube = function (blueprint){

		/*if called without all args, builder will use instances arrays
		WARNING! setting it up like this could very easily cause errors
		if the instance arrays are used when not intended.  However, it's nice to have
		the flexibility to change one or all, i.e. situations where cube building is happening.
		warning console.log will be used just encase */
		if (arguments.length <  11)console.log("FYI:A cube was built using some physicsWorldManager defaults")

		var   width = blueprint.w || 2;
		var	height = blueprint.h || 2;
		var	depth = blueprint.d || 2;
		var	mass = blueprint.mass || 1;
		var	x = blueprint.x || 0;
		var	y = blueprint.y || 1;
		var	z = blueprint.z || 0;
		var	Rx = blueprint.Rx || 0;
		var	Ry = blueprint.Ry || 0;
		var	Rz = blueprint.Rz || 0;
		var	Rw = blueprint.Rw || 1;

		const CollisionMargin = 0.04;//just trust me you want this, research if you want to learn more
		
	/*set the position of our physics object using our reusable vector object*/
   //the 0.5 is because bullet uses half extents for boxShape: http://bulletphysics.org/Bullet/BulletFull/btBoxShape_8cpp_source.html
	//the full extents of the box will be twice the half extents, e. g. from -x to +x on the local x-axis.	
	this.vector3Aux1.setValue( width*0.5, height*0.5, depth*0.5 )
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	this.quaternionAux1.setValue(Rx,Ry,Rz,Rw);
		
	var physicsShape = new this.Ammo.btBoxShape(this.vector3Aux1);
	
	//set the collision margin
	physicsShape.setMargin(CollisionMargin);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	this.transformAux1.setIdentity();
	
	this.vector3Aux1.setValue(x,y,z);
	
	this.transformAux1.setOrigin( this.vector3Aux1 );
    
	//setRotation() is for Orientation
	this.transformAux1.setRotation( this.quaternionAux1 );
	
	//set the motion state and inertiab of our object
	var motionState = new this.Ammo.btDefaultMotionState( this.transformAux );
	
	var localInertia = this.vector3Aux1.setValue(0,0,0);

	physicsShape.calculateLocalInertia(mass, localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new this.Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new this.Ammo.btRigidBody( rbInfo );

	//return our object which is now ready to be added to the world
	return {physics:Cube,id:Cube.ptr};
}

physicsWorldManager.prototype.prepArraysAsRigidBodyArgObj = function (obj) {
		//obj should already have props "physics" and 'id'
		if(!obj.physics){console.log("no property: physics"); return false};
		if(!obj.id){console.log("no property: id"); return false};
		
		var ID; 
		if(typeof obj.id !== 'number'){ID = parseInt(obj.id,10)}
		else{ID = obj.id;}
		this.ObjectIDArray[this.ObjectID] = ID;
	  
	   obj.w =  this.DimensionsArray[this.width];
		obj.h =   this.DimensionsArray[this.height];
		obj.d =   this.DimensionsArray[this.depth];
		obj.mass =  this.PropertiesArray[this.mass];
		obj.shape = this.PropertiesArray[this.shape];
		obj.breakApartForce = this.PropertiesArray[this.blockBreakApartForce];
	
		return obj;
};

physicsWorldManager.prototype.AddToRigidBodiesIndex = function(obj){
	
	//indicates if this object can break. If it can breakApartForce is the force required to break it in Newtons
	//if it's 0 it means object cant break
	if(typeof obj.breakApartForce === 'undefined'){obj.breakApartForce = 0};
	
	//master object organizer
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	this.rigidBodiesIndex[ID] = new this.RigidBodyConstructor(obj,new this.Ammo.btTransform());
	
	//add to the actual physics simulations
	this.physicsWorld.addRigidBody( obj.physics );
	
	return obj;
}

/*
REMOVE ALL TRACE OF THE GLOBAL ARRAYs
	this is a failed concept.  The physicsWorldManager should do what name says.
	create and manage a physics world
	need to add or remove objects
	manage collisions and flag objects that collide
	
	DONT"T need to adjust physics of each object, like speed or rotation objects can do that to themselves
	
*/


physicsWorldManager.prototype.createEnvironmentBlock = function () {

	var block = this.AddToRigidBodiesIndex(this.prepArraysAsRigidBodyArgObj(this.createPhysicsForCube()));

	return block;
}


physicsWorldManager.prototype.createCubeTower = function (towerHeight,towerWidth,towerDepth,texture_index){
	
	//create random location for our tower, near other blocks
	var randX =  Math.floor(Math.random() * 300) - 100;
	var randZ =  Math.floor(Math.random() * 300) - 100;
	var randY = 1;//...start at ground level, 'rand' left for convention
	
	
	this.vector3Aux1.setValue(randX,randY,randZ)
	var pos = this.vector3Aux1;

	this.setArrays_EnvironmentBlock();//set defaults
	var block;
	
	
	this.PropertiesArray[this.blockTexture] = texture_index;
	
	//three nested loops will create the tower
	//inner loop lays blocks in a row
	//mid loop starts a new column
	//outer loop starts next layer one level up 
	for (var h=1;h<=towerHeight;h++) {
		
		for (var w=0;w<towerWidth;w++) {
		
			for(var d =0; d<towerDepth;d++){

					this.setPositionArray(pos.x(),pos.y(),pos.z());
						
					this.createEnvironmentBlock();//this uses instance arrays

					//add to pos, used in the placement for our next block being created	
					pos.setX(randX+this.DimensionsArray[this.width]) //+X dimention
			}

			//Start our new row shifted over depth of our object
			pos.setX(randX);
			pos.setZ(randZ+this.DimensionsArray[this.depth]);//+Z dimention;

		}
		//reset our Z axis
		//start the new grid up one level
		//reset for next column
		pos.setX(randX);
		pos.setZ(randZ);//+Z dimention;
			
		//Start our new layer by moving up the height of our cubes
		pos.setY(this.DimensionsArray[this.height]*h);
	}
};


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
