
var app = require('express')();

//https://www.npmjs.com/package/ammo-node
const Ammo = require('ammo-node');//physics

//Express initializes app to be a function handler that you can supply to an HTTP server
var http = require('http').Server(app);

//A server that integrates with (or mounts on) the Node.JS HTTP Server: socket.io
var io = require('socket.io')(http);

var port = process.env.PORT || 5000; 

//var ip = '192.168.1.100'
//var ip = '192.168.1.102'
//var ip = '10.10.10.100'


//required for serving locally when testing
var serveStatic = require('serve-static');
app.use(serveStatic(__dirname+'/'));
app.use(serveStatic(__dirname + '/static/images/'));
app.use(serveStatic(__dirname + '/static/images/textures'));
app.use(serveStatic(__dirname + '/static/three.js/build/'));

//GLOBAL variables
var physicsWorld; 
const gravityConstant = -9.8
var rigidBodies =  new Array();
var rigidBodiesIndex = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
var clock;									//info that is only needed when a newly connected player first builds the world
const updateFrequency = .5;//Seconds	
const PROPERTY_PER_OBJECT = 14; //IMPORTANT PROPERTY!!! change if number of object properties sent with updates changes.  ie. linear velocity
var TEXTURE_FILES_INDEX = {
	ground:0,
	SnowBlock:1,
	playerFace:2,
	envXneg:3,
	envXpos:4,
	envYneg:5,
	envYpos:6};
var TEXTURE_FILES =[
	'snow.png',
	'snow_small.png',
	'playerFace.png',
	'snow_mountain_xneg.png',
	'snow_mountain_xpos.png',
	'snow_mountain_yneg.png',
	'snow_mountain_ypos.png'];
					
GameClock = function () {
	this.startTime = Date.now();
	this.oldTime = Date.now();
	this.timeToSendUpdate = false;
};


GameClock.prototype.getDelta = function () {
	var delta = 0;
	var newTime = Date.now();
	//convert from mili seconds to secons 
	delta = 0.001 * ( newTime - this.oldTime );
	this.oldTime = newTime;
	this.timeToSendUpdate += delta;
	return delta;
};

GameClock.prototype.start = function () {
	this.startTime = Date.now();
	this.oldTime = Date.now();
};
GameClock.prototype.UpdateTime = function () {
	//Change frequence of updates here
	var update = Boolean(this.timeToSendUpdate > updateFrequency);	
	if(update)this.timeToSendUpdate = 0;
	return update;
}
									
var PlayerIndex = new Object();//matches a player's ID to their rigidBodiesIndex object
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var transformAux1 = new Ammo.btTransform();//reusable transform object
var PhysicsSimStarted = false;
var vector3Aux1 = new Ammo.btVector3(); //reusable vector object
var quaternionAux1 = new Ammo.btQuaternion(); //reusable quaternion object

//coding for player inputs
const	    applyCentralImpulse = 1;         
const		applyTorqueImpulse = 2;       
const		applyTorque = 4;       
const		applyCentralForce = 8;   
const 		changeALLvelocity = 16;		
const 		changeLinearVelocity = 32;		
const 		changeAngularVelocity = 64;		
const       fireBullet = 128;
	
function initPhysics() {
	
		clock = new GameClock(); 

		//BROAD
		broadphase = new Ammo.btDbvtBroadphase();
		
		/* NOTE! btSoftBodyRigidBodyCollisionConfiguration() not in ammo that came with nodejs-physijs npm */;
		//NARROW
		collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;
		
		//DISPATCHER
		dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		
		//SOLVER(s)
		solver = new Ammo.btSequentialImpulseConstraintSolver();	
		
		softBodySolver = new Ammo.btDefaultSoftBodySolver();
		
		/*apply our selected components to the world*/
		//WORLD
		physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
				
		//note setGravity accepts (x,y,z), you could set gravitationl force in x or z too if you wanted.		
		physicsWorld.setGravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );

};


