//GLOBAL General variables


var PWM = new physicsWorldManager();
var GWM = new graphicsWorldManager();
GWM.displayInHTMLElementId('container');

//IMPORTANT!! 
//The rigidBody class must have a link the the GWM 
//we also link to the PWM but it's not really needed... yet :)
//initially these prototypes are assigned 'false' so you can check if they have been linked
RigidBodyBase.prototype.graphicsWorldManager = GWM;
RigidBodyBase.prototype.physicsWorldManager = PWM;


function MakePhysicsObject(instructions){
	
	var ShapeIDCodes = RigidBodyBase.prototype.ShapeIDCodes.call();
	
	switch (instructions.shape){
		
		case ShapeIDCodes.cube: return new CubeObject(instructions);
		break;
		case ShapeIDCodes.sphere: return new SphereObject(instructions);
		break;
		default: console.log("MakePhysicsObject argument error")
		
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
			
			console.log('total bytes of graphics data:',msg.graphics.byteLength)
			var UnpackedGraphicsData = GWM.unpackServerBinaryData_graphics(msg.graphics);

			//make
			for(var ID in UnpackedPhysicsData){
				var newObject = MakePhysicsObject(UnpackedPhysicsData[ID]);
				newObject.addGraphics(UnpackedGraphicsData[ID])
				PWM.add(newObject)
			}
			
			//all our objects
			console.log(PWM.rigidBodiesMasterObject)		
			
			//Show time!
			render();
			
		});


		
		socket.on('U',function(msg){
			console.log(msg.byteLength);
			var array = new Float32Array(msg);
			console.log(array)
		});
		
function render() {
	
       GWM.renderer.render( GWM.scene, GWM.camera );//update graphics
	   
	  // run game loop again
	    requestAnimationFrame( render );//https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
};

function updateAnimation(){
	
	//first get the position of all active objects
	//format is an array of Float32Arrays
	var dataArray = PWM.getWorldUpdateBuffer();//note, function name convention due to server side. NO buffer is returned.
	
	//now add this info to the current buffering frame
	GWM.bufferingFrame_update(dataArray);
}

/*******************************/


