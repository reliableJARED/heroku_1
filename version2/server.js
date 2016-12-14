
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
const SIMULATION_STEP_FREQUENCY = 16;//miliseconds
var clock = require(__dirname +'/resources/server/gameClock.js');//returns constructor for a clock
clock = new clock(updateFrequency)

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
	/*put stuff here*/
}
function TickPhysics() {
	
	   var deltaTime = clock.getDelta();
	   
	   var sendUpdate = clock.UpdateTime();//bool that is true every second

	  // physicsWorld.step( deltaTime );
	   physicsWorld.world.stepSimulation( deltaTime,10);

	   //loop our physics at about X fps
		setTimeout( TickPhysics, SIMULATION_STEP_FREQUENCY);//milisecond callback timer
		
		if (sendUpdate){
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
	
	//GRAPHICS
	var gheader = new Int16Array(4);
	gheader[0] = totalObjs;
	//built in space for future info in header
	gheader[1] = 0;//UNUSED
	gheader[2] = 0;//UNUSED
	gheader[3] = 0;//UNUSED
	var binaryGraphics = Buffer.from(gheader.buffer);

	//build buffers
	for(var i = 0; i < totalObjs; i++){
		//PHYSICS
		var objBuffer = physicsWorld.rigidBodiesMasterArray[i].BinaryExport_ALL();
		var objBuffer_len = objBuffer.length;
		var currentByteLength = binaryData.length + objBuffer_len;
		
		//GRAPHICS
		var grapBuffer = physicsWorld.rigidBodiesMasterArray[i].BinaryExport_graphics();
		var grapBuffer_len = grapBuffer.length;
		var currentByteLength_g = binaryGraphics.length + grapBuffer_len;
		
		//basically PUSH new binary to end of current binary
		binaryData = Buffer.concat([binaryData, objBuffer], currentByteLength );
		binaryGraphics = Buffer.concat([binaryGraphics, grapBuffer], currentByteLength_g )

	}
	
	
	//create a time stamp
	var time = Date.now();
	
	//Only send to the new connection, NOT every connection
	io.to(socket_id).emit('setup',{
		time:time,
		data: binaryData,
		graphics:binaryGraphics,
		TEXTURE_FILES_INDEX:TEXTURE_FILES_INDEX,
		TEXTURE_FILES:TEXTURE_FILES});
			
}

function init(){
	var groundTextures = {
		front:TEXTURE_FILES_INDEX.ground,
		back:TEXTURE_FILES_INDEX.ground,
		top:TEXTURE_FILES_INDEX.ground,
		bottom:TEXTURE_FILES_INDEX.ground,
		left:TEXTURE_FILES_INDEX.ground,
		right:TEXTURE_FILES_INDEX.ground
	};
	
	var ground = new objectFactory.CubeObject({width:50,depth:50,mass:0}); 
	ground.addGraphics({textures:groundTextures});
	
	physicsWorld.add(ground);
	
	var player = new objectFactory.CubeObject({y:20,mass:50});

	physicsWorld.add(player);	
	
	var ball = new objectFactory.SphereObject();
	physicsWorld.add(ball);	
	
	
	/*
	physicsWorld.add(new objectFactory.CubeObject({y:10,mass:50}) );

	for(var i=0; i<100;i+=2){
		physicsWorld.add(new objectFactory.CubeObject({y:10+i,mass:50}) );
	}
	*/
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

	