function createObjects() {
		
		/*************CREATE GROUND  *********/ 
		var groundObjBlueprint = {
			mass : 0, //zero mass makes objects static.  Objects can hit them but they dont move or fall 
			w : 2000,
			h : 1,
			d : 2000,
			shape:0,//box =0
			color: 0xffffff,
			texture:TEXTURE_FILES_INDEX.ground,
			x: 0,
			y: 0,
			z: 0,
			Rx: 0,
			Ry: 0,
			Rz: 0
		}
		

		//build the object
		var ground = createPhysicalCube(groundObjBlueprint);

		//add ground our physics object holder
		rigidBodies.push( ground.physics );
		
		//add ground to physics world
		physicsWorld.addRigidBody( ground.physics );
		
		//add ground to our index used to update clients about objects that have moved
		/*IMPORTANT: AddToRigidBodiesIndex expects that obj.physics is an Ammo object.  NOT the values sent used in the blueprint to build the object*/
		AddToRigidBodiesIndex(ground);
		
		//create a tower
		for (var i = 0; i<10; i++) {
			createCubeTower();
		}
}


function createCubeTower(height,width,depth){
	/*TODO:
	set mass to 0 and you'll see the logic is WRONG
	FIX IT
	
	*/
	//defaults if no args passed for the TOWER, not the blocks
	var height = height || 10;
	var width = width || 2;
	var depth = depth || 2;
	
	//create random location for our tower, near other blocks
	var randX =  Math.floor(Math.random() * 200);
	var randZ =  Math.floor(Math.random() * 200) - 100;
	
	var pos =  new Ammo.btVector3(randX,1,randZ);
	
	var ObjBlueprint = {
			mass : 1, //zero mass makes objects static.  Objects can hit them but they dont move or fall 
			w : 2,
			h : 2,
			d : 2,
			shape:0,//box =0
			color: Math.random() * 0x0000ff, //random blues
			texture:TEXTURE_FILES_INDEX.SnowBlock,
			x: 0,
			y: 0,
			z: 0,
			Rx: 0,
			Ry: 0,
			Rz: 0
		}
		
	//three nested loops will create the tower
	//inner loop lays blocks in a row
	//mid loop starts a new column
	//outer loop starts next new layer up 
	/*IMPORTANT: the number 2 is hard coded because CreateCube() creates 2x2x2 cubes.  bad form... but be aware!*/
	for (var h=0;h<height;h++) {
		
		for (var w=0;w<width;w++) {
		
			for(var d =0; d<depth;d++){
			   console.log("195:",ObjBlueprint.x,ObjBlueprint.y,ObjBlueprint.z)
				ObjBlueprint.x = pos.x();
				ObjBlueprint.y = pos.y();
				ObjBlueprint.z = pos.z();

				//MAJOR FLAW. ccreatePhysicalCube alters the object passed to it!.  need to send a copy
				 var block = createPhysicalCube(Object.assign({},ObjBlueprint));
				 block.physics.setActivationState(1);
				rigidBodies.push( block.physics );
				physicsWorld.addRigidBody( block.physics );
				AddToRigidBodiesIndex(block);

				//add to pos, used in the placement for our next block being created	
				pos.setX(ObjBlueprint.x+d) //+X dimention
			}
			//reset for next column
			pos = new Ammo.btVector3(randX,1,randZ)

			//Start our new row shifted over depth of our object
			pos.setY((pos.y()*h));
			pos.setZ(pos.z()+2);//+Z dimention;
			
			ObjBlueprint.x = pos.x();
			ObjBlueprint.y = pos.y();
			ObjBlueprint.z = pos.z();
		}
		//reset our Z axis
		//start the new grid up one level
		//reset for next column
		pos = new Ammo.btVector3(randX,1,randZ)
			
		//Start our new layer by moving up the height of our cubes
		pos.setY(2+ObjBlueprint.y)
		ObjBlueprint.x = pos.x();
		ObjBlueprint.y = pos.y();
		ObjBlueprint.z = pos.z();
	}
}



