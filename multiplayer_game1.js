//GLOBAL General variables
var connection = false;
var newPlayer = true;
var rigidBodiesLookUp = {};
var OtherPlayers = new Object;
var mouse = new THREE.Vector2();
var clock;
var UNIQUE_ID; //assigned by the server
var camX =0;var camY = 5; var camZ = -20;//Set the initial perspective for the user
var PlayerCube;


/**** Player specific vars that shouldn't be global **********/
const movementSpeed = 2;
const thrustForce = 5;
const shotFireForce = 500;
const TopSpeed = 25;
const RotationForce = 3;
const BrakeVelocity = .95;
const BrakeRotation = .95;
//add rate of fire, health, items, etc.
/**********************************************************/


var textureLoader = new THREE.TextureLoader();
var synchronizer;

//GLOBAL Physics variables
var physicsWorld;
var gravityConstant = -9.8; //should this be sent from server?
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
const MovementForce = 1;//sets the movement force from dpad


//Input Controller
var GAMEPAD = new ABUDLR({left:{GUIsize:50,callback:GAMEPAD_left_callback},right:{GUIsize:50}});

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
		//	console.log(msg);
			
		});
		
		socket.on('newPlayer',function(msg){
			//console.log(msg);
		   //don't build player if server is talking about you!
		   var NewID = Object.keys(msg)[0];
		   
		   //TODO: STORE NewID somewhere because it represents a players socketID
		   
			if( NewID === UNIQUE_ID){
				//do nothing because this is global alert to others about us
			}else{
				createBoxObject(msg[NewID]);
				};
			//	OtherPlayers[NewID] = createBoxObject(msg[NewID],true)}
		   });
		
		socket.on('playerID',function(msg){
			console.log(msg);
			//server assigned uniqueID
			UNIQUE_ID = msg;
			socket.emit('getMyObj','get');
		});

		socket.on('yourObj',function(msg){
		  	console.log(msg);
			PlayerCube = rigidBodiesLookUp[msg];
			console.log(PlayerCube)
			PlayerCube.userData.physics.setActivationState(4);//ALLWAYS ACTIVEATE
			
			//assign your player to the physics synchronizer
			synchronizer.assignPlayer(rigidBodiesLookUp[msg]);
			
			 //now that you exist, start rendering loop
			animate();	
		});		
		
		socket.on('setup', function(msg){
			console.log(msg);

			//msg is an object with an array of JSON with each root key the ID of an object
			if(newPlayer){
				var timeStamp = Object.keys(msg)[0];
			  //  console.log(Date.now()- timeStamp )
				//sync clocks
				clock = new GameClock(timeStamp);
				synchronizer.linkGameClock(clock);
			
				var worldObjects = msg[timeStamp];
				
				//msg is the array of objects
				for(var i =0; i<worldObjects.length;i++){
					
					if(worldObjects[i].shape === 'box'){
						createBoxObject(worldObjects[i]);
						}					
					};
					
				newPlayer = false;//prevent rebuild to 'setup' msg intended for new players
			};
			
		});
		

		socket.on('DefineDataStructure',function(instructions){
			//sets order of data array used to update object positions.
			//for example.  position '0' in an the array will always be an objects ID;
			//inscrutions would be an object = {id:0}.
			//this will be our key to understanding the data array in from the server during
			//the game
			synchronizer.DefineDataStructure(instructions);
		})
		
		socket.on('QC', function(){
			//this is sent ahead of a server synce update 'U' message.  It tells clients to take grab a world state to be used to compare to the servers update.  The reason to do this is TIME DELAY.  A server notification will always be from the past.  So synchronizer is checking that local and server past framse are OK.
			synchronizer.GetLocalWorldState();
		});
		
		socket.on('U', function(msg){
			//msg.data is an ArrayBuffer, you can't read/write to it without using a typedarray or dataview
			//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
			//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
		   //console.log(msg.data.byteLength)
			var dataArray = new Float32Array(msg.data);
		//	console.log(dataArray.buffer.byteLength)
			//after msg.data is loaded in to a typed array, pass to synchronizer
			synchronizer.queUpdates({time:msg.time,data:dataArray})

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
			//console.log(msg);
			//msg is an ID for an object
			//remove it
			scene.remove( rigidBodiesLookUp[msg] )
			physicsWorld.removeRigidBody( rigidBodiesLookUp[msg].userData.physics );
			delete rigidBodiesLookUp[msg];
		});
		
		//**** PLAYER INPUT HANDLER
		socket.on('I',function(msg){
			//ID is a players ID
			var ID = Object.keys(msg)[0];
			
			//msg[ID] is an ArrayBuffer with structure:
		   //first 4 bytes are 4 uint8, byte 1 encodes action being requested, next 3 vary on what they mean based on specific action.  Like shoot, move, etc.
		   //remaining bytes are for all float32 (4bytes each) that code movement commands
		   
			
			//determine what player object should be used, node that local player is called PlayerCube
			var player = (PlayerCube.userData.id === ID)? PlayerCube.userData.physics:rigidBodiesLookUp[ID].userData.physics
		
			//parse our binary data from server into readable formats
			var dataArray = new Float32Array(msg[ID],4);
			var header   = new Uint8Array(msg[ID],0,4);
		
			//Shot
			if (fireBullet & header[0]) {
				//do something with ID here? it tells us who is firing this shot Could be YOU!
				createBullet(header,dataArray);
				}
			
			//Movement
			else{
				MovementInput(player,header[0],dataArray)
			};
			;
			
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
	
	var imagePrefix = "snow_mountain_";
	var directions  = ["xneg", "xneg", "ypos", "yneg", "xpos", "xpos"];
	var imageSuffix = ".png";
	
	var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );	
	
	//create a container for the 6 faces of our environment background cube
	var materialArray = [];
	for (var i = 0; i < 6; i++)
	//KEY! THREE.BackSide to put image on inner face not outer face of cube
		materialArray.push( new THREE.MeshBasicMaterial({
			map: THREE.ImageUtils.loadTexture( imagePrefix + directions[i] + imageSuffix ),
			side: THREE.BackSide
		}));
		
	var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
	var skyBox = new THREE.Mesh( skyGeometry, skyMaterial );
	scene.add( skyBox );

};

