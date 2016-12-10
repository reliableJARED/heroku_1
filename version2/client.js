//GLOBAL General variables
var connection = false;
var newPlayer = true;
var rigidBodiesLookUp = {};
var OtherPlayers = new Object();
var mouse = new THREE.Vector2();
var clock;
var UNIQUE_ID; //assigned by the server
var camX =0;var camY = 5; var camZ = -20;//Set the initial perspective for the user
var PlayerCube;
var PlayerCube_local;

//server assigned texture files
var TEXTURE_FILES_INDEX = new Object();
var TEXTURE_FILES = new Array();

/**** Player specific vars 
used in many calcs, server has it's own set.  If someone trys to cheat
and change things their playing exp. will be messed up
 **********/
const TOP_HORIZONTAL_SPEED = 15;
const TOP_VERTICAL_SPEED = 15;
const SHOT_SPEED = 500;
const ROTATION_SPEED = .5;

//add rate of fire, health, items, etc.
/**********************************************************/


var textureLoader = new THREE.TextureLoader();
var synchronizer;

//GLOBAL Physics variables
var physicsWorld;
const gravityConstant = -9.8; //should this be sent from server?
var OnScreenBodies =[];
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var softBodySolver;
var transformAux1 = new Ammo.btTransform();
var vector3Aux1 = new Ammo.btVector3();
var quaternionAux1 = new Ammo.btQuaternion();
var PHYSICS_ON = true;
const INTERPOLATE_AMT = .5;//interpolation setting for server updates.  Percent to correct local towards server

//Input Controller
var GAMEPAD = new ABUDLR({left:{GUIsize:50,callback:GAMEPAD_left_callback},right:{GUIsize:50,callback:GAMEPAD_right_callback}});

//create the synchronizer to merge local and server side physics
var synchronizer; 
		
		//GLOBAL Graphics variables
var camera, scene, renderer;//primary components of displaying in three.js

//RAYCASTER  is a project that renders a 3D world based on a 2D map
var raycaster = new THREE.Raycaster();//http://threejs.org/docs/api/core/Raycaster.html
	
/************SERVER HOOKUPS*******************/
//coding values for data sent to server
const applyCentralImpulse = 1;         
const applyTorqueImpulse = 2;      
const applyTorque = 4;       
const applyCentralForce = 8;    
const changeALLvelocity = 16;  
const changeLinearVelocity = 32;		
const changeAngularVelocity = 64;	
const fireBullet = 128;	
				
// exposes a global for our socket connection
var socket = io();

		
		socket.on('connect',function(msg){
			connection = true;			
		});
		
		socket.on('newPlayer',function(msg){

		   //don't build player if server is talking about you!
		   var NewID = Object.keys(msg)[0];
		   
		   //TODO: STORE NewID somewhere because it represents a players socketID
		   
			if( NewID === UNIQUE_ID){
				//do nothing because this is global alert to others about you!
			}else{
				console.log("new player blueprint",msg[NewID])
				var newP = createBox(msg[NewID],true);
				console.log("new player",newP)
				};
			//	OtherPlayers[NewID] = createBox(msg[NewID],true)}
		   });
		
		socket.on('playerID',function(msg){
			//server assigned uniqueID
			UNIQUE_ID = msg;
			
		});

		
		socket.on('yourObj',function(msg){
			//Server assigning you to a rigidBody
			PlayerCube = new PlayerObjectConstructor(rigidBodiesLookUp[msg]);
		
			//assign your player to the physics synchronizer
			synchronizer.assignPlayer(PlayerCube);
			
			 //now that you exist, start rendering loop
			animate();	
		});		
		
		function requestPlayerObj(){
			//when world is built, ask for assigned object
			socket.emit('getMyObj');
		};
		
		socket.on('setup', function(msg){
			console.log("setup bytes:",msg.data)			
			
			//msg is an object with 4 props
			//time: timeStamp from server
			//data: binary data of all world objects
			//TEXTURE_FILES_INDEX: Object whos keys match files in TEXTURE_FILES array
			//TEXTURE_FILES: array of file name strings
			if(newPlayer){
				newPlayer = false;//prevent rebuild for 'setup' msg intended for new players
			
				//assign the lookup index for textures
				TEXTURE_FILES_INDEX  = msg.TEXTURE_FILES_INDEX ;
				
				//load all textures
				serverTextureLoader( msg.TEXTURE_FILES);

				//sync clocks
				clock = new GameClock(msg.time);
				synchronizer.linkGameClock(clock);
			
				var ObjectsToBuild = unpackServerBinaryData(msg.data);
				
				//build the objects, and pass a callback requestPlayerObj when world is ready
				buildObjectBatch(ObjectsToBuild, requestPlayerObj)

			};

			
		});
		

		socket.on('DefineDataStructure',function(instructions){
			//sets order of data array used to update object positions.
			//for example.  position '0' in an the array will always be an objects ID;
			//inscrutions would be an object = {id:0}.
			//this will be our key to understanding the data array in from the server during
			//the game
			synchronizer.DefineDataStructure(instructions);
		});
		
		socket.on('QC', function(){
			//this is sent ahead of a server synce update 'U' message.  It tells clients to grab a world state to be used to compare to the servers update.  The reason to do this is TIME DELAY.  A server notification will always be from the past.  So synchronizer is checking that local and server past framse are OK.
			synchronizer.GetLocalWorldState();
		});
		
		socket.on('U', function(msg){
			console.log("update bytes:",msg.data.byteLength);
			//msg.data is an ArrayBuffer, you can't read/write to it without using a typedarray or dataview
			//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
			//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
		   //console.log(msg.data.byteLength)
		  // var TimeStamp = new Float32Array(msg.slice(0,1));
		   var dataArray = new Float32Array(msg.data);

			//console.log(msg.data.byteLength)
			//after msg.data is loaded in to a typed array, pass to synchronizer
			synchronizer.queUpdates({time:msg.time,data:dataArray})

		});
		
		socket.on('C',function (msg) {
			//console.log('moving obj byte:',msg.byteLength)
			var dataArray = new Float32Array(msg);
			createMovingObj(dataArray);
		});
		

		socket.on('removePlayer', function(msg){
			/*TODO: currently this is exactly like 'rmvObj', however
			at future point there may be special things about players to remove
			so it is setup to handle rmvObj and removePlayer*/
		//	console.log(msg);
		//  msg is an ID for an object
		//	delete OtherPlayers[msg];
		//	scene.remove( rigidBodiesLookUp[msg] )
		//	physicsWorld.removeRigidBody( rigidBodiesLookUp[msg].userData.physics );
			//delete rigidBodiesLookUp[msg];
		});
		
		socket.on('rmvObj', function(msg){
		//	console.log('remove:',msg);
			//msg is an ID for an object
			//remove it
			RemoveObj(msg)
		});
		
		//**** PLAYER INPUT HANDLER
		socket.on('I',function(msg){
			
			try{
				//ID is a players ID
				var ID = Object.keys(msg)[0];
			
				//console.log("input bytes:",msg[ID].byteLength)			
			
				//msg[ID] is an ArrayBuffer with structure:
		  	 //first 4 bytes are 4 uint8, byte 1 encodes action being requested, next 3 vary on what they mean based on specific action.  Like shoot, move, etc.
		  	 //remaining bytes are for all float32 (4bytes each) that code movement commands
		   

				//determine what player object should be used
				var player = rigidBodiesLookUp[ID];
		
				//parse our binary data from server into readable formats
				var dataArray = new Float32Array(msg[ID],4);
				var header   = new Uint8Array(msg[ID],0,4);
		
				//Shot
				if (fireBullet & header[0]) {
					//do something with ID here? it tells us who is firing this shot Could be YOU!
					createMovingObj(dataArray);
				}
			
				//Movement
				else{
					ApplyMovementToAPlayer(player,header[0],dataArray)
			    };
			}
			catch(err){console.log(err)}
			
		});