function AddToRigidBodiesIndex(obj){
	
	//rigidBodiesIndex holds construction info about our object
	//it is used for new players to construct the current world state
	//Ammo assigns a uniqueID number to every object which can be found in the 'ptr' property
	
	//assign our objects loc/rot to our reusable transform object
	obj.physics.getMotionState().getWorldTransform( transformAux1 );
	
	var loc = transformAux1.getOrigin();//position
	var rot = transformAux1.getRotation();//orientation
	
	rigidBodiesIndex[obj.id] = {
				id:obj.id,
				x:loc.x(), 
				y:loc.y(), 
				z:loc.z(), 
				Rx:rot.x(), 
				Ry:rot.y(), 
				Rz:rot.z(), 
				Rw:rot.w(),
				w:obj.w, 
				h:obj.h, 
				d:obj.d, 
				mass:obj.mass, 
			   shape:obj.shape,
			   color:obj.color,
			   texture:obj.texture
			};
			
	//console.log(rigidBodiesIndex)
}


//the object returned from createPhysicalCube has places the Ammo object under the property 'physics'
//the x,y,z,Rx,Ry,Rz props are deleted and a new prop 'physics' is created.
function createPhysicalCube (blueprint){
	
	//need error handling and default values
	var sx = blueprint.w
	var sy =  blueprint.h
	var sz =  blueprint.d
	var mass =  blueprint.mass
	
	/*set the position of our physics object using our reusable vector object*/
	vector3Aux1.setX(blueprint.x);
	vector3Aux1.setY(blueprint.y);
	vector3Aux1.setZ(blueprint.z);
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	quaternionAux1.setEulerZYX(blueprint.Rz,blueprint.Ry,blueprint.Rx);
		
	var physicsShape = new Ammo.btBoxShape(new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
	
	//set the collision margin, don't use zero, default is typically 0.04
	physicsShape.setMargin(0.04);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	transformAux1.setIdentity();
	
	//setOrigin() is for location
	transformAux1.setOrigin( vector3Aux1 );
    
	//setRotation() is for Orientation
	transformAux1.setRotation( quaternionAux1 );
	
	//set the motion state and inertia of our object
	var motionState = new Ammo.btDefaultMotionState( transformAux1 );
	
	var localInertia = new Ammo.btVector3( 0, 0, 0 );
	
	physicsShape.calculateLocalInertia( mass, localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new Ammo.btRigidBody( rbInfo );
	
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

function updatePhysics( deltaTime, timeForUpdate ) {
	/* http://www.bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World */
	physicsWorld.stepSimulation( deltaTime,10);//Bullet maintains an internal clock, in order to keep the actual length of ticks constant

	if (timeForUpdate){
		//tell users to grab a world state because update is coming next tick
		io.emit('QC');
		//by setting this for nextTick the lag it takes QC to reach client should equal
		//the required offset so that the server and client will be comparing the world state
		//in the EXACT same time reference.
		/*
		The time delta of QC msg and the update will be ~equal to user lag.  The update will have a timestamp that is very near the SENDING time of QC.
		*/
		process.nextTick(function (){emitWorldUpdate()} );
	}
	
	//loop our physics at about X fps
	setTimeout( TickPhysics, 20);//milisecond callback timer
};


function emitWorldUpdate() {
		
		var objectCount = 0;
		var dataToSend = new Array();
		
		//this function will create a tree of objects that need to be updated due to Physics simulation
		//the structure is that ObjectUpdateJSON has a bunch of properties which are the ID's of the objects.  
		//Each object branch will be an object that changed and it's new XYZ, rotation X,Y,Z for the objects. 
		//clients hold a matching representation of the physics object using the ID's in their presented graphics.

		// check for rigidbodies that are in motion (changed) since last stepSimulation
		for ( var i = 0; i < rigidBodies.length; i++ ) {
		
			var obj = rigidBodies[ i ];
			var ms =  obj.getMotionState();
	  
			if ( ms ) {

				//get the angularvelocity of the object
				var Av = obj.getAngularVelocity();				
				
				if (Av.length() > .001) {
				
				//assign obj's ID to it's starting index position
				dataToSend[objectCount*PROPERTY_PER_OBJECT] = obj.ptr;
				
				//Bullet calls getWorldTransform with a reference to the variable it wants you to fill with transform information
				ms.getWorldTransform( transformAux1 );//note: transformAux1 =  Ammo.btTransform();
				
				//get the physical location of our object
				var p = transformAux1.getOrigin();
				//assign position info to it's proper index location relative to objs data start point
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+1] = p.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+2] = p.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+3] = p.z();
				

				//get the physical orientation of our object
				var q = transformAux1.getRotation();
				//assign orientation info to it's proper index location relative to objs data start point
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+4] = q.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+5] = q.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+6] = q.z();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+7] = q.w();

				//get the angular velocity of the object
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+8] = Av.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+9] = Av.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+10] = Av.z();

				//get the linearvelocity of the object
				var Lv = obj.getLinearVelocity();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+11] = Lv.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+12] = Lv.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+13] = Lv.z();
				/**********************************************************************/		
						
				objectCount++;
				}
			}
	};
	
	//we need: PROPERTY_PER_OBJECT number of Float32(4 bytes) PER Object,  dataToSend.length x 4 gives total bytes needed

	//put a header in first index to indicate how many props per object are being sent
	dataToSend.unshift(PROPERTY_PER_OBJECT);
	
	//set the data as Float32
	var binaryData = new Float32Array(dataToSend);
	
	//create a data buffer of the underlying array
	var buff = Buffer.from(binaryData.buffer)

	//send out he data with a time stamp in UTC time
	io.emit('U', {time:clock.oldTime,data:buff} );
}

