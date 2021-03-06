
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
var rigidBodiesIndex = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
var clock;									//info that is only needed when a newly connected player first builds the world
const updateFrequency = .2;//Seconds	
const SIMULATION_STEP_FREQUENCY = 16;//miliseconds
const PROPERTY_PER_OBJECT = 14; //IMPORTANT PROPERTY!!! change if number of object properties sent with updates changes.  ie. linear velocity
const IMPACT_FORCE_MINIMUM = 1;//minimum impact for collision to be broadcast

/*used for binary exporting world*/
const BYTE_COUNT_INT32 = 5;//id,w,h,d,mass,
const BYTE_COUNT_INT8  = 3;//texture,shape,player
const BYTE_COUNT_F32 = 8;//color,x,y,z,Rx,Ry,Rz,Rw
		
	
var GROUND_ID;//used to quickly find the ground.

var TEXTURE_FILES_INDEX = {
	ground:0,
	blocks_1:1,
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
	//convert from mili seconds to seconds 
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
		
		GROUND_ID = ground.id;

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
	
	//defaults if no args passed for the TOWER, not the blocks
	var height = height || 10;
	var width = width || 2;
	var depth = depth || 2;
	
	//create random location for our tower, near other blocks
	var randX =  Math.floor(Math.random() * 300) - 100;
	var randZ =  Math.floor(Math.random() * 300) - 100;
	var randY = 1;//...not random
	
	var pos =  new Ammo.btVector3(randX,randY,randZ);
	var blockMass = 1; //zero mass makes objects static.  Objects can hit them but they dont move or fall 
	var blockW = 2;
	var blockH = 2;
	var blockD = 2;
	var blockShape = 0;//box =0
	var blockColor = 0xededed;//light gray, rubble will be based on this color
	var blockTexture = TEXTURE_FILES_INDEX.blocks_1;
	var blockBreakApartForce = 5;
	
		
	//three nested loops will create the tower
	//inner loop lays blocks in a row
	//mid loop starts a new column
	//outer loop starts next new layer up 
	/*IMPORTANT: the number 2 is hard coded because CreateCube() creates 2x2x2 cubes.  bad form... but be aware!*/
	for (var h=1;h<=height;h++) {
		
		for (var w=0;w<width;w++) {
		
			for(var d =0; d<depth;d++){

				var block = createPhysicalCube({
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

				physicsWorld.addRigidBody( block.physics );
				
				AddToRigidBodiesIndex(block);

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
}



function AddToRigidBodiesIndex(obj){
	//indicates if the object is a players cube
	if(typeof obj.player === 'undefined'){obj.player = 0};

	//indicates if this object can break, if it can - force requied to break it in Newtons
	if(typeof obj.breakApartForce === 'undefined'){obj.breakApartForce = 0};

	rigidBodiesIndex[obj.id] = new RigidBodyConstructor(obj);

	//console.log(rigidBodiesIndex)
}


RigidBodyConstructor = function(obj){
		
		this.physics = obj.physics;//our AMMO portion of this object
		this.id = obj.id;
		this.w = obj.w;
		this.h = obj.h; 
		this.d = obj.d; 
		this.mass = obj.mass; 
		this.shape = obj.shape;
		this.color = obj.color;
		this.texture = obj.texture;
		this.player = obj.player;
		this.breakApartForce = obj.breakApartForce;
		this.destroyObject = obj.destroyObject;
		this.transformAux1 = new Ammo.btTransform();//reusable transform object
		
		/*used for binary exporting*/
		this.int32Count = BYTE_COUNT_INT32;//id
		this.int8Count = BYTE_COUNT_INT8;//w,h,d,mass,texture,shape,player
		this.float32Count = BYTE_COUNT_F32;//color,x,y,z,Rx,Ry,Rz,Rw
		
		this.totalBytes = (this.int32Count*4)+(this.int8Count)+(this.float32Count*4);
	
};

RigidBodyConstructor.prototype.breakObject = function(impactForce){
	
	//this.destroyObject is a flag to indicate obj is already qued for destruction
	if(this.breakApartForce === 0 || this.breakApartForce > impactForce || this.destroyObject){
			return false;
	}else{
			this.destroyObject = true;
			this.breakApartForce = impactForce;
			return true;
	};
};

RigidBodyConstructor.prototype.getOrigin = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	var pos = this.transformAux1.getOrigin();
	return {x:pos.x(),y:pos.y(),z:pos.z()};
};

RigidBodyConstructor.prototype.getRotation = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	var quat = this.transformAux1.getRotation();
	return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
};

RigidBodyConstructor.prototype.getLinearVelocity = function(){
	
	var LV =  this.physics.getLinearVelocity();
	return {x:LV.x(), y:LV.y(), z:LV.z()};
};

RigidBodyConstructor.prototype.getAngularVelocityVelocity = function(){
	
	var AV =  this.physics.getAngularVelocity();
	return {x:AV.x(), y:AV.y(), z:AV.z()};
};

RigidBodyConstructor.prototype.x = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().x();
};

RigidBodyConstructor.prototype.y = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().y();
};

RigidBodyConstructor.prototype.z = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().z();
};

