
var app = require('express')();

//https://www.npmjs.com/package/ammo-node
require('ammo-node');//physics
var objectFactory = require(__dirname +'/resources/server/PhysicsObjectFactory.js');//returns object constructors
var physicsWorld =  require(__dirname +'/resources/server/PhysicsWorldManager.js');//returns an instance of world manager


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
/* inheritence construct example */
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
	

function SYSTEM_CHECK_DEBUG(){
	//FASTEST way to iterate through our keys
	//https://jsperf.com/object-keys-iteration/3
	for (var body in physicsWorld.rigidBodies) {
		
		
	}
	
}

function TickPhysics() {
	
	   var deltaTime = clock.getDelta();
	   
	   var sendUpdate = clock.UpdateTime();//bool that is true every second

	  // physicsWorld.step( deltaTime );
	   physicsWorld.world.stepSimulation( deltaTime,10);
	   var collisions = physicsWorld.getCollisionImpulses();
	   physicsWorld.getCollisionForces()
	  if(collisions){
		   for (var rigidBody in collisions) {
				//console.log(rigidBody,"collision imp:",collisions[rigidBody])
			}
	   }
	   
	   for (var rigidBody in physicsWorld.getCollisionImpulses()) {
			//do something with rigidBody
			//physicsWorld.rigidBodies[rigidBody] => do something
		}
	 
	   //loop our physics at about X fps
		setTimeout( TickPhysics, SIMULATION_STEP_FREQUENCY);//milisecond callback timer
		
		if (sendUpdate){
		process.nextTick(function (){SYSTEM_CHECK_DEBUG()} );
		}
    };
	



function init(){
	var ground = new objectFactory.CubeObject({width:50,depth:50,mass:0}); 
	physicsWorld.add(ground);
	physicsWorld.add(new objectFactory.CubeObject({y:50,mass:50}) );
	physicsWorld.add(new objectFactory.CubeObject({y:20,mass:5}) );
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
		PlayerInput(this.id,data);	  
		
	});
	
});

	