function TickPhysics() {
	   var deltaTime = clock.getDelta();
	   var sendUpdate = clock.UpdateTime();//bool that is true every second
	   updatePhysics( deltaTime,sendUpdate );
    };
	
	
function BuildWorldStateForNewConnection(){

	//http://stackoverflow.com/questions/35769707/socket-io-loses-data-on-server-side
	var world = new Array();

	for(var i = 0; i < rigidBodies.length; i++){
		//Try/Catch is here because ridgidBodies length can be affected by other functions.  synchronized locking not setup yet
		var lookUp = 'id'+rigidBodies[i].ptr.toString();
	//	var lookUp = rigidBodies[i].ptr;
		
		try{
			var obj =  rigidBodies[i]
			
			obj.getMotionState().getWorldTransform( transformAux1 )
			
			//get the physical orientation and location of our object
			var p = transformAux1.getOrigin();
			rigidBodiesIndex[lookUp].x = p.x();	
			rigidBodiesIndex[lookUp].y = p.y();
			rigidBodiesIndex[lookUp].z = p.z();
				
			var q = transformAux1.getRotation();
			rigidBodiesIndex[lookUp].Rx = q.x();
			rigidBodiesIndex[lookUp].Ry = q.y();
			rigidBodiesIndex[lookUp].Rz = q.z();
			rigidBodiesIndex[lookUp].Rw = q.w();
		
			world.push(rigidBodiesIndex[lookUp]);
		}
		catch(err){
			console.log(err)
			delete rigidBodiesIndex[lookUp]}
	}
	
	//create a time stamp
	var time = Date.now();
	
	/*IMPORTANT: See SO link above.  Can't send rigidBodiesIndex directly, had to copy to new array.  */	
	io.emit('setup',{
		[time]:world,
		TEXTURE_FILES_INDEX:TEXTURE_FILES_INDEX,
		TEXTURE_FILES:TEXTURE_FILES});
	
}

function AddPlayer(uniqueID){
	console.log('make')
	//uniqueID is SocketID
	
		//random start position for new player
		//create random location for our tower, near other blocks
	   var randX =  Math.floor(Math.random() * 20) - 10;
	   var randZ =  Math.floor(Math.random() * 20) - 10;
	
		var cubeObjBlueprint = {
			w : 2,
			h : 2,
			d : 2,
			mass : 10,
			shape:0,//0= box
			color: Math.random() * 0xff0000,//random RED
			texture:TEXTURE_FILES_INDEX.playerFace,
			x: randX,
			y: 10,
			z: randZ,
			Rx: 0,
			Ry: 0,
			Rz: 0
		}
		
		//build the object
		var cube = createPhysicalCube(cubeObjBlueprint);
		
		//keep the cube always active		
		cube.physics.setActivationState(4);

		//add to our physics object holder
		rigidBodies.push( cube.physics );
		
		//add to physics world
		physicsWorld.addRigidBody( cube.physics );
		
		//add to our index used to update clients about objects that have moved
		/*IMPORTANT: AddToRigidBodiesIndex expects that obj.physics is an Ammo object.  NOT the values sent used in the blueprint to build the object*/
		AddToRigidBodiesIndex(cube);
		
		//associate the player's socketID with it's object in rigidBodies
		PlayerIndex[uniqueID] =  cube;
		
		//add player to worlds of other players and self
		io.emit('newPlayer', {[uniqueID]:rigidBodiesIndex[cube.id]});
		
}