/*******************************/


function initGraphics() {
 
   //http://threejs.org/docs/api/cameras/PerspectiveCamera.html 
   camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );	
  
    //mess around with these parameters to adjust camera perspective view point
    camera.position.x = camX;
	camera.position.y = camY;
    camera.position.z =  camZ;
				
	//http://threejs.org/docs/#Reference/Scenes/Scene			
	scene = new THREE.Scene();
    
	//http://threejs.org/docs/#Reference/Renderers/WebGLRenderer
	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor( 0xf0f0f0 ); //sets the clear color and opacity of background.
    renderer.setPixelRatio( window.devicePixelRatio );//Sets device pixel ratio.
    renderer.setSize( window.innerWidth, window.innerHeight );//Resizes output to canvas device with pixel ratio taken into account

    
    //LIGHT
	//http://threejs.org/docs/api/lights/AmbientLight.html
	var ambientLight = new THREE.AmbientLight( 0x404040 );
	
	//ambientLight is for whole scene, use directionalLight for point source/spotlight effect
   scene.add( ambientLight );
    				
    				
    //attach and display the renderer to our html element
    var container = document.getElementById( 'container' );
    
    container.appendChild( renderer.domElement );
	
	//create background 
	BackgroundEnvGraphics();	
	
	return true;
}

function BackgroundEnvGraphics() {
	/*
TODO: JMN 11/5/16
this should be called from may world builder, and Images need to be replaced
with loaded images in TEXTURE_FILES
*/	
	
	var imagePrefix = "snow_mountain_";
	var directions  = ["xneg", "xneg", "ypos", "yneg", "xpos", "xpos"];
	var imageSuffix = ".png";
	
	var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );	
	
	//create a container for the 6 faces of our environment background cube
	var materialArray = [];
	for (var i = 0; i < 6; i++)
	//KEY! THREE.BackSide to put image on inner face not outer face of cube
		materialArray.push( new THREE.MeshBasicMaterial({
			map: textureLoader.load( imagePrefix + directions[i] + imageSuffix ),
			side: THREE.BackSide
		}));
		
	var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
	var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
	scene.add( skyBox );

};

function initPhysics() {
		// Physics World configurations
		broadphase = new Ammo.btDbvtBroadphase();

		collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();

		dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );

		solver = new Ammo.btSequentialImpulseConstraintSolver();	
		softBodySolver = new Ammo.btDefaultSoftBodySolver();

		physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
	
		physicsWorld.setGravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );
		
		return true;
};
function serverTextureLoader(filenameArray) {

	for (f=0;f<filenameArray.length;f++) {
 		 texture = textureLoader.load(filenameArray[f]);
 	 	TEXTURE_FILES.push(texture);
 	};
 	
};