/*********CLIENT SIDE PHYSICS ************/
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

function createBoxObject(object,returnObj) {
		//console.log('building',object)
		var material;//consider passing mat types to flag basic, phong, etc...
	
		var texture = null;
		
		var color = 0xffffff;//default is white
	//	var yourNumber = parseInt(color, 16);
	//	console.log(yourNumber)
	//	console.log(color.toString(16))
	//	console.log(parseFloat(color.toString(10)))
	//	console.log(parseFloat(color))
		
		if (object.hasOwnProperty('color')) {color = object.color};
		
		if (object.hasOwnProperty('texture') ){ 
				var textureFile = object.texture;
			//	console.log(textureFile)
			    texture = textureLoader.load(textureFile);
			 
  /*todo: PASS FLAGS FOR WRAPPING */
			   //set texture to tile the gound (don't do this if you want it to stretch to fit)			   
			//	texture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
			//	texture.repeat.set( 50, 50 );// 20x20 tiles of image
				material = new THREE.MeshBasicMaterial( { color: color, map:texture} );
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
		
		//Cube.userData.physics.setActivationState(1);// ACTIVEATEATE
		
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

function createBullet(type,data){
	
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
			Rx: 0,
			Ry: 0,
			Rz: 0,
			Rw: 1
		}
		
	var bullet = createBoxObject(bulletBlueprint,true);
	
	//create a vector to apply shot force to our bullet
	vector3Aux1.setValue(data[8],data[9],data[10]);

	//apply the movement force of the shot
	bullet.userData.physics.applyCentralImpulse(vector3Aux1)

	//set to always active.		
	bullet.userData.physics.setActivationState(4);
		
}


function MovementInput(EnemyObject,type,data){

	//set the object to active so that updates take effect
	PlayerObject.setActivationState(1);
	
	//use bit operators for comparisons to speed things up
	if(applyCentralImpulse & type[0] ){
				
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.applyCentralImpulse(vector3Aux1);
		
	}else if (applyTorque & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.applyTorque(vector3Aux1);
		
	}else if (applyTorqueImpulse & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.applyTorqueImpulse(vector3Aux1);
	
	}else if (applyCentralForce & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.applyCentralForce(vector3Aux1);
				
	}else if (changeALLvelocity & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.setLinearVelocity(vector3Aux1);
	
				vector3Aux1.setValue(data[3],data[4],data[5]);
				PlayerObject.setAngularVelocity(vector3Aux1);
				
	}else if (changeLinearVelocity & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.setLinearVelocity(vector3Aux1);
				
	}else if (changeAngularVelocity & type[0]) {
		
				vector3Aux1.setValue(data[0],data[1],data[2]);
				PlayerObject.setAngularVelocity(vector3Aux1);
	}
	
}



function moveClose(bit) {
	//check MAX Speed 
	if(TopSpeed < PlayerCube.userData.physics.getLinearVelocity().length())return;
	
	 var yRot = PlayerCube.rotation._y
	 var thrustZ = movementSpeed* Math.cos(yRot);
	 var thrustX = movementSpeed* Math.sin(yRot);
				   
	 //used to determine if thrust in the x or z should be pos or neg
	 var Zquad ;
	 var QUAT = PlayerCube.quaternion._y;

	/*Blocks to determine what direction our player is facing and the correction neg/pos for applied movementForce*/			  
	if( QUAT < 0.75  || QUAT < -0.75 ){Zquad=-1}
	else {Zquad=1}
	
	thrustZ = thrustZ*Zquad
	
	/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
	//	vector3Aux1.setValue(-thrustX,0,thrustZ);
	//PlayerCube.userData.physics.applyCentralImpulse(vector3Aux1);
	*/
	
	
	//SEND TO SERVER you want to apply a central impulse
	//socket.emit('ACI',{x:-thrustX, y:0 ,z:thrustZ});
	//need 2 bytes to encode u,d,l,r, etc.
	//need 12 bytes for the 3 float32 (4bytes each) x,y,z data
	//total is 16 because of offset, have dead space from byte 3 to 4, could
	//encode for Right or Left controler there
	var buffer = new ArrayBuffer(16);
	var vectorBinary   = new Float32Array(buffer,4);
	vectorBinary[0] = -thrustX;
	vectorBinary[1] = 0;
	vectorBinary[2] = thrustZ;
	
	//only coding FIRST TWO bytes
	var headerBytes   = new Uint8Array(buffer,0,4);
	headerBytes[0] = applyCentralImpulse;//type of action
	headerBytes[1] = bit;//represents button being pressed
	headerBytes[2] = 0;//empty for now
	headerBytes[3] = 0;//empty for now
		
		
	//binary mode
	socket.emit('I',buffer);
	
}

function moveLeft(bit) {
		
	var P = PlayerCube.userData.physics;
	var Pv = P.getAngularVelocity().y();
	var RF = RotationForce;
	
	//check MAX rotation 
	if(Pv > 1){return}
	else{
		//boost is used to add an exponentially powerful reverse rotation so that if player can change direction more quickly
		var boost;
		
		if(Pv<0){
				boost = Math.abs(RF*Pv );
			}else{boost = 1};
		
		//Rotate
		var rot = RF + (boost*boost);
		
		/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
		//vector3Aux1.setValue(0,rot,0);
		//P.applyTorque(vector3Aux1);
		*/
		//SEND TO SERVER you want to apply a torque
		//socket.emit('AT',{x:0, y:rot ,z:0});
	//need 2 bytes to encode u,d,l,r, etc.
	//need 12 bytes for the 3 float32 (4bytes each) x,y,z data
	//total is 16 because of offset, have dead space from byte 3 to 4, could
	//encode for Right or Left controler there
		var buffer = new ArrayBuffer(16);
		var vectorBinary   = new Float32Array(buffer,4);
		vectorBinary[0] = 0;
		vectorBinary[1] = rot;
		vectorBinary[2] = 0;
	
		//only coding FIRST TWO bytes
		var headerBytes   = new Uint8Array(buffer,0,4);
		headerBytes[0] = applyTorque;//type of action
		headerBytes[1] = bit;//represents button being pressed
		headerBytes[2] = 0;//empty for now
		headerBytes[3] = 0;//empty for now
		
		//binary mode
		socket.emit('I',buffer);
	};	
};

function moveRight(bit) {
	
	var P = PlayerCube.userData.physics;
	var Pv = P.getAngularVelocity().y();
	var RF = RotationForce;
	
	//check MAX rotation 
	if(Pv < -1){return}
	else{
		//boost is used to add an exponentially powerful reverse rotation so that if player can change direction more quickly
		var boost;
		if(Pv>0){
					boost = Math.abs(RF*Pv );
			}else{boost = 1};
		//Rotate
		var rot = (RF + (boost*boost)) * -1;
		
		/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
		vector3Aux1.setValue(0,rot,0);
		P.applyTorque(vector3Aux1);
		*/
		
		
		//SEND TO SERVER you want to apply a torque
	//	socket.emit('AT',{x:0, y:rot ,z:0});
		//need 2 bytes to encode u,d,l,r, etc.
	//need 12 bytes for the 3 float32 (4bytes each) x,y,z data
	//total is 16 because of offset, have dead space from byte 3 to 4, could
	//encode for Right or Left controler there
		var buffer = new ArrayBuffer(16);
	
		var vectorBinary   = new Float32Array(buffer,4);
		vectorBinary[0] = 0;
		vectorBinary[1] = rot;
		vectorBinary[2] = 0;

		//only coding FIRST TWO bytes
		var headerBytes   = new Uint8Array(buffer,0,4);
		headerBytes[0] = applyTorque;//type of action
		headerBytes[1] = bit;//represents button being pressed
		headerBytes[2] = 0;//empty for now
		headerBytes[3] = 0;//empty for now
		
		//binary mode
		socket.emit('I',buffer);
	};	
}


function moveAway(bit) {
	
	//This function is called from the dpad on the RIGHT gui for the gamepad
	
	//check MAX Speed 
	if(TopSpeed < PlayerCube.userData.physics.getLinearVelocity().length())return;
	
	 var yRot =PlayerCube.rotation._y
	 var thrustZ = movementSpeed* Math.cos(yRot);
	 var thrustX = movementSpeed* Math.sin(yRot);
				   
				   //used to determine if thrust in the x or z should be pos or neg
	var Zquad ;

	var QUAT = PlayerCube.quaternion._y;

				/*Blocks to determine what direction our player is facing and the correction neg/pos for applied movementForce*/			  
	 if( (QUAT > 0.75 && QUAT < 1.0) || (QUAT > -1  && QUAT < -0.75 )  ){Zquad=-1}
				 else {Zquad=1}
	
	thrustZ = thrustZ*Zquad;
	
	/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
	vector3Aux1.setValue(thrustX,0,thrustZ);
	PlayerCube.userData.physics.applyCentralImpulse(vector3Aux1);
	*/
	
	//SEND TO SERVER you want to apply a central impulse

//	socket.emit('ACI',{x:thrustX,y:0 ,z:thrustZ});
	
	//need 2 bytes to encode u,d,l,r, etc.
	//need 12 bytes for the 3 float32 (4bytes each) x,y,z data
	//total is 16 because of offset, have dead space from byte 3 to 4, could
	//encode for Right or Left controler there
	var buffer = new ArrayBuffer(16);
	
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
	//create a dataview so we can manipulate our arraybuffer
	//ONLY for the xyz, that's why there is an offset
	var vectorBinary   = new Float32Array(buffer,4);
	vectorBinary[0] = thrustX;
	vectorBinary[1] = 0;
	vectorBinary[2] = thrustZ;
	
	//only coding FIRST TWO bytes
	var headerBytes   = new Uint8Array(buffer,0,4);
	headerBytes[0] = applyCentralImpulse;//type of action
	headerBytes[1] = bit;//represents button being pressed
	headerBytes[2] = 0;//empty for now
	headerBytes[3] = 0;//empty for now
		
	//binary mode
	socket.emit('I',buffer);
	
}

function moveBrake(bit) {	

		var player = PlayerCube.userData.physics;
		
		var Lv = player.getLinearVelocity();
	    var LVx = (Lv.x()*BrakeVelocity);
	    var LVy = (Lv.z()*BrakeVelocity);
	    var LVz = (Lv.y());//breaking doesn't work for UP/DOWN
		
		vector3Aux1.setValue(LVx,LVy,LVz);	//r
		
		/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
		//slow linear Velocity
		player.setLinearVelocity(vector3Aux1);
	*/
		//slow rotation
	    var Av = player.getAngularVelocity();
	 	var AVx = (Av.x());//breaking doesn't work for Z or X
		var AVy = (Av.z());//breaking doesn't work for Z or X
		var AVz = (Av.y()*BrakeRotation);
		vector3Aux1.setValue(AVx,AVy,AVz);
		
		/**** COMMENTED BELLOW MEANS YOU ONLY MOVE WHEN SERVER TELLS YOU
		player.setAngularVelocity(vector3Aux1)
		*/
		
		//4 bytes header, 24bytes data
		var buffer = new ArrayBuffer(28);
	
		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
		//create a dataview so we can manipulate our arraybuffer
		//offset 4 bytes to make room for headers
		var vectorBinary   = new Float32Array(buffer,4);
		vectorBinary[0] = LVx;
		vectorBinary[1] = LVy;
		vectorBinary[2] = LVz;
		vectorBinary[3] = AVx;
		vectorBinary[4] = AVy;
		vectorBinary[5] = AVz;
	

		//only coding FIRST TWO bytes
		var headerBytes   = new Uint8Array(buffer,0,4);
		headerBytes[0] = changeALLvelocity;//type of action
		headerBytes[1] = bit;//represents button being pressed
		headerBytes[2] = 0;//empty for now
		headerBytes[3] = 0;//empty for now
		
		//binary mode
		socket.emit('I',buffer);
};


function clickShootCube(bit) {
	
	/*TODO: Convert this to the binary, not JSON protocol */
	
//	console.log('shot')
	 var pos = PlayerCube.position;
	 var yRot = PlayerCube.rotation._y
	 var thrustZ = shotFireForce* Math.cos(yRot);
	 var thrustX = shotFireForce* Math.sin(yRot);
				   
	 //used to determine if thrust in the x or z should be pos or neg
	 var Zquad ;
	 var QUAT = PlayerCube.quaternion._y;

	/*Blocks to determine what direction our player is facing and the correction neg/pos for applied movementForce*/			  
	 if( (QUAT > 0.74 && QUAT < 1.0) || (QUAT > -1  && QUAT < -0.74 )  ){Zquad=-1}
	else {Zquad=1}
	
	thrustZ = thrustZ*Zquad
	
	
	//4 bytes header, 24bytes data
		var buffer = new ArrayBuffer(28);
	
		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
		//create a dataview so we can manipulate our arraybuffer
		//offset 4 bytes to make room for headers
		var vectorBinary   = new Float32Array(buffer,4);
		vectorBinary[0] = pos.x;
		vectorBinary[1] = pos.y+2;//the +2 fires bullet from TOP of player
		vectorBinary[2] = pos.z;
		vectorBinary[3] = thrustX;
		vectorBinary[4] = 0;
		vectorBinary[5] = thrustZ;
	
		//only coding FIRST TWO bytes
		var headerBytes   = new Uint8Array(buffer,0,4);
		headerBytes[0] = fireBullet;//type of action
		headerBytes[1] = bit;//represents button being pressed
		headerBytes[2] = 0;//empty for now
		headerBytes[3] = 0;//empty for now
		
		//ONLY server approves instance of a shot right now.  see handler for 'shot' inbound msg from server.
		//binary mode
		socket.emit('I',buffer);
}

function thrustON(bit){
	

	vector3Aux1.setValue(0,thrustForce,0);
	PlayerCube.userData.physics.applyCentralImpulse(vector3Aux1);	
	
	//SEND TO SERVER you want to apply a central impulse
	//socket.emit('ACI',{x:0,y:thrustForce ,z:0});
	//need 2 bytes to encode u,d,l,r, etc.
	//need 12 bytes for the 3 float32 (4bytes each) x,y,z data
	//total is 16 because of offset, have dead space from byte 3 to 4, could
	//encode for Right or Left controler there
	var buffer = new ArrayBuffer(16);
	
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
	//create a dataview so we can manipulate our arraybuffer
	//ONLY for the xyz, that's why there is an offset
	var vectorBinary   = new Float32Array(buffer,4);
	vectorBinary[0] = 0;
	vectorBinary[1] = thrustForce;
	vectorBinary[2] = 0;
	
	//only coding FIRST FOUR bytes
	var buttonBit   = new Uint8Array(buffer,0,4);
	buttonBit[0] = applyCentralImpulse;//type of action, this case applyCentralImpulse()
	buttonBit[1] = bit;//represents button being pressed
	//binary mode
	socket.emit('I',buffer);
};

function GAMEPADpolling() {
	
	   if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.up.bit ){moveAway(GAMEPAD.rightGUI.up.bit)};
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.down.bit){moveClose(GAMEPAD.rightGUI.down.bit)};
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.left.bit){moveLeft(GAMEPAD.rightGUI.left.bit)};
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.right.bit){moveRight(GAMEPAD.rightGUI.right.bit)};  
		if(GAMEPAD.rightGUI.bits & GAMEPAD.rightGUI.center.bit){moveBrake(GAMEPAD.rightGUI.center.bit)};  
		if(GAMEPAD.leftGUI.bits & GAMEPAD.leftGUI.button1.bit ){thrustON(GAMEPAD.leftGUI.button1.bit)}//thrust on
}