RigidBodyConstructor.prototype.Rx = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().x();
};

RigidBodyConstructor.prototype.Ry = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().y();
};

RigidBodyConstructor.prototype.Rz = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().z();
};

RigidBodyConstructor.prototype.Rw = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().w();
};

RigidBodyConstructor.prototype.LVx = function(){
	
	return this.physics.getLinearVelocity().x();
};

RigidBodyConstructor.prototype.LVy = function(){
	
	return this.physics.getLinearVelocity().y();
};

RigidBodyConstructor.prototype.LVz = function(){
	
	return this.physics.getLinearVelocity().z();
};

RigidBodyConstructor.prototype.AVx = function(){
	
	return this.physics.getAngularVelocity().x();
};

RigidBodyConstructor.prototype.AVy = function(){
	
	return this.physics.getAngularVelocity().y();
};

RigidBodyConstructor.prototype.AVz = function(){
	
	return this.physics.getAngularVelocity().z();
};

RigidBodyConstructor.prototype.exportJSON = function(){
	
	var pos = this.getOrigin();
	var quat = this.getRotation();
	return {
		id:this.id,
		x:pos.x, 
		y:pos.y, 
		z:pos.z,
		Rx:quat.x,
		Ry:quat.y, 
		Rz:quat.z, 
		Rw:quat.w,
		w:this.w,
		h:this.h, 
		d:this.d,
		mass:this.mass,
		shape:this.shape,
		color:this.color,
		texture:this.texture,
		player:this.player
	};	
}

RigidBodyConstructor.prototype.exportBinary = function(){
	                   

	var int32 = new Int32Array(this.int32Count);//ORDER: id,w,h,d,mass,
	var int8 = new Int8Array(this.int8Count);//ORDER: texture,shape,player
	var f32 = new Float32Array(this.float32Count);//ORDER: color,x,y,z,Rx,Ry,Rz,Rw

	int32[0] = parseInt(this.id.slice(2),10);//remove the 'id' and return as number
	int32[1] = this.w;
	int32[2] = this.h;
	int32[3] = this.d;
	int32[4] = this.mass;
	
	int8[0] = this.texture;
	int8[1] = this.shape;
	int8[2] = this.player;
	
	f32[0] = this.color;
	f32[1] = this.x();
	f32[2] = this.y();
	f32[3] = this.z();
	f32[4] = this.Rx();
	f32[5] = this.Ry();
	f32[6] = this.Rz();
	f32[7] = this.Rw();
	

	//prepare binary
	var int32Buffer = Buffer.from(int32.buffer);
	var int8Buffer = Buffer.from(int8.buffer);
	var f32Buffer = Buffer.from(f32.buffer);

	var binaryData = Buffer.concat([int32Buffer,int8Buffer,f32Buffer],this.totalBytes);
	
	return binaryData
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

	//***COLLISION CHECKS
	
	//TODO: JMN Nov6 2016 tie in collision check with clients, broadcast
	//distruction rubble
	//var collisionPairs = dispatcher.getNumManifolds();
	var destroyObjs = processCollisionPairs(dispatcher.getNumManifolds());
	
	for (var x=0; x < destroyObjs.length; x++) {

		generateRubble(destroyObjs[x])
		
		//destroy the flagged objects
		RemoveObj(destroyObjs[x].id);
	};
	
	
	//********END COLLISION CHECKS

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
	setTimeout( TickPhysics, SIMULATION_STEP_FREQUENCY);//milisecond callback timer
};