//function FireShot(player){
function FireShot(ID,data){
		//first 4 bytes will be headers
		//last 48 bytes will be data

		var headers   = new Uint8Array(4);
		headers[0] = fireBullet;
		headers[1] = 0//not assigned right now
		headers[2] = 0//not assigned right now
		headers[3] = 0//not assigned right now
		
		var binaryData   = new Float32Array(12);
		binaryData[0] = 0.5;//width
		binaryData[1] = 0.5;//height
		binaryData[2] = 0.5;//depth
		binaryData[3] = 10;//mass
		binaryData[4] = 0x7997A1  //color, hex for gray/blue
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
		var cube = createPhysicalCube(cubeObjBlueprint);
		binaryData[11] = cube.physics.ptr;//the NUMBER portion of ptr ID
		
		//create a vector to apply shot force to our bullet
		vector3Aux1.setValue(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));
		
		//apply the movement force of the shot
		cube.physics.applyCentralImpulse(vector3Aux1);

		//keep the cube always active		
		cube.physics.setActivationState(4);

		//add to our physics object holder
		rigidBodies.push( cube.physics );
		
		//add to physics world
		physicsWorld.addRigidBody( cube.physics );
		
		//add to our index used to update clients about objects that have moved
		/*IMPORTANT: AddToRigidBodiesIndex expects that obj.physics is an Ammo object.  NOT the values sent used in the blueprint to build the object*/
		AddToRigidBodiesIndex(cube);

		//prepare binary data for shipping
		var dataBuffer = Buffer.from(binaryData.buffer)
		var headersBuffer = Buffer.from(headers.buffer);
		//console.log(dataBuffer.byteLength)
		//console.log(headers.byteLength);
		
		var binaryShot = Buffer.concat([headersBuffer,dataBuffer],(dataBuffer.byteLength+headers.byteLength));
		//console.log(ship.byteLength)
		
		//add shot to worlds of other players and let them know who shot it
		io.emit('I', {[PlayerIndex[ID].id]:binaryShot});
		
		//remove shot from world in 5000 mili seconds
		setTimeout(function () { RemoveObj(cube.id)},5000);
}


												
function PlayerInput(ID,data){

	//data is a binary buffer
	//byes 0 - 3 are four Uint8.
	//bytes 4+ code float32 data
	//bytes 0 represents a type of input	
	//bytes 1 is button being pressed
	//bytes 2-3 Currently not  used
	
	if(fireBullet & data.readUInt8(0)){
			
				FireShot(ID,data);
				return;//don't want to execute emit below
				
	}else if(applyCentralImpulse & data.readUInt8(0) ){
				
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.applyCentralImpulse(vector3Aux1);
		}
	else if (applyTorqueImpulse & data.readUInt8(0)) {
		
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.applyTorqueImpulse(vector3Aux1);
	
	}else if (applyTorque & data.readUInt8(0)) {
		
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.applyTorque(vector3Aux1);
		
	}else if (applyCentralForce & data.readUInt8(0)) {
		
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.applyCentralForce(vector3Aux1);
				
	}else if(changeALLvelocity & data.readUInt8(0)){
				
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.setLinearVelocity(vector3Aux1);
				
				vector3Aux1.setValue(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));
				PlayerIndex[ID].physics.setAngularVelocity(vector3Aux1);
				
	}else if(changeLinearVelocity & data.readUInt8(0)){
				
				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.setLinearVelocity(vector3Aux1);
				
	}else if(changeAngularVelocity & data.readUInt8(0)){

				vector3Aux1.setValue(data.readFloatLE(4),data.readFloatLE(8),data.readFloatLE(12));
				PlayerIndex[ID].physics.setAngularVelocity(vector3Aux1);
	}
	
	//tell everyone WHO is doing the input and WHAT they are doing
	 io.emit('I',{[PlayerIndex[ID].id]:data});
}


