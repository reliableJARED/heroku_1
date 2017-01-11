
var app = require('express')();

//https://www.npmjs.com/package/ammo-node
require('ammo-node');//physics
var objectFactory = require(__dirname +'/resources/server/PhysicsObjectFactory.js');//returns object constructors
var physicsWorld =  require(__dirname +'/resources/server/physicsWorldManager.js');//returns an instance of world manager

//Express initializes app to be a function handler that you can supply to an HTTP server
var http = require('http').Server(app);

//A server that integrates with (or mounts on) the Node.JS HTTP Server: socket.io
var io = require('socket.io')(http);

var port = process.env.PORT || 5000; 

//var ip = '192.168.1.100'
var ip = '192.168.1.103'
//var ip = '10.10.10.100'


//required for serving locally when testing
var serveStatic = require('serve-static');
app.use(serveStatic(__dirname+'/'));
app.use(serveStatic(__dirname + '/resources/'));
app.use(serveStatic(__dirname + '/resources/images/'));
app.use(serveStatic(__dirname + '/resources/images/textures'));
app.use(serveStatic(__dirname + '/resources/client/'));
app.use(serveStatic(__dirname + '/static/three.js/build/'));
app.use(serveStatic(__dirname + '/static/three.js/controls/'));
app.use(serveStatic(__dirname + '/static/ammo.js/'));
app.use(serveStatic(__dirname + '/static/HID/'));
app.use(serveStatic(__dirname + '/static/socket.io/'));

//serve HTML to initial get request
app.get('/', function(request, response){
	response.sendFile(__dirname+'/game.html');
});

//listen for connections
//http.listen(port, ip,function(){  //on an IP
	http.listen(port,function(){ // Local Host
	console.log('listening on port: '+port);
	console.log('serving files from root: '+__dirname);
	});	


//GLOBAL variables
const updateFrequency = .5;//Seconds
physicsWorld.GameClock(updateFrequency);
const SIMULATION_STEP_FREQUENCY = 16;//miliseconds


//EXAMPLE
/*nodeJS inheritence construct example */
/*******************************************************/
var aBaseClass  = require(__dirname +'/resources/server/baseClass.js');//returns constructor
var aChildClass  = require(__dirname +'/resources/server/childClass.js')(aBaseClass);//returns instance
aChildClass.printBase()
aChildClass.printChild()

aBaseClass.prototype.oneMoreThing = function(){
	console.log('an after thought!');
}

aChildClass.oneMoreThing();
/*******************************************************/



		

var TEXTURE_FILES_INDEX = {
	ground:0,
	blocks_1:1,
	playerFace:2,
	envXneg:3,
	envXpos:4,
	envYneg:5,
	envYpos:6
	};
	
var TEXTURE_FILES =[
	'snow.png',
	'snow_small.png',
	'playerFace.png',
	'snow_mountain_xneg.png',
	'snow_mountain_xpos.png',
	'snow_mountain_yneg.png',
	'snow_mountain_ypos.png'];




//coding for player inputs
const	    applyCentralImpulse = 1;         
const		applyTorqueImpulse = 2;       
const		applyTorque = 4;       
const		applyCentralForce = 8;   
const 		changeALLvelocity = 16;		
const 		changeLinearVelocity = 32;		
const 		changeAngularVelocity = 64;		
const       fireBullet = 128;
	