function buildObjectBatch(ObjectsToBuild, requestPlayerObj) {

   for(var o=0; o<ObjectsToBuild.length; o++){
		//ONLY box is supported now anyway, else there is a shape prop
		createBox(ObjectsToBuild[o]);
		/*if(objectBluePrint.shape === 0){
			createBox(objectBluePrint);
			};	
		*/	
	};
	
    requestPlayerObj();
};


var structureOfServerBinaryData = {
	
	cube:{
		//float32
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
			AVz:13,
		//int8
			shape:14,
		//float32
			width:15,
			height:16,
			depth:17
			
		}
	
}
function ServerShapePropCount(){
	return {
			cube:3,
			sphere:1
		}
};	

function ServerShapeIDCodes(){
	return {
			cube:0,
			sphere:1
		}
};	

function unpackServerBinaryData(binaryData){
	
	var AllObjectBluePrints = new Array();
	
	// binaryData is mixed structure binary data for all objects
	//first 8 bytes are int16 headers
		var header = new Uint16Array(binaryData,0,4);
		console.log("header",header)
			var totalObjs = header[0];
			var leadingF32data = header[1];
			var header3 = header[2];
			var header4 = header[3];
					
			//What makes it complicated is it's not uniform.  Cubes for example have more data than sphere
			//as data is unpacked we will be able to determine what shape is next to be unpacked
			//the data will ALWAYS have 14 float32 and 1 int8 before the nonuniform shape specific data
			
			var BytesOfPreviousObj = 0;//this will change EVERY pass of the for loop below
			
			var initF32Data = (leadingF32data * 4);// f32 are always leading
			console.log('totaldata',binaryData.byteLength)
			//skip first 8 because they are headers
			for(var i = 8,fullBuffer=binaryData.byteLength; i<fullBuffer;i+=BytesOfPreviousObj){
				/*https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/slice
				need to slice the buffer before converting into typedArray.
				this is because new typedArray() expects start to be an increment
				of the base.  ie floats start on multipue of 4. because the total buffer is a mix we cant just
				itterate through
				*/
				BytesOfPreviousObj = 0;//this will change EVERY pass of the for loop below
				var offset = i;
				console.log('start from:',offset)
				var bufferF32 = binaryData.slice(offset,offset+initF32Data)
				var firstF32 = new Float32Array(bufferF32);
				
				console.log('physics',firstF32)
				/*DO STUFF WITH THE DATA*/
				
				BytesOfPreviousObj += bufferF32.byteLength;
				
				offset += initF32Data
				
				var shapeBuffer = binaryData.slice(offset,offset+1)
				var shape = new Int8Array(shapeBuffer);
				
				console.log('shape:',shape)
				/*DO STUFF WITH THE DATA*/
				
				BytesOfPreviousObj += shapeBuffer.byteLength;
				
				offset += 1;
				
				var geometryF32props;
				switch(shape[0]){
					//DON"T Hardcode the prop count this was setup during testing
					case ServerShapeIDCodes().cube: geometryF32props = ServerShapePropCount().cube;//width,height,depth
					break;
					case ServerShapeIDCodes().sphere: geometryF32props = ServerShapePropCount().sphere;//radius
					break;
					default: console.log('todo');
				}
				//multiply by 4 to get bytes
				geometryF32props *= 4
				
				var geometryBuffer = binaryData.slice(offset,offset+geometryF32props)
				var geof32 = new Float32Array(geometryBuffer);
				
				console.log('geometry:',geof32)
				/*DO STUFF WITH THE DATA*/
				
				BytesOfPreviousObj += geometryF32props;
				console.log('finished from',BytesOfPreviousObj, 'to',BytesOfPreviousObj+i)
				
			}
			
	return AllObjectBluePrints;		
			

}


function RemoveObj(msg){
			//msg is an ID for an object		
			try{
				scene.remove( rigidBodiesLookUp[msg] )
				physicsWorld.removeRigidBody( rigidBodiesLookUp[msg].userData.physics );
				delete rigidBodiesLookUp[msg];
			}
			catch(err){
				console.log("err:",msg)
				}
	};
		