function processCollisionPairs(collisionPairs){
	
		var ObjsToDestroy = new Array(); 
		
		for(var i=0;i<collisionPairs;i++){
		//for each collision pair, check if the impact force of the two objects exceeds our ForceThreshold (global IMPACT_FORCE_MINIMUM)
		//this will eliminate small impacts from being evaluated, light resting on the ground, gravity acting on object etc.
		
			//truncate with bit OR 0 because don't need decimal
			var impactForce = dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse() | 0;

			if( impactForce > IMPACT_FORCE_MINIMUM){

				//Objects ptr id, MUST have 'id' added to the front before use as a rigidBodiesIndex lookup
				var Obj1_lookupID = 'id'+dispatcher.getManifoldByIndexInternal(i).getBody0().ptr.toString();
				var Obj2_lookupID = 'id'+dispatcher.getManifoldByIndexInternal(i).getBody1().ptr.toString();

				//check if the object can break, and if force is large enough to break it
				//DON"T DO THIS! Objs will have built in .breakObject() method.
				//call that here NOT: FlagObjectToBreak()
				//.breakObject() will return true if it can break, pass object to
				//generateRubble()
				if(rigidBodiesIndex[Obj1_lookupID].breakObject(impactForce)){
					ObjsToDestroy.push(rigidBodiesIndex[Obj1_lookupID]);
				}
				if(rigidBodiesIndex[Obj2_lookupID].breakObject(impactForce)){
					ObjsToDestroy.push(rigidBodiesIndex[Obj2_lookupID]);
				}
		};
	};
	
	return ObjsToDestroy;
};


function generateRubble(object){
	
	//get some object properties from our object to be broken
	var depth = object.w;
	var height = object.h; 
	var width = object.d;
	var mass = object.mass;
	var posX = object.x();
	var posY = object.y();
	var posZ = object.z();
	var texture = object.texture;
	var color = object.color;
	
	var rubbleMass = mass/(depth+height+width);//density
	
	var force = object.breakApartForce/(depth+height+width);
	
	//The rubble will be propotionally sized cubes based on the original objects size
	//frac creates frac^3 pieces of rubble.
	var frac = 2;
	var dfrac = depth/(frac*frac)//depth/frac;
	var hfrac = height/(frac*frac)//height/frac;
	var wfrac = width/(frac*frac)//width/frac;
	
	//next create our rubble
	//for (var h=0;h<frac;h++) {
		
		var posZ_layer = posZ;		
		for (var w=0;w<frac;w++) {
			
			var posX_layer = posX;
			for(var d =0; d<frac;d++){
				
				var binaryData   = new Float32Array(12);
					binaryData[0] = dfrac;//width
					binaryData[1] = hfrac;//height
					binaryData[2] = wfrac;//depth
					binaryData[3] = rubbleMass;//mass
					binaryData[4] = color; //color, light gray
					binaryData[5] = posX_layer;//x
					binaryData[6] = posY;//y
					binaryData[7] = posZ_layer;//z

				/*
				THIS IS RIDICULOUS lol
				TODO: JMN Nov7 2016
				change createPhysicalCube() so it accepts a data array OR object
				*/
				var rubbleBluePrint = {
						w : binaryData[0],
						h : binaryData[1],
						d : binaryData[2],
						mass : binaryData[3],
						color: binaryData[4],
						x: binaryData[5],
						y: binaryData[6],
						z: binaryData[7],
						Rx: 0,
						Ry: 0,
						Rz: 0
					}
		
				//build the piece of rubble
				var rubblePiece = createPhysicalCube(rubbleBluePrint);
				
				AddToRigidBodiesIndex(rubblePiece);
				
				binaryData[11] = rubblePiece.physics.ptr;//the NUMBER portion of ptr ID
				
				//apply force to our piece of rubble		
				// in random directions
				binaryData[8] = force * (Math.random() < 0.5 ? -1 : 1);
				binaryData[9] = force * (Math.random() < 0.5 ? -1 : 1);
				binaryData[10] = force * (Math.random() < 0.5 ? -1 : 1);
				
				//apply impact force to our rubble
				rubblePiece.physics.applyCentralImpulse(vector3Aux1.setValue( binaryData[8],binaryData[9],binaryData[10] ));	
				
				//set to ACTIVE so the pieces bounce around
				//rubblePiece.physics.setActivationState(1);

				//add to to physics world
				physicsWorld.addRigidBody( rubblePiece.physics );
				
				//Add a random 1-5 sec delay b4 new rubble object is removed from world
				var delay =  Math.random() * 8000 + 1000;
				
				//add self destruct to the rubble so it will be removed from world after delay time
				delayedDestruction(rubblePiece.id,delay);
				
				//prepare binary data for shipping
				var dataBuffer = Buffer.from(binaryData.buffer)
		
				//add to worlds of other players 
				io.emit('C', dataBuffer);
						
				//add to posX, used in the placement for our next rubble block being created	
				posX_layer += (dfrac);
			}
			//reset our X axis
			posX_layer = posX;
			//Start our new row, create each new block Z over
			posX_layer += wfrac;//+Z dimention
		}
		//reset our Z axis
		//posX_layer = posZ;
		//start the new grid up one level
		//posY += hfrac; 
	//}
	
	return true;
}

