/*
//INSTRUCTIONS POP UP
var startup = document.createElement("div");
startup.setAttribute('id',"info");
startup.setAttribute('class',"info");
startup.setAttribute('height',window.outerHeight);
startup.setAttribute('width',window.outerWidth);
startup.setAttribute('style','text-align:center;vertical-align:middle; display:block;opacity:0.5; color:#ffffff; background: #000; width:100%; height:100%; z-index:10;top:0; left:0; position:fixed');
startup.innerHTML = "press buttons to play";
startup.onclick = function () {
	this.style.display='none'
}
document.body.insertBefore(startup, document.getElementById("container"));
*/


//GLOBAL General variables
var PWM = new physicsWorldManager();
var GWM = new graphicsWorldManager();

PWM.GWM = GWM; //LINK physics to graphics

GWM.displayInHTMLElementId('container');

var PLAYER_ID = false;

//IMPORTANT!! 
//The rigidBody class must have a link to the GWM 
//we also link to the PWM but it's not really needed... yet :)
//initially these prototypes are assigned 'false' so you can check if they have been linked
RigidBodyBase.prototype.graphicsWorldManager = GWM;
RigidBodyBase.prototype.physicsWorldManager = PWM;


//TESTING!!! ***********
//orbital control, remove for actual game
var ORBIT_Control = new THREE.OrbitControls( GWM.camera );
//	ORBIT_Control.target.y = 10;
	
//***********************

function MakePhysicsObject(instructions){

	var ShapeIDCodes = RigidBodyBase.prototype.ShapeIDCodes.call();
	
	switch (instructions.shape){
		
		case ShapeIDCodes.cube: return new CubeObject(instructions);
		break;
		case ShapeIDCodes.sphere: return new SphereObject(instructions);
		break;
		default: console.log("MakePhysicsObject() argument error")
		
	}
}

			
// exposes a global for our socket connection
var socket = io();

		
		socket.on('connect',function(msg){
			connection = true;			
		});
		
		
		socket.on('setup', function(msg){
			
			//msg is an object with 5 props
			//time: timeStamp from server
			//data: binary data of all world objects
			//graphics: binary data of graphics for world objects
			//TEXTURE_FILES_INDEX: Object whos keys match files in TEXTURE_FILES array
			//TEXTURE_FILES: array of file name strings
		
			//assign the lookup index for textures
			GWM.setTextureFilesIndex = msg.TEXTURE_FILES_INDEX ;
			
			//load all textures
			GWM.serverTextureLoader( msg.TEXTURE_FILES);
			
			console.log('total bytes of physics data:',msg.data.byteLength)
			var UnpackedPhysicsData = PWM.unpackServerBinaryData_physics(msg.data);
			console.log('unpacked physics',UnpackedPhysicsData)
			
			console.log('total bytes of graphics data:',msg.graphics.byteLength)
			var UnpackedGraphicsData = GWM.unpackServerBinaryData_graphics(msg.graphics);

			//make objects from the unpacked data
			for(var ID in UnpackedPhysicsData){
				var newObject = MakePhysicsObject(UnpackedPhysicsData[ID]);
				newObject.addGraphics(UnpackedGraphicsData[ID]);
				PWM.add(newObject);
			}
			
			//all our objects
			//console.log(PWM.rigidBodiesMasterObject)		
			
			//sync with server time, this might not be needed....
			PWM.GameClock(msg.time);
			
			
			//buffer graphics
			while( GWM.Buffering(PWM.getWorldUpdateBuffer()) ){
				PWM.world.stepSimulation( PWM.GameClock_getDelta(),10);
			}
			
			//TESTING
			console.log(GWM.graphicsMasterObject);
			
			//Show time!
			nextWorldFrame();
			
		});

		socket.on('newPlayer',function(msg){
			console.log("ID:",msg);
			if (!PLAYER_ID) {
				PLAYER_ID = msg;				
			}else {
				//add a new player to the world			
			}
		});
		socket.on('removePlayer',function(msg){
			//DON't actually remove, just deactivate.  This could be an issue and
			//should consider using 'delete' method or setup a player obj recycle system
		
			PWM.removePlayer(msg);
			GWM.removeGraphic(msg);
		//	console.log("deactivate ID:",msg)
		});
		socket.on('add',function(msg){
		//	console.log('ADD',msg)
			var unpackedPhy = PWM.unpackServerBinaryData_physics(msg.data);
		//	console.log('phy',unpackedPhy)
			var unpackedGra = GWM.unpackServerBinaryData_graphics(msg.graphics);
		//	console.log('gra',unpackedGra);
			
			//UGLY
			var objID = Object.keys(unpackedPhy);
			
			var newObject = MakePhysicsObject(unpackedPhy[objID[0]]);
		//	console.log('new obj',newObject);
			newObject.addGraphics(unpackedGra[objID[0]]);
			PWM.add(newObject);
		});
		
		socket.on('U',function(msg){
		
			//update is a giant float32 buffer.  very first element
			//is a time stamp.  then remaining unpacks in standard way
			//Take the update data and overwrite the local physics with it
			
			PWM.applyServerUpdates(msg);
			GWM.bufferingFrame = GWM.renderingFrame


		});
		
function render() {

		//TESTING!!! *****************
		//remove for live game
		ORBIT_Control.update();//view control
		//************************
		
	   //render the updates
	   GWM.renderer.render( GWM.scene, GWM.camera );//update graphics
	   
	  // run game loop again
	    requestAnimationFrame( nextWorldFrame );//https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
};

function nextWorldFrame(){
	//draw all the updates
	GWM.drawFromBuffer();
	
	//then get the position of all active objects with PWM.getWorldUpdateBuffer()
	//and add this info to the current buffering frame
	GWM.bufferingFrame_update(PWM.getWorldUpdateBuffer());
	
	//PWM.world.stepSimulation( PWM.GameClock_getDelta(),10);
	PWM.step( PWM.GameClock_getDelta());
	
	//*******TESTING !@!
	for(var object in PWM.rigidBodiesMasterObject){
		
		}
		//***********************
	
	
	
	//draw the updates
	render();
}

/*******************************/