function createBox(object,returnObj) {
	
		/*
		CONSIDER:
		should this take an array or Object or both? if it took an array.
		could map the props to a local object first, then use.
		
		var localObject;
		if (typeof object === Object){localObject = object}
		else{
			localObject.w = object[0]
			etc...
		}
		*/
		
		var material=[];//consider passing mat types to flag basic, phong, etc...
	
		var texture = null;
		
		var color = 0xffffff;//default is white

		if (object.hasOwnProperty('color')) {color = object.color};
		
		if (object.hasOwnProperty('texture') ){ 
		
				 texture = TEXTURE_FILES[object.texture];

			if (object.player === 1) {	
							
					//player so only apply texture to FRONT FACE of cube
					var mat = new THREE.MeshBasicMaterial( { color:color,map:texture} );
					var a = new THREE.MeshBasicMaterial( { color: color} );
					//cube texture index map:
					//0 -left
					//1 - right
					//2 - top
					//3 - bottom
					//4 - front
					//5 - back
					material = new THREE.MeshFaceMaterial( [a,a,a,a,mat,a]);
				}else {
					//Cover the WHOLE cube with texture
					material = new THREE.MeshBasicMaterial( { map:texture} );
				}
			}else{
				material = new THREE.MeshBasicMaterial( { color: color} );
			}
		
		//http://threejs.org/docs/api/extras/geometries/BoxGeometry.html
		var geometry = new THREE.BoxGeometry(object.w, object.h, object.d );
	
		//http://threejs.org/docs/#Reference/Objects/Mesh
		var Cube = new THREE.Mesh(geometry, material);
		
	    Cube.position.set(object.x, object.y, object.z );
	    Cube.quaternion.set(object.Rx, object.Ry, object.Rz,object.Rw );
	
		//used to quickly find our object in our object array
	    rigidBodiesLookUp[object.id] = Cube;
		
		//add cube to graphics world
		scene.add( Cube );
			   
	    //attach any properties to the graphic object on 'userData' node of Cube object
		Cube.userData.physics = createBoxPhysicsObject(object);
		
		//object knows it's id in rigidBodiesLookUp
		Cube.userData.id = object.id;
		
		Cube.userData.physics.setActivationState(1);// ACTIVEATEATE
		
		//add cube to our physics world
		physicsWorld.addRigidBody( Cube.userData.physics );
		

		if (returnObj) {return Cube};
}


function createBoxPhysicsObject (object){
	//console.log(object)
	//PHYSICS COMPONENT	/******************************************************************/
	var physicsShape = new Ammo.btBoxShape(new Ammo.btVector3( object.w * 0.5, object.h * 0.5, object.d * 0.5 ) );
	
	//set the collision margin, don't use zero, default is typically 0.04
	physicsShape.setMargin(0.04);
	
	var transform = new Ammo.btTransform();
	
	//"SetIdentity" really just sets a safe default value for each of the data members, usually (0,0,0) on a Vector3, and (0,0,0,1) on a quaternion.
	transform.setIdentity();
	
	//we want a custom location and orientation so we set with setOrigin and setRotation
	transform.setOrigin( new Ammo.btVector3( object.x, object.y, object.z ) );
	transform.setRotation( new Ammo.btQuaternion( object.Rx, object.Ry, object.Rz, object.Rw ) );
	
	var motionState = new Ammo.btDefaultMotionState( transform );
	var localInertia = new Ammo.btVector3( 0, 0, 0 );
	
	physicsShape.calculateLocalInertia( object.mass, localInertia );
	
	//create our final physics body info
	var rbInfo = new Ammo.btRigidBodyConstructionInfo( object.mass, motionState, physicsShape, localInertia );
	var physicsCube = new Ammo.btRigidBody( rbInfo );
	//console.log(physicsCube)
	
	return physicsCube;
}

function createMovingObj(data){
	
	var bulletBlueprint = {
			id: 'id'+data[11].toString(),
			w :data[0],
			h :data[1],
			d : data[2],
			mass : data[3],
			color: data[4],
			x: data[5],
			y: data[6],
			z: data[7] ,
		//	texture:textures[0],
			Rx: 0,
			Ry: 0,
			Rz: 0,
			Rw: 1
		}
		
	var bullet = createBox(bulletBlueprint,true);
	
	//create a vector to apply shot force to our bullet
	vector3Aux1.setValue(data[8],data[9],data[10]);

	//apply the movement force of the shot
	bullet.userData.physics.applyCentralImpulse(vector3Aux1)

	//set to always active.		
	bullet.userData.physics.setActivationState(4);
		
}


function ApplyMovementToAPlayer(PlayerObject,type,data){
	
	PlayerObject.userData.physics.setActivationState(1);
	
	//use bit operators for comparisons to speed things up
	if(applyCentralImpulse & type ){
				
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.applyCentralImpulse(vector3Aux1);
		
	}else if (applyTorque & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.applyTorque(vector3Aux1);
		
	}else if (applyTorqueImpulse & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.applyTorqueImpulse(vector3Aux1);
	
	}else if (applyCentralForce & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.applyCentralForce(vector3Aux1);
				
	}else if (changeALLvelocity & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.setLinearVelocity(vector3Aux1);
	
				vector3Aux1.setValue(data[3],data[4],data[5]);
				PlayerObject.userData.physics.setAngularVelocity(vector3Aux1);
				
	}else if (changeLinearVelocity & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.setLinearVelocity(vector3Aux1);
				
	}else if (changeAngularVelocity & type) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.userData.physics.setAngularVelocity(vector3Aux1);
	}
	
}


function LinearVelocityCalculator(RotationAngle,magnitude){
	
	//RotationAngle is the angle of rotation about the Y axis.
	 var magnitude = magnitude || PlayerCube.TopHorizontalSpeed;
	 
	 var Z = magnitude* Math.cos(RotationAngle);
	 var X = magnitude* Math.sin(RotationAngle);
	 
	 /*
					/| 
				   / | 
	rotationAngle /__|
	recall "SOHCAHTOA"? we are calculating Adjacent ( var X) and Opposite (var Z)
	When we apply a linear velocity (X,0,Z) to our object the result will be travel along the hypotenuse
	 */
	 
	 return {x:X,z:Z};
}