function delayedDestruction(ID,delay) {

		setTimeout(function () {
				RemoveObj(ID)
			},delay);
}

function emitWorldUpdate() {
		
		var objectCount = 0;
		var dataToSend = new Array();
		
		//this function will create a tree of objects that need to be updated due to Physics simulation
		//the structure is that ObjectUpdateJSON has a bunch of properties which are the ID's of the objects.  
		//Each object branch will be an object that changed and it's new XYZ, rotation X,Y,Z for the objects. 
		//clients hold a matching representation of the physics object using the ID's in their presented graphics.

		// check for rigidbodies that are in motion (changed) since last stepSimulation
		var totalObjCount = Object.keys(rigidBodiesIndex)
		for ( var i = 0; i < totalObjCount.length; i++ ) {
		
			var obj = rigidBodiesIndex[ totalObjCount[i] ].physics;
			var ms =  obj.getMotionState();
	  
			if ( ms ) {

				//get the linearVelocity of the object
				var Lv = obj.getLinearVelocity();
		
				if (Lv.length() > .1) {
					
				//	if(Lv.y() < -5)console.log("count:",objectCount,"Y:",Lv.y());
				
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
				var Av = obj.getAngularVelocity();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+8] = Av.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+9] = Av.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+10] = Av.z();

				//get the linearvelocity of the object
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+11] = Lv.x();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+12] = Lv.y();
				dataToSend[(objectCount*PROPERTY_PER_OBJECT)+13] = Lv.z();
				/**********************************************************************/		
						
				objectCount++;
				}
			}
	};
	
	//we need: PROPERTY_PER_OBJECT number of Float32(4 bytes) PER Object,  dataToSend.length x 4 gives total bytes needed

	//put a header in FIRST index to indicate how many props per object are being sent
	dataToSend.unshift(PROPERTY_PER_OBJECT);

	//set the data as Float32
	var binaryData = new Float32Array(dataToSend);
	
	//create a data buffer of the underlying array
	var buff = Buffer.from(binaryData.buffer)

	//send out the data with a time stamp in UTC time
	if(objectCount>0)io.emit('U', {time:clock.oldTime,data:buff} );

	/*	
	CONSIDER MAKING IT ALL BINARY, Pack the timestamp into an f32 spot	
	*/
	//io.emit('U', buff);
}

function TickPhysics() {
	   var deltaTime = clock.getDelta();
	   var sendUpdate = clock.UpdateTime();//bool that is true every second
	   updatePhysics( deltaTime,sendUpdate );
    };
	

function BuildWorldStateForNewConnection(){
	
	var msgByteCount = 0;
	var totalObjs = Object.keys(rigidBodiesIndex);
	var header = new Int16Array(4);
	header[0] = totalObjs.length;
	header[1] = BYTE_COUNT_INT8;
	header[2] = BYTE_COUNT_INT32;
	header[3] = BYTE_COUNT_F32;

	var binaryData = Buffer.from(header.buffer);

	for(var i = 0; i < totalObjs.length; i++){
		
		//Try/Catch is here mostly for debug
		var lookUp = totalObjs[i];

		try{
			var currentByteLength = binaryData.length + rigidBodiesIndex[lookUp].totalBytes;
			//basically PUSH new binary to end of current binary
			binaryData = Buffer.concat([binaryData, rigidBodiesIndex[lookUp].exportBinary()], currentByteLength )
		}
		catch(err){

			delete rigidBodiesIndex[lookUp]}
	}
	
	
	//create a time stamp
	var time = Date.now();
	
	/*IMPORTANT: See SO link above.  Can't send rigidBodiesIndex directly, had to copy to new array.  */	
	io.emit('setup',{
		time:time,
		data: binaryData,
		TEXTURE_FILES_INDEX:TEXTURE_FILES_INDEX,
		TEXTURE_FILES:TEXTURE_FILES});
	
}