var PlayerObject = function(blueprint){
	
	//players are instances of cubes
	objectFactory.CubeObject.call(this,blueprint);
	
	this.createPhysics();
	//DEFAULT call addGraphics to assign 'no assignment'.  call again on the actual obj to assign real graphics.
	this.addGraphics();
	
	var defaults = {health:100,bullets:10};	  
		
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
PlayerObject.prototype =  Object.create(objectFactory.CubeObject.prototype); 
PlayerObject.prototype.constructor = PlayerObject;
PlayerObject.prototype.BinaryExport_PlayerAttributes = function () {
	
		var indexLoc = this.attribute_indexLocations;
		var attributes =  this.attributes;
		
		var int8attributes = new Int8Array(2);//ORDER: health,bullets	
		int8attributes[indexLoc.health] = attributes.health;
		int8attributes[indexLoc.bullets] = attributes.bullets;
		
		return Buffer.from(int8attributes.buffer);
	
}

function SendUpdateToClients(){

	var buffer = physicsWorld.getWorldUpdateBuffer();

	//TESTING!!!
	//only update 'argument' random objects
	var buffer = physicsWorld.getWorldUpdateBuffer_randomObjs(10)
	var buffer = physicsWorld.getWorldUpdateBuffer_randomObjs(Object.keys(physicsWorld.rigidBodiesMasterObject).length/4);

	console.log("update bytes sent:",buffer.length);

	io.emit('U', buffer);
	//console.log('update sent')
	 //:::TESTING:::
	//for(var object in physicsWorld.rigidBodiesMasterObject){
		
		//console.log(object," X,Y,Z:", ~~physicsWorld.rigidBodiesMasterObject[object].x(),~~physicsWorld.rigidBodiesMasterObject[object].y(),~~physicsWorld.rigidBodiesMasterObject[object].z()," Rx,Ry,Rz:", physicsWorld.rigidBodiesMasterObject[object].Rx(),physicsWorld.rigidBodiesMasterObject[object].Ry(), physicsWorld.rigidBodiesMasterObject[object].Rz());
	//}
	//:::::::::::::
	
}

function TickPhysics() {
		
	 //:::TESTING:::
	//for(var object in physicsWorld.rigidBodiesMasterObject){
		
	//	console.log(object," X ", physicsWorld.rigidBodiesMasterObject[object].x());
	//}
	//:::::::::::::
	 
	  // physicsWorld.step( deltaTime );
	   physicsWorld.world.stepSimulation( physicsWorld.GameClock_getDelta(),10);

	   //loop our physics at about X fps
		setTimeout( TickPhysics, SIMULATION_STEP_FREQUENCY);//milisecond callback timer
		
		//return bool that is true every 'updateFrequency' seconds
		if (physicsWorld.GameClock_UpdateTime()){
			//next loop send the serverupdate
			process.nextTick(function (){SendUpdateToClients()} );
		}
    };
	
	

//TESTING LOOP
setInterval(loopNewBoxAddition,500);
	
function loopNewBoxAddition() {
        //ADD NEW WORLD OBJECT
			var box = new objectFactory.CubeObject({x:2,y:20,mass:50});
			var randomColor = Math.random() * 0xffffff;
			box.addGraphics({colors:{wrap:randomColor}});
			//add to world
			physicsWorld.add(box);
			
			//broadcast new addtion
			addObjectToClientWorlds(box);	
}


function BuildWorldStateForNewConnection(socket_id){
	
	var msgByteCount = 0;
	var totalObjs = Object.keys(physicsWorld.rigidBodiesMasterObject).length;
	
	//Data Header buffer: PHYSICS
	var physicsHeader =  physicsWorld.generatePhysicsBinaryDataHeader(totalObjs);
	//generate data
	var physicsBinary = physicsWorld.BinaryExporter({physics:physicsHeader});
	
	
	//Data Header buffer: GRAPHICS
	var graphicsHeader = physicsWorld.generateGraphicsBinaryDataHeader(totalObjs);
	//generate data
	var graphicsBinary = physicsWorld.BinaryExporter({graphics:graphicsHeader})
	
	
	/*
	//PLAYERS
	var totalPlayers = Object.keys(physicsWorld.playersMasterObject).length;
	var pheader = new Int16Array(4);
	pheader[0] = totalPlayers;
	//built in space for future info in header
	pheader[1] = 0;//UNUSED
	pheader[2] = 0;//UNUSED
	pheader[3] = 0;//UNUSED
	var binaryPlayers = Buffer.from(pheader.buffer);
	var playersBinary = physicsWorld.BinaryExporter({players:binaryPlayers})
	
	*/
	
	//create a time stamp
	var time = Date.now();
	
	console.log("send WORLD data to:",socket_id);
	console.log("physics bytes sent:",physicsBinary.length);
	console.log("graphics bytes sent:",graphicsBinary.length);
	
	//Only send to the new connection, NOT every connection
	io.to(socket_id).emit('setup',{
		time:time,
		data: physicsBinary,
		graphics:graphicsBinary,
		TEXTURE_FILES_INDEX:TEXTURE_FILES_INDEX,
		TEXTURE_FILES:TEXTURE_FILES});
			
};

function addObjectToClientWorlds(obj){
	
	//Data Header buffer: PHYSICS
	var physicsHeader =  physicsWorld.generatePhysicsBinaryDataHeader(1);
	//Data Header buffer: GRAPHICS
	var graphicsHeader = physicsWorld.generateGraphicsBinaryDataHeader(1);
	
		//PHYSICS
		var objPhyBuffer = obj.BinaryExport_ALL();
		var TotalByteLength = physicsHeader.length + objPhyBuffer.length;
		//create final Physics Buffer
		physicsBinary = Buffer.concat([physicsHeader, objPhyBuffer], TotalByteLength );
		
		//GRAPHICS
		var objGraBuffer = obj.BinaryExport_graphics();
		TotalByteLength = graphicsHeader.length + objGraBuffer.length;
		//create final Physics Buffer
		graphicsBinary = Buffer.concat([graphicsHeader, objGraBuffer], TotalByteLength );

		
	//tell players to add this
	io.emit('add',{	
		data:physicsBinary,
		graphics:graphicsBinary});
};


function NewPlayer(socketID){

	// add a new object for the player 
	//use defaults EXCEPT for width,depth, height
	var player = new PlayerObject({width:2,depth:2,height:2,y:10});
	//instead of doing a texture wrap, just put texture on
	player.addGraphics({textures:{front:TEXTURE_FILES_INDEX.playerFace}});
	//add to world
	physicsWorld.addPlayer(socketID,player);
	
	console.log(player);
	
	io.emit('newPlayerObj',{socketID:buffer});
	
	//the unique ID for the object associate with this player
	return player.id;	
}


function init(){
	
	//making a texture map for a cube
	var groundTextures = {
		front:TEXTURE_FILES_INDEX.ground,
		back:TEXTURE_FILES_INDEX.ground,
		top:TEXTURE_FILES_INDEX.ground,
		bottom:TEXTURE_FILES_INDEX.ground,
		left:TEXTURE_FILES_INDEX.ground,
		right:TEXTURE_FILES_INDEX.ground
	};
	
	//OBJECT 
	//make a cube object, use defaults EXCEPT for width, depth and mass
	var ground = new objectFactory.CubeObject({y:0,width:500,depth:500,mass:0}); 
	//apply our graphic
	ground.addGraphics({textures:groundTextures});
	//add to the world
	physicsWorld.add(ground);
	
	//OBJECT
	//make another box, use defaults EXCEPT for y location and mass 
	var box = new objectFactory.CubeObject({x:2,y:20,mass:50});
	//don't add a texture, but set its color to yellow
	box.addGraphics({colors:{wrap:0xffff00}});//YELLOW
	//add to world
	physicsWorld.add(box);
	
	
	//OBJECT 
	//make a sphere, use defaults EXCEPT for mass, Ry,rotation y,x position and apply a rotation on the X axis
	//using Angular Velocity (AV) not LV, else the object will SLIDE not ROLL even though it's a sphere
	var ball = new objectFactory.SphereObject({mass:100,Ry:1.5,y:100,x:3,AVx:10});
	//wrap it with texture
	ball.addGraphics({textures:{wrap:TEXTURE_FILES_INDEX.playerFace}});
	//add to the world
	physicsWorld.add(ball);	
	console.log(ball.id);
	
	
	//OBJECT 
	//another box, use all defaults except y
	var box2 = new objectFactory.CubeObject({y:50,z:3});
	//instead of doing a texture for each face, only texture the back
	box2.addGraphics({textures:{back:TEXTURE_FILES_INDEX.playerFace}});
	//add to world
	physicsWorld.add(box2);	
	
	
	/*
	physicsWorld.add(new objectFactory.CubeObject({y:10,mass:50}) );

	for(var i=0; i<100;i+=2){
		physicsWorld.add(new objectFactory.CubeObject({y:10+i,mass:50}) );
	}
	*/
	//Start our world clock
	physicsWorld.GameClock_start();
	
	//start physics simulation
	TickPhysics();
	

}


//*************BEGIN!
init();

/*
Good resource:
http://buildnewgames.com/optimizing-websockets-bandwidth/
*/

//socketio listener for 'connection'
io.on('connection', function(socket){
	
	
	socket.on('disconnect', function(){
		
		//var ID = physicsWorld.playersMasterObject[socket.id].id;
		//physicsWorld.removePlayer(socket.id);
		console.log('goodbye',socket.id)
		//io.emit('removePlayer',ID);
	});
	
	//log
	console.log('*****'+Date.now()+'*****');
	console.log('new user');
	console.log('Socket ID: ',socket.id);
	console.log('IP: '+socket.request.connection.remoteAddress);
	console.log('**********');
	
	//send the new connection their uniqueID, which happens to be their socketID
	//use this to send INITIAL SETUP TOO
	//io.to(socket.id).emit('yourSocketID',NewPlayer(socket.id));
	
	//send current state of everything, build specs and send out	to the NEW connection	
	BuildWorldStateForNewConnection(socket.id);	
	
	socket.on('getMyObj',function () {	
	//	socket.emit('yourObj',PlayerIndex[this.id].id)
	});


	
	socket.on('resetMe',function(){
	//	playerResetFromCrash(this.id);
	});
	
	
	//player input handler
	socket.on('I',function(data){
	//	PlayerInput(this.id,data);	  
		
	});
	
});

	