function moveBackward() {
	
	//quat is a pi to -pi rotation angle
	var quat = PlayerCube.quanternionY();
	
	//headingAngle is a pi/2 to -pi/2 rotation eular angle around Y axis
	var headingAngle = PlayerCube.heading();
	
	//returns object of what our X and Z linear velocity components 
	var thrust = LinearVelocityCalculator(headingAngle);
	
	 //adjuster depending on if z should be pos or neg
	 var Zsign;

	/*determine what direction our player is facing and set the correction neg/pos for applied movementForce*/	  
	if( quat < 0.75  || quat < -0.75 ){thrust.z *= -1}
	else {thrust.z *= 1}

	//keep the Y portion of the velocity what it currently is
	var Y = PlayerCube.LVy();

	var buffer = getBinaryToSend([changeLinearVelocity],[-thrust.x,Y,thrust.z]);
	
	//binary mode
	socket.emit('I',buffer);
	
}

function moveLeft() {
		
		var buffer = getBinaryToSend([changeAngularVelocity],[0,PlayerCube.RotationSpeed,0]);	
			
		//binary mode
		socket.emit('I',buffer);
};

function moveRight() {
	
		var buffer = getBinaryToSend([changeAngularVelocity],[0,-PlayerCube.RotationSpeed,0]);	
				
		//binary mode
		socket.emit('I',buffer);
};

function moveForward() {
	
	var quat = PlayerCube.quanternionY();
	
	var headingAngle = PlayerCube.heading();

	//returns what our X and Z linear velocity components should be
	var thrust = LinearVelocityCalculator(headingAngle);
	
	/*determine what direction our player is facing and the correction neg/pos for applied movementForce*/			  
	 if( (quat > 0.75 && quat < 1.0) || (quat > -1  && quat < -0.75 )  ){thrust.z *=-1}
	 else {thrust.z *=1}
	
	//keep y velocity what it currently is
	var Y = PlayerCube.LVy();
	
	var buffer = getBinaryToSend([changeLinearVelocity],[thrust.x,Y,thrust.z]);	
	
	//binary mode
	socket.emit('I',buffer);
	
};

function clickShootCube() {

	 var headingAngle = PlayerCube.heading();
     var thrust = LinearVelocityCalculator(headingAngle,PlayerCube.ShotSpeed);

	 var QUAT = PlayerCube.quanternionY();

	/*Blocks to determine what direction our player is facing and the correction neg/pos for applied movementForce*/			  
	 if( (QUAT > 0.74 && QUAT < 1) || (QUAT > -1  && QUAT < -0.75 )  ){
		 thrust.z *=-1}
	else {thrust.z*=1}
	
	//4 bytes header, 24bytes data
	var buffer = new ArrayBuffer(28);
	
		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
		//create a dataview so we can manipulate our arraybuffer
		//offset 4 bytes to make room for headers
		var vectorBinary   = new Float32Array(buffer,4);
		vectorBinary[0] = PlayerCube.x();
		vectorBinary[1] = PlayerCube.y()+2;//the +2 fires bullet from TOP of player
		vectorBinary[2] = PlayerCube.z();
		vectorBinary[3] = thrust.x;
		vectorBinary[4] = 0;
		vectorBinary[5] = thrust.z;
	
		//only coding FIRST TWO bytes
		var headerBytes   = new Uint8Array(buffer,0,4);
		headerBytes[0] = fireBullet;//type of action
		headerBytes[1] = 0;//empty for now
		headerBytes[2] = 0;//empty for now
		headerBytes[3] = 0;//empty for now
		
		
		//ONLY server approves instance of a shot.  see handler for 'shot' inbound msg from server.
		//binary mode
		socket.emit('I',buffer);
};

function thrust(active){
	
	if(PlayerCube.thrustFuel <= 0)return;
	
	var LV = PlayerCube.physicsBody.getLinearVelocity();
	
	var x = LV.x();
	var y;
	if (active) {
		 y = PlayerCube.TopVerticalSpeed; 
	}else {
		 y = 0;
	}
	var z = LV.z()
	
	var buffer = getBinaryToSend([changeLinearVelocity],[x,y,z]);	
	
	//deplete thrust fule
	PlayerCube.thrustFuel--;
	
	//binary mode
	socket.emit('I',buffer);
};

function getBinaryToSend(headerArray,dataArray){
	
	//prepare binary data to be sent to server
	//dataArray will be 4byte float32 and header will be 4 Uint8
	var buffer = new ArrayBuffer((dataArray.length*4) + 4);
	
	//The float data
	var vectorBinary  = new Float32Array(buffer,4);
	for(var i=0; i<dataArray.length; i++){
		
		vectorBinary[i] = dataArray[i];
	}
	
	//the headers
	var headerBinary   = new Uint8Array(buffer,0,4);
	for(var i=0; i<headerArray.length; i++){
		
		headerBinary[i] = headerArray[i];
	}
	
	return buffer;
}


//dpad button names:
//'upLeft','up','upRight','left','center','right','downLeft','down','downRight'
		
//A and B button names:
//button1, button2
		