function AddPlayer(uniqueID){
	
	//uniqueID is SocketID
	
		//random start position for new player
		//create random location
	   var randX =  Math.floor(Math.random() * 20) - 10;
	   var randZ =  Math.floor(Math.random() * 20) - 10;
	   var randY = 10;//not random, named for convention
		var cubeObjBlueprint = {
			w : 2,
			h : 2,
			d : 2,
			mass : 10,
			shape:0,//0= box
			color: Math.random() * 0xff0000,//random RED
			texture:TEXTURE_FILES_INDEX.playerFace,
			x: randX,
			y: randY,
			z: randZ,
			Rx: 0,
			Ry: 0,
			Rz: 0,
			player:1,
			breakApartForce:300
		}
		
		//build the object
		var cube = createPhysicalCube(cubeObjBlueprint);
		
		//keep the cube always active		
		cube.physics.setActivationState(4);
	
		//add to physics world
		physicsWorld.addRigidBody( cube.physics );
		
		//add to our index used to update clients about objects that have moved
		AddToRigidBodiesIndex(cube);
		
		//associate the player's socketID with it's object in rigidBodies
		PlayerIndex[uniqueID] =  cube;
		
		console.log("913 Ugly way to notify a players of newplayer FIX");
		//cubeObjBlueprint is modified by createPhysicalCube(), but users need pos an quat info
			cubeObjBlueprint.x = randX;
			cubeObjBlueprint.y = randY;
			cubeObjBlueprint.z = randZ;
			cubeObjBlueprint.Rx = 0;
			cubeObjBlueprint.Ry = 0;
			cubeObjBlueprint.Rz = 0;
			cubeObjBlueprint.Rw = 1;
		
		//add player to worlds of other players	
	    io.emit('newPlayer', {[uniqueID]:cubeObjBlueprint});

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
		var cube = createPhysicalCube(cubeObjBlueprint);
		binaryData[11] = cube.physics.ptr;//the NUMBER portion of ptr ID
		
		//create a vector to apply shot force to our bullet
		vector3Aux1.setValue(data.readFloatLE(16),data.readFloatLE(20),data.readFloatLE(24));
		
		//apply the movement force of the shot
		cube.physics.applyCentralImpulse(vector3Aux1);

		//keep the cube always active		
		cube.physics.setActivationState(4);

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
		delayedDestruction(cube.id,5000)
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


function RemoveObj(RB_id,batch) {

	/* DUPLICATE WARNING RemoveAPlayer does 99% the same, merge them, D.N.R.Y.S. */

		/*the construction of 'ids' in this whole server setup is WACKED! can lead to major headachs.  FIX.  the term ID is being used to describe both the ptr id assigned from physics engin and the id assigned to a socket. not to mention the concatination of 'id' to the front of a ptr id converted to string*/
		
		//SINGLE OBJECT
		if (typeof batch === 'undefined') {
			physicsWorld.removeRigidBody( rigidBodiesIndex[RB_id].physics);

			//remove from our rigidbodies index
			delete rigidBodiesIndex[RB_id];
			
			//tell everyone to delete SINGLE object
			io.emit('rmvObj', RB_id);
		}
	
	

}

function RemoveAPlayer(uniqueID){
	
	var RB_id = PlayerIndex[uniqueID].id;
	
	console.log("player remove:",RB_id);
	RemoveObj(RB_id)
	
	//remove from player inded
	delete PlayerIndex[uniqueID]

	//tell everyone to delete players cube
	io.emit('removePlayer', RB_id);

}

function playerResetFromCrash(uniqueID){
		
		console.log("reset")
	    var player = rigidBodiesIndex[PlayerIndex[uniqueID].id];

	    //clear forces
		player.physics.setLinearVelocity(new Ammo.btVector3(0,0,0));
		player.physics.setAngularVelocity(new Ammo.btVector3(0,0,0));
		
		//reset location and orientation
		//create random location 
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