function GAMEPAD_left_callback(){
	//shoot a cube	
		if(GAMEPAD.leftGUI.bits & GAMEPAD.leftGUI.button2.bit ){clickShootCube(GAMEPAD.leftGUI.button2.bit)}
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
  
	/*CHASE CAMERA EFFECT*/
		var relativeCameraOffset = new THREE.Vector3(camX,camY,camZ);//camera chase distance
		var cameraOffset = relativeCameraOffset.applyMatrix4( PlayerCube.matrixWorld );
		camera.position.x = cameraOffset.x;
		camera.position.y = cameraOffset.y;
		camera.position.z = cameraOffset.z;
		
		camera.lookAt( PlayerCube.position );
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
	//console.log('check')
	/******************** orientation check hack - could be better**********/
	
	//if player starts to rotate in z or x stop them.
	var PxRotV = PlayerCube.userData.physics.getAngularVelocity().x()//PlayerCube.userData.physics.getWorldTransform().getRotation().x();
	var PzRotV = PlayerCube.userData.physics.getAngularVelocity().z()//PlayerCube.userData.physics.getWorldTransform().getRotation().z();
	var maxRot = 0.01;
	
	if(PxRotV > maxRot){		
		
		var PxRot = PlayerCube.userData.physics.getWorldTransform().getRotation().x();
	
		//check that we haven't actually rotated too far on this axis, if we have RESET
		if(PxRot>.5 || PxRot<-.5){
			playerResetFromCrash();
		}else{
		//	console.log('correcting')
			//get the angular velocity of the player keep y and z compoent, set x to half current
			var AVx = PxRotV * .5
			var AVy = PlayerCube.userData.physics.getAngularVelocity().y();
			vector3Aux1.setX( AVx );
			vector3Aux1.setY( AVy );
			vector3Aux1.setZ( PzRotV );
			PlayerCube.userData.physics.setAngularVelocity(vector3Aux1);
		
			//4 bytes header, 12bytes data
			var buffer = new ArrayBuffer(16);
			
			//header
			var buttonBit   = new Uint8Array(buffer,0,4);
			buttonBit[0] = changeAngularVelocity;//type of action
			buttonBit[1] = 0;//represents button being pressed
		
			//data
			var vectorBinary   = new Float32Array(buffer,4);
			vectorBinary[3] = AVx;
			vectorBinary[4] = AVy;
			vectorBinary[5] = PzRotV;
	
			//binary mode
			socket.emit('I',buffer);
		}
	}

	if(PzRotV > maxRot){
		
		var PzRot = PlayerCube.userData.physics.getWorldTransform().getRotation().z();
		
		//check that we haven't actually rotated too far on this axis, if we have RESET
		if(PzRot>.5 || PxRot<-.5){
			playerResetFromCrash();
		}else{
		//	console.log('correcting')
			//get the angular velocity of the player keep y and x compoent, set z to half current
			var AVz = PzRotV * .5
			var AVy = PlayerCube.userData.physics.getAngularVelocity().y();
		
			vector3Aux1.setX( PxRotV);
			vector3Aux1.setY( AVy);
			vector3Aux1.setZ( AVz );
			PlayerCube.userData.physics.setAngularVelocity(vector3Aux1);
	
			//4 bytes header, 12bytes data
			var buffer = new ArrayBuffer(16);
			
			//header
			var buttonBit   = new Uint8Array(buffer,0,4);
			buttonBit[0] = changeAngularVelocity;//type of action
			buttonBit[1] = 0;//represents button being pressed
		
			//data
			var vectorBinary   = new Float32Array(buffer,4);
			vectorBinary[3] = PxRotV;
			vectorBinary[4] = AVy;
			vectorBinary[5] = AVz;
	
			//binary mode
			socket.emit('I',buffer);
		}

	}

}