function GAMEPADpolling() {
	   //dpad button names:
		//'upLeft','up','upRight','left','center','right','downLeft','down','downRight'
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.up.bit ){moveForward()}
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.down.bit){moveBackward()};
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.left.bit){moveLeft()};
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.right.bit){moveRight()}; 
		
		//thrust on
	   if(GAMEPAD.leftGUI.bits & GAMEPAD.leftGUI.button1.bit ){thrust(true)}

}

function GAMEPAD_left_callback(){
	    //shoot a cube	
		if(GAMEPAD.leftGUI.bits & GAMEPAD.leftGUI.button2.bit ){clickShootCube()}
		
		//thrust on
	   if(GAMEPAD.leftGUI.bits ^ GAMEPAD.leftGUI.button1.bit ){thrust(false);}
}

function GAMEPAD_right_callback(){
		
		//no dpad buttons are down clear angular and linear velocity
		if(GAMEPAD.rightGUI.bits === 0){

			PlayerCube.setLV(0,0,0);
			PlayerCube.setAV(0,0,0);
			
			//prepare binary data
			var buffer = getBinaryToSend([changeALLvelocity],[0,0,0,0,0,0])
		
			//send binary data
			socket.emit('I',buffer);
		}
		
		//If no movment buttons are down, set linear velocity to 0
		else if(GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.up.bit && 
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.upRight.bit &&
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.upLeft.bit && 
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.down.bit &&
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.downLeft.bit &&
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.downRight.bit){

				PlayerCube.setLV(0,0,0);
				
				//prepare binary data
				var buffer = getBinaryToSend([changeLinearVelocity],[0,0,0])
		
				//send binary data
				socket.emit('I',buffer);
			}  
		
		//If no rotation buttons are down, set angular velocity to 0
		else if(GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.left.bit && 
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.right.bit &&
		    GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.upRight.bit &&
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.upLeft.bit && 
		    GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.downLeft.bit &&
		   GAMEPAD.rightGUI.bits ^ GAMEPAD.rightGUI.downRight.bit){

				PlayerCube.setAV(0,0,0);
				
				//prepare binary data
				var buffer = getBinaryToSend([changeAngularVelocity],[0,0,0])
		
				//send binary data
				socket.emit('I',buffer);
			};  
}


function render() {
       renderer.render( scene, camera );//update graphics
	   
	  // run game loop again
	    requestAnimationFrame( animate );//https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
};


	
function animate() {
		 //first sync physics with server updates if needed
		  synchronizer.sync();
		  	
        checkPlayerOrientation();// this will check if player needs to be reset because of being flipped - it's hacky tho
	
		  var deltaTime = clock.getDelta();
		
			// Step world
			physicsWorld.stepSimulation( deltaTime,10);

		  updateGraphics( deltaTime );
		  
		  //check what buttons are pressed
	      GAMEPADpolling();   
	
	/* AUTO REGEN PROPS */
	if(PlayerCube.thrustFuel < 50)PlayerCube.thrustFuel += 0.001;
	
	/*CHASE CAMERA EFFECT*/
		var relativeCameraOffset = new THREE.Vector3(camX,camY,camZ);//camera chase distance
		var cameraOffset = relativeCameraOffset.applyMatrix4( PlayerCube.graphicsBody.matrixWorld );
		camera.position.x = cameraOffset.x;
		camera.position.y = cameraOffset.y;
		camera.position.z = cameraOffset.z;
		
		camera.lookAt( PlayerCube.graphicsBody.position );
};
    

	
function updateGraphics( deltaTime ) {
	
	var IDs = Object.keys(rigidBodiesLookUp);	

	// Update graphics based on what happened with the last physics step
	for ( var i = 0, objThree,objPhys; i < IDs.length; i++ ) {
	
	//get the objects ID
	var id = IDs[i]
	objThree = rigidBodiesLookUp[id];
	objPhys = objThree.userData.physics;
	
	var ms = objPhys.getMotionState();

		if ( ms ) {
			
			//get the location and orientation of our object
			ms.getWorldTransform( transformAux1 );
			var p = transformAux1.getOrigin();
			var q = transformAux1.getRotation();
		
			//update our graphic component using data from our physics component
			objThree.position.set( p.x(), p.y(), p.z() );
			objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
		};
	};
	
	//draw all the new updates
	render();
};



function checkPlayerOrientation(){
	//11/4/16 JMN make this a PlayerCubeConstructor prototype func
	//console.log('TODO')
	/******************** orientation check hack - could be better**********/  
	
	//if player starts to rotate in z or x stop them.
	var PxRot = PlayerCube.quanternionX();
	var PzRot = PlayerCube.quanternionZ();

	//check that we haven't actually rotated too far on this axis, if we have RESET
	if(PxRot>.5 || PxRot<-.5 ||PzRot>.5 || PzRot<-.5){

		//	playerResetFromCrash();
		console.log("todo: fix reset")
		}

}

function playerResetFromCrash(){
	console.log("todo")//11/4/16 JMN this shouldn't resent here, need to be called only if server replys  to the resetMe else keep sending it, THEN apply force clear
    	//clear forces
	//	PlayerCube.setLV(0,0,0);
	//	PlayerCube.setAV(0,0,0);
		
	    socket.emit('resetMe');
	
};

GameClock = function ( ServerTime ) {

	this.startTime = ServerTime;
	this.oldTime = ServerTime;

};


