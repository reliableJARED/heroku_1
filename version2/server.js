
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
//var ip = '192.168.1.102'
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


http.listen(port, function(){
	console.log('listening on port: '+port);
	console.log('serving files from root: '+__dirname);
	});	


//GLOBAL variables
const updateFrequency = 1;//Seconds
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
	

function SendUpdateToClients(){
	var buffer = physicsWorld.getWorldUpdateBuffer();

	io.emit('U', buffer);
	console.log('update sent')
	
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
			process.nextTick(function (){SendUpdateToClients()} );
		}
    };
	

function BuildWorldStateForNewConnection(socket_id){
	
	
	var msgByteCount = 0;
	var totalObjs = physicsWorld.rigidBodiesMasterArray.length;
	
	//PHYSICS
	var header = new Int16Array(4);
	header[0] = totalObjs;
	header[1] = 14;//number of f32 props that lead every object
	//built in space for future info in header
	header[2] = 0;//UNUSED
	header[3] = 0;//UNUSED
	var binaryData = Buffer.from(header.buffer);
	
	var physicsBinary = physicsWorld.BinaryExporter({physics:binaryData});
	
	
	//GRAPHICS
	var gheader = new Int16Array(4);
	gheader[0] = totalObjs;
	//built in space for future info in header
	gheader[1] = 0;//UNUSED
	gheader[2] = 0;//UNUSED
	gheader[3] = 0;//UNUSED
	var binaryGraphics = Buffer.from(gheader.buffer);
	var graphicsBinary = physicsWorld.BinaryExporter({graphics:binaryGraphics})
	
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
	
	//OBJECT 1
	//make a cube object, use defaults EXCEPT for width, depth and mass
	var ground = new objectFactory.CubeObject({y:0,width:50,depth:50,mass:0}); 
	//apply our graphic
	ground.addGraphics({textures:groundTextures});
	//add to the world
	physicsWorld.add(ground);
	
	//OBJECT 2
	//make another box, use defaults EXCEPT for y location and mass 
	var player = new objectFactory.CubeObject({x:2,y:20,mass:50});
	//don't add a texture, but set its color to yellow
	player.addGraphics({colors:{wrap:0xffff00}});//YELLOW
	//add to world
	physicsWorld.add(player);	
	
	//OBJECT 3
	//make a sphere, use defaults EXCEPT for Ry,rotation y,x position and apply a linear velocity on X axis; 
	var ball = new objectFactory.SphereObject({Ry:1.5,y:10,x:3,LVx:10});
	//wrap it with texture
	ball.addGraphics({textures:{wrap:TEXTURE_FILES_INDEX.playerFace}});
	//add to the world
	physicsWorld.add(ball);	
	
	//OBJECT 4
	//another box, use defaults EXCEPT for width,depth, height
	var box = new objectFactory.CubeObject({width:2,depth:2,height:2,y:20});
	//instead of doing a texture for each face like OBJECT 1, just use wrap
	box.addGraphics({textures:{wrap:TEXTURE_FILES_INDEX.playerFace}});
	//add to world
	physicsWorld.add(box);

	//OBJECT 5
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
		console.log('goodbye')
	});
	
	//log
	console.log('*****'+Date.now()+'*****');
	console.log('new user');
	console.log('Socket ID: ',socket.id);
	console.log('IP: '+socket.request.connection.remoteAddress);
	console.log('**********');
	
	//send the new connection their uniqueID, which happens to be their socketID
	//use this to send INITIAL SETUP TOO
	//io.to(socket.id).emit('playerID', socket.id);
	

	//get current state of everything, build specs and send out	to the NEW connection	
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

	