function playerResetFromCrash(){
	//clear forces
		PlayerCube.userData.physics.setLinearVelocity(new Ammo.btVector3(0,0,0));
		PlayerCube.userData.physics.setAngularVelocity(new Ammo.btVector3(0,0,0));
		
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
	this.divergenceThreshold = 1;
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
	this.propsPerObject = 8; // 8 props default, server sends this each time
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
			
				//get the location and orientation of our object
				ms.getWorldTransform( transformAux1 );
				var p = transformAux1.getOrigin();
				var q = transformAux1.getRotation();
		
				//update our comparisons
				this.ObjectsData[id] = new Array();
				this.ObjectsData[id][0] = p.x();
				this.ObjectsData[id][1] = p.y();
				this.ObjectsData[id][2] = p.z();
				this.ObjectsData[id][3] = q.x();
				this.ObjectsData[id][4] = q.y();
				this.ObjectsData[id][5] = q.z();
				this.ObjectsData[id][6] = q.w();
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
			try{
				if(  Math.abs(this.ServerUpdates[i+this.x] - objectPhysics[0]) > this.divergenceThreshold ||
					Math.abs(this.ServerUpdates[i+this.y] - objectPhysics[1]) > this.divergenceThreshold ||
					Math.abs(this.ServerUpdates[i+this.z] -objectPhysics[2]) > this.divergenceThreshold ){
		//				console.log('out of sync',id)
						var objPhys = this.rigidBodiesLookUp[id].userData.physics;
					
						//vector for position update
						this.vector3Aux1.setValue(this.ServerUpdates[i+this.x],this.ServerUpdates[i+this.y],this.ServerUpdates[i+this.z]);
						//apply to transform
						this.transformAux1.setOrigin(this.vector3Aux1);
				
						/*currently ONLY APPLY ROTATION CORRECTION FOR NON PLAYER*/
						//reason has to do with steering the player, may be able to skip this
						if(this.PlayerCube.userData.id === id){
							//current orientation
							var quat = objPhys.getWorldTransform().getRotation();
							//sets the quaternion based on players LOCAL physics
							this.quaternionAux1.setValue(quat.x(),quat.y(),quat.z(),quat.w());
						}else{
							//sets the quaternion based on objects SEVER physics
							this.quaternionAux1.setValue(this.ServerUpdates[i+this.Rx],this.ServerUpdates[i+this.Ry],this.ServerUpdates[i+this.Rz],this.ServerUpdates[i+this.Rw]);
						};
	
						//build update
						this.transformAux1.setRotation(this.quaternionAux1);
						
						//apply update
						objPhys.setWorldTransform(this.transformAux1);
					
					}


			}catch(err){console.log(err)}		  
			
		 };
		
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