GameClock.prototype.getDelta = function () {

	var delta = 0;

	var newTime = Date.now();
	//convert from mili seconds to secons 
	delta = 0.001 * ( newTime - this.oldTime );
	this.oldTime = newTime;

	return delta;
};

GameClock.prototype.sync = function (timeStamp) {

	var delta = 0;

	var newTime = Date.now();
	//convert from mili seconds to secons 
	delta = 0.001 * ( newTime - timeStamp );
	
	return delta;
};


ServerPhysicsSync = function (physicsWorld,rigidBodiesLookUp) {

	this.pendingUpdates = false;
	this.TimeStamp = 0;
	this.deltaTime = 0;
	this.ServerUpdates; 
	this.localPhysicsWorld = physicsWorld;
	this.rigidBodiesLookUp = rigidBodiesLookUp;
	this.transformAux1 = new Ammo.btTransform();
	this.vector3Aux1 = new Ammo.btVector3();
	this.quaternionAux1 = new Ammo.btQuaternion();
	this.divergenceThreshold = .5;
	this.gameClock;
	this.PlayerCube;
	
	//local data
	this.ObjectsData = new Object();
	
	this.data = new Object();
	
	//structure key of inbound data array from server so we know what index goes to what property
	this.objID = 0;//prop 1
	this.x = 1;//prop 2
	this.y = 2;//prop 3
	this.z = 3;//prop 4
	this.Rx = 4;//prop 5
	this.Ry = 5;//prop 6
	this.Rz = 6;//prop 7
	this.Rw = 7;//prop 8
	this.AVx = 8;
	this.AVy = 9;
	this.AVz = 10;
	this.LVx = 11;
	this.LVy = 12;
	this.LVz = 13;
	this.propsPerObject = 14; // 8 props default, server sends this each time
	this.byteBase = 4; //32bit float from Float32Array()
	this.bytesPerObject = this.byteBase * this.propsPerObject; // 8 props, 4 bytes per prop: 8x4 = 32
};

ServerPhysicsSync.prototype.DefineDataStructure = function (define){
	console.log('WARNING : DefineDataStructure() was called.  This can have SERIOUS affects.  This method alters how data is read from server')
	/************* THIS IS A CONCEPT, NOT ACTUALLY USED 10/24/16***************************/
	//build the structure key of inbound data array from server so we know what index goes to what property
	//instead of hardcoding on client, this function builds our data index to object property link
	//'define' is a JSON with properties that correspond with array position
	this.x = define.x;
	this.y = define.y;
	this.z = define.z;
	this.Rx = define.Rx;
	this.Ry = define.Ry;
	this.Rz = define.Rz;
	this.LVx = define.LVx;
	this.LVy = define.LVy;
	this.LVz = define.LVz;
	this.AVx = define.AVx;
	this.AVy = define.AVy;
	this.AVz = define.AVz;
};

ServerPhysicsSync.prototype.assignPlayer = function (PlayerCube) {
	this.PlayerCube = PlayerCube;
}
ServerPhysicsSync.prototype.linkGameClock = function (clock) {
	this.gameClock = clock;
}
ServerPhysicsSync.prototype.queUpdates = function (updates) {

	if(!this.pendingUpdates){
		this.pendingUpdates = true;
		this.ServerUpdates = updates.data.slice(1);//skip first, that's a header
		this.propsPerObject = Math.floor(updates.data[0]);//want whole number, passed as float to simplify data read/write
		
		//console.log(this.ServerUpdates)
		this.TimeStamp  = updates.time;
	};
};

ServerPhysicsSync.prototype.sync = function () {
	
	if(this.pendingUpdates){
		//convert from mili seconds to seconds 
		this.deltaTime  = 0.001 * ( Date.now() - this.TimeStamp  );
		this.ApplyUpdates();
		return true;
	};
};

ServerPhysicsSync.prototype.GetLocalWorldState = function(){
	
	
	var IDs = Object.keys(this.rigidBodiesLookUp);	
	
	// grab current state of things
	for ( var i = 0, objPhys; i < IDs.length; i++ ) {
	
		//get the objects ID
		var id = IDs[i]
		objPhys = this.rigidBodiesLookUp[id].userData.physics;
	
		var ms = objPhys.getMotionState();

			if ( ms ) {
			
				//get the location and orientation of our MOVING object
				ms.getWorldTransform( this.transformAux1 );
				var p = this.transformAux1.getOrigin();
				var q = this.transformAux1.getRotation();
				var AV = objPhys.getAngularVelocity();
				var LV = objPhys.getLinearVelocity();
			
	//		if (LV.length() > 0.01|| AV.length > 0.01) {
					//update our comparisons for moving objs
					this.ObjectsData[id] = new Array();
					this.ObjectsData[id][this.objID] = id;
					this.ObjectsData[id][this.x] = p.x();
					this.ObjectsData[id][this.y] = p.y();
					this.ObjectsData[id][this.z] = p.z();
					this.ObjectsData[id][this.Rx] = q.x();
					this.ObjectsData[id][this.Ry] = q.y();
					this.ObjectsData[id][this.Rz] = q.z();
					this.ObjectsData[id][this.Rw] = q.w();
					this.ObjectsData[id][this.AVx] = AV.x();
					this.ObjectsData[id][this.AVy] = AV.y();
					this.ObjectsData[id][this.AVz] = AV.z();
					this.ObjectsData[id][this.LVx] = LV.x();
					this.ObjectsData[id][this.LVy] = LV.y();
					this.ObjectsData[id][this.LVz] = LV.z();
			//	}
//	console.log('todo');//11/4/16 JMN add AV and LV props too
			};
	};
	
	this.ObjectsData.time = Date.now();
	//console.log(this.ObjectsData)
};