function RemoveObj(RB_id) {
	/* DUPLICATE WARNING RemoveAPlayer does 99% the same, merge them, D.N.R.Y.S. */
	
	//remove from our rigidbodies holder
	for(var i=0;i < rigidBodies.length;i++){
		
		/*the construction of 'ids' in this whole server setup is WACKED! can lead to major headachs.  FIX.  the term ID is being used to describe both the ptr id assigned from physics engin and the id assigned to a socket. not to mention the concatination of 'id' to the front of a ptr id converted to string*/
		
		if(RB_id === 'id'+rigidBodies[i].ptr.toString() ){
		//loose equality check because RB_id may be string or int
		//if(RB_id == rigidBodies[i].ptr){
			//console.log("REMOVING:", RB_id)
			//remove player from the physical world
			physicsWorld.removeRigidBody( rigidBodies[i] );
			//remove player from rigidbodies
			rigidBodies.splice(i,1);
			//remove from our rigidbodies index
			delete rigidBodiesIndex[RB_id]
			
		}
	}
	
	//tell everyone to delete object
	io.emit('rmvObj', RB_id);
}

function RemoveAPlayer(uniqueID){
	
	var RB_id = PlayerIndex[uniqueID].id;
	
	RemoveObj(RB_id)
	
	//remove from player inded
	delete PlayerIndex[uniqueID]

	//tell everyone to delete players cube
	io.emit('removePlayer', RB_id);

}

function playerResetFromCrash(uniqueID){
	
	    var player = PlayerIndex[uniqueID];
		
	    //clear forces
		player.physics.setLinearVelocity(new Ammo.btVector3(0,0,0));
		player.physics.setAngularVelocity(new Ammo.btVector3(0,0,0));
		
		//reset location and orientation
		//create random location for our tower, near other blocks
	    var randX =  Math.floor(Math.random() * 20) - 10;
	    var randZ =  Math.floor(Math.random() * 20) - 10;
		 var Y = 0;
		vector3Aux1.setValue(randX,Y,randZ);
		quaternionAux1.setValue(0,0,0,1);
		
		player.physics.setWorldTransform(new Ammo.btTransform(quaternionAux1,vector3Aux1));
}

//setup physics world	
initPhysics();
createObjects();


/*
Good resource:
http://buildnewgames.com/optimizing-websockets-bandwidth/
*/

//socketio listener for 'connection'
io.on('connection', function(socket){
	
	
	socket.on('disconnect', function(){
		console.log('playerleft: ', this.id)
		RemoveAPlayer(this.id);
	});
	
	//log
	console.log('*****'+Date.now()+'*****');
	console.log('new user');
	console.log('Socket ID: ',socket.id);
	console.log('IP: '+socket.request.connection.remoteAddress);
	console.log('**********');
	
	//send the new connection their uniqueID, which happens to be their socketID
	io.to(socket.id).emit('playerID', socket.id);
	
	//create a player instance
	AddPlayer(socket.id);
	
	//get current state of everything, build specs and send out		
	BuildWorldStateForNewConnection();
	
	//on first connection begin physics sim
	if(!PhysicsSimStarted){
		clock.start();
		TickPhysics();
	}
	
	PhysicsSimStarted = true;
	
	socket.on('getMyObj',function () {	
		socket.emit('yourObj',PlayerIndex[this.id].id)
	});


	
	socket.on('resetMe',function(){
		playerResetFromCrash(this.id);
	});
	
	
	//player input handler
	socket.on('I',function(data){
		//controler button
		//console.log("button ",data.readUInt8(0))
		//controller side
		//console.log("controller ",data.readUInt8(1))
		//x
		//console.log("x ",data.readFloatLE(4))
		//y
		//console.log("y ",data.readFloatLE(8))
		//z
		//console.log("z ",data.readFloatLE(12))
		
		PlayerInput(this.id,data);	  
		
	});
	
});

//serve HTML to initial get request
app.get('/', function(request, response){
	response.sendFile(__dirname+'/mulitplayer_game1.html');
});


http.listen(port, function(){
	console.log('listening on port: '+port);
	console.log('serving files from root: '+__dirname);
	});		