ServerPhysicsSync.prototype.ApplyUpdates = function (){
	
	//	console.log('time delta',Date.now()-this.TimeStamp)
		 
		/*this.ServerUpdates is a single array of float32.  index 0 contains an identifier to indicate witch rigidBody the data is for. IMPORTANT: the id is a number and must be converted to naming convetion 'idnumber'. the remaining data contains position/orientation data of moving objects in the world*/
		 for(var i=0;i<this.ServerUpdates.length; i+= this.propsPerObject){
			 
			var id = 'id'+this.ServerUpdates[i].toString();
			
			var objectPhysics = this.ObjectsData[id];
			
			/* 	** 	RUN A DIVERGENCE CHECK ON POSITION** */
			//note - ONLY relying on position will speed things up BUT at the cost of inaccurate orientation.  This will lead to errors
			//the problem is physics relies on POSITION and ORIENTATION 
			try{
				 if(  Math.abs(this.ServerUpdates[i+this.x] - objectPhysics[this.x]) > this.divergenceThreshold ||
						Math.abs(this.ServerUpdates[i+this.y] - objectPhysics[this.y]) > this.divergenceThreshold ||
						Math.abs(this.ServerUpdates[i+this.z] - objectPhysics[this.z]) > this.divergenceThreshold ){
		 
		    	    //DIVERGENCE check failed! replace everything locally with what the server says, smooth using interpolation		
					//get the object
		      	var objPhys = this.rigidBodiesLookUp[id].userData.physics;
		      
						var interpolateX = objectPhysics[this.x] + (this.ServerUpdates[i+this.x]  - objectPhysics[this.x])* INTERPOLATE_AMT;

						
						var interpolateY = objectPhysics[this.y] +(this.ServerUpdates[i+this.y]  - objectPhysics[this.y])* INTERPOLATE_AMT;			

						
						var interpolateZ = objectPhysics[this.z] +(this.ServerUpdates[i+this.z]  - objectPhysics[this.z])* INTERPOLATE_AMT;

					
						//vector for position update	//this.vector3Aux1.setValue(this.ServerUpdates[i+this.x],this.ServerUpdates[i+this.y],this.ServerUpdates[i+this.z]);
						this.vector3Aux1.setValue(interpolateX,interpolateY,interpolateZ);

						
						//apply to transform
						this.transformAux1.setOrigin(this.vector3Aux1);
					
						//sets the quaternion based on objects SEVER physics
						this.quaternionAux1.setValue(this.ServerUpdates[i+this.Rx],this.ServerUpdates[i+this.Ry],this.ServerUpdates[i+this.Rz],this.ServerUpdates[i+this.Rw]);	
				   	
						//apply to transform
						this.transformAux1.setRotation(this.quaternionAux1);
													
						//apply position rotation update to object
						objPhys.setWorldTransform(this.transformAux1);
					
						//vector for angular velocity
				//		this.vector3Aux1.setValue(this.ServerUpdates[i+this.AVx],this.ServerUpdates[i+this.AVy],this.ServerUpdates[i+this.AVz])						
						
						//apply angular velocity
						//objPhys.setAngularVelocity(this.vector3Aux1);
						
						//vector for linear velocity
						//INTERPOLATE
						 interpolateX = objectPhysics[this.LVx] + (this.ServerUpdates[i+this.LVx]  - objectPhysics[this.LVx])* INTERPOLATE_AMT;
						
						 interpolateY = objectPhysics[this.LVy] +(this.ServerUpdates[i+this.LVy]  - objectPhysics[this.LVy])* INTERPOLATE_AMT;						
						
						 interpolateZ = objectPhysics[this.LVz] +(this.ServerUpdates[i+this.LVz]  - objectPhysics[this.LVz])* INTERPOLATE_AMT;

					//	this.vector3Aux1.setValue(this.ServerUpdates[i+this.LVx],this.ServerUpdates[i+this.LVy],this.ServerUpdates[i+this.LVz])
						this.vector3Aux1.setValue(interpolateX,interpolateY,interpolateZ);
						
						//apply linear velocity
						objPhys.setLinearVelocity(this.vector3Aux1);		
				}
			}catch(err){console.log(err)}		  
			
		 };
	//	this.localPhysicsWorld.stepSimulation( this.deltaTime,10);
		
		//reset flag
		this.pendingUpdates = false;	
};





	

//MAIN
init();// start world building

function init() {

		initGraphics();
		initPhysics();
		
		//create the synchronizer to merge local and server side physics
		 synchronizer = new ServerPhysicsSync(physicsWorld,rigidBodiesLookUp);
		
			
		
		//the DefineDataStructure method isn't actually used as of 10/24/16.  Arg passed
		//is an object that is supposed to come from the server telling client how to read ALL update data
		//synchronizer.DefineDataStructure({x:0,y:1,z:2});
		
		//console.log(synchronizer);
}