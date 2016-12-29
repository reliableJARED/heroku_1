

if(typeof THREE === 'undefined'){
	
	console.log('*******ERROR**********************There is no instance of \'Three js\'.  Please import three.js first before using graphicsWorldManager_client****************************');
}

var graphicsWorldManager = function (config) {
	
	var config = config || {};
	
	
	var configDefaults = {
		ambientLight: 0x404040,
		cameraFOV:60,
		cameraAspect: window.innerWidth / window.innerHeight,
		cameraNear: 0.2,
		cameraFar: 5000,
		rendererPixelRatio: window.devicePixelRatio,
		rendererSizeWidth:  window.innerWidth,
		rendererSizeHeight:  window.innerHeight,
		rendererClearColor: 0xf0f0f0,
		cameraPerspectiveX: 0,
		cameraPerspectiveY: 5,
		cameraPerspectiveZ: -15,
		defaultColor: 0x0000ff,
		//consider adding a link back to the PWM
		physicsWorldManager: false,
		totalFramesInBuffer: 10,
		framesUpdatedFromServer: 3
	}
	
	//replace defaults with anything sent in config
	//should config be an instance property this.config?
	config = Object.assign(configDefaults,config);
	
   //http://threejs.org/docs/api/cameras/PerspectiveCamera.html 
    this.camera = new THREE.PerspectiveCamera( config.cameraFOV, config.cameraAspect, config.cameraNear, config.cameraFar );	
  
    //mess around with these parameters to adjust camera perspective view point
	this.cameraPerspectiveX = config.cameraPerspectiveX;
	this.cameraPerspectiveY = config.cameraPerspectiveY;
	this.cameraPerspectiveZ = config.cameraPerspectiveZ;
	
    this.camera.position.x = this.cameraPerspectiveX;
	this.camera.position.y = this.cameraPerspectiveY;
    this.camera.position.z = this.cameraPerspectiveZ;
				
	//http://threejs.org/docs/#Reference/Scenes/Scene			
	this.scene = new THREE.Scene();
    
	//http://threejs.org/docs/#Reference/Renderers/WebGLRenderer
	this.renderer = new THREE.WebGLRenderer();
	this.renderer.setClearColor( config.rendererClearColor ); //sets the clear color and opacity of background.
    this.renderer.setPixelRatio( config.rendererPixelRatio);//Sets device pixel ratio.
    this.renderer.setSize(  config.rendererSizeWidth,  config.rendererSizeHeight );//Resizes output to canvas device with pixel ratio taken into account

    
    //LIGHT
	//http://threejs.org/docs/api/lights/AmbientLight.html
	this.ambientLight = new THREE.AmbientLight( config.ambientLight );
	
	//ambientLight is for whole scene, use directionalLight for point source/spotlight effect
    this.scene.add( this.ambientLight );
	
	//UTILITY
	this.vector3 = new THREE.Vector3(0,0,0);
	this.textureFiles = new Array();
	this.textureFilesIndex;
	this.fileLoader = new THREE.TextureLoader();
	this.defaultColor = config.defaultColor;
	
	//Use graphicsMasterObject to Find Objects by their ID from PHYSICS! not their uuid from threejs
	this.graphicsMasterObject = new Object();
	
	//total count of frames the buffer holds
	this.totalFramesInBuffer = config.totalFramesInBuffer;
	this.renderingFrame = 0;
	this.bufferingFrame = 0;
	
	//used to update already drawn buffer frames based on server update
	this.framesUpdatedFromServer = config.framesUpdatedFromServer;
	
	//2D array used to hold previous positions of objects in a buffer
	this.renderingBuffer = new Array(this.totalFramesInBuffer);
	
	//fill the renderingBuffer with arrays which will hold each frame of object data
	for (var frame = 0;frame<this.totalFramesInBuffer;frame++) {
		this.renderingBuffer[frame] = new Array();		
	}
	
	//lights, camera, action!
	this.camera.lookAt( this.scene.position );
    				
}

graphicsWorldManager.prototype.Buffering = function(ArrayOfObjectData){
		
		//CONSIDER!!! does this need to be closure? worth the extra memorey?
		var stillBuffering = true;
		
		if(this.bufferingFrame === this.totalFramesInBuffer || this.bufferingFrame >= this.totalFramesInBuffer){
			this.bufferingFrame = 0;
			stillBuffering = false;
			return stillBuffering;
			
		}else{
			console.log("buffering frame",this.bufferingFrame)
			this.bufferingFrame_update(ArrayOfObjectData);
			this.bufferingFrame +=1;
			stillBuffering = true;
			return stillBuffering;
		}
}

graphicsWorldManager.prototype.bufferingFrame_update = function (ArrayOfObjectData) {

	//the positions of objects in the physics world are sent to the rendering buffer
	//rendering is done from the buffer NOT directly from the world state
	//objects send their own updates to the graphics buffer
	//they send the update as a float32 array whos first index is ID
	//the remaining 13 array index positions hold position, orientation and velocity info
	//ArrayOfObjectData is ALL data from the physics simulation for objects that are ACTIVE in the form of a 2D array. [[obj1Array],[Obj2Array],...] 
	//If an object is in an ACTIVE state, it 'likly' requires an rendering update. 
	//so we update it's grahic to be drawn again in the new location.  NOTE: ACTIVE objects might not be in motion, but they will go to DEACTIVE state soon so just redraw to keep simple.
	
	//console.log("load buffer with:", ArrayOfObjectData)
	this.renderingBuffer[this.bufferingFrame] = ArrayOfObjectData;
}

graphicsWorldManager.prototype.applyServerUpdates = function(ArrayOfObjectData){
	//first get what frame is currently buffered
	var currentBufferFrameNumber = this.bufferingFrame;
	
	//then determine how many frames need to be updated
	var UpdateFrameCount = this.framesUpdatedFromServer;
	var TotalFrameCount = this.totalFramesInBuffer;
	
	//since the graphics updater is looping through the buffer array, need to calculate which frames need update
	var determineFrames = currentBufferFrameNumber - UpdateFrameCount;
	
	var BUFFER = this.renderingBuffer; 
	
	var FramesToUpdate = [];
	
	if(determineFrames > 0){
		
		for(var f = determineFrames; determineFrames<UpdateFrameCount; determineFrames++){
			
			this.reviseSingleBufferFrame(BUFFER[f],(determineFrames/UpdateFrameCount))
		}
	}
	//frames are not in numerical order because need to loop to the end of the buffer array, ie. frames 9,0,1
	else{
		
	}
	
	//go back and change a few frames of data based on the input
	
}

graphicsWorldManager.prototype.reviseSingleBufferFrame = function(updateArray,frameIndex,percent){
	//updateArray is a 2D array.  It is what you want the revised frame to be
	//frameIndex is the frame in the primary buffer
	//percent is how far along in total update process you are.  It's used to create a crude 'interpolation' method. 
	//if you need to update 5 frames for example. percent would be .2 for frame 1.
	//if percent = 1 it's a direct replacement of buffer with updateArray
	
	//key of where props are in the update Array
	var serverIndexLoc = this.physics_indexLocations;
	//count of props for a single object
	var PropsPerObj = Object.keys(serverIndexLoc).length;
	
	var bufferFrame = this.renderingBuffer[frameIndex];
	
	//loop through the array of updates
	for(var obj = 0,totalObjs = updateArray.length; obj<totalObjs;obj++){		
		
			var array = updateArray[obj];
			//Issue for interpolation
			
			//if the current LVx is LESS than update LVx, obj is Excellerating, else decellerating
			array[serverIndexLoc.LVx];
			array[serverIndexLoc.x];
			
			array[serverIndexLoc.LVy];
			array[serverIndexLoc.y];
			
			array[serverIndexLoc.LVz];
			array[serverIndexLoc.z];
			
			array[serverIndexLoc.AVx];
			array[serverIndexLoc.Rx];
			
			array[serverIndexLoc.AVy];
			array[serverIndexLoc.Ry];
			
			array[serverIndexLoc.AVz];
			array[serverIndexLoc.Rz];
			
			
			array[serverIndexLoc.Rw];
		    
			
			
			
			
			
		var objUpdateData = updateArray[obj];

		//get the graphic for the objects data
		var objToUpdate = this.graphicsMasterObject[objUpdateData[serverIndexLoc.id]];
		//console.log("update ",objToUpdate," with ",objUpdateData)
		//update the graphic		
		objToUpdate.position.set(objUpdateData[serverIndexLoc.x], objUpdateData[serverIndexLoc.y], objUpdateData[serverIndexLoc.z] );
		objToUpdate.quaternion.set(objUpdateData[serverIndexLoc.Rx], objUpdateData[serverIndexLoc.Ry], objUpdateData[serverIndexLoc.Rz], objUpdateData[serverIndexLoc.Rw] );
		
	
	}
	
	
};

graphicsWorldManager.prototype.drawFromBuffer = function () {

	//console.log("buffer frame:",this.bufferingFrame)
	//console.log("render frame:",this.renderingFrame)
	
	var serverIndexLoc = this.physics_indexLocations;
	
	//load the data
	var AllDataForFrame = this.renderingBuffer[this.renderingFrame];
	
	//loop through the array of updates for the objects
	for(var obj = 0,totalObjs = AllDataForFrame.length; obj<totalObjs;obj++){		
		
		//load the data
		var objUpdateData = AllDataForFrame[obj];

		//get the graphic for the objects data
		var objToUpdate = this.graphicsMasterObject[objUpdateData[serverIndexLoc.id]];
		//console.log("update ",objToUpdate," with ",objUpdateData)
		//update the graphic		
		objToUpdate.position.set(objUpdateData[serverIndexLoc.x], objUpdateData[serverIndexLoc.y], objUpdateData[serverIndexLoc.z] );
		objToUpdate.quaternion.set(objUpdateData[serverIndexLoc.Rx], objUpdateData[serverIndexLoc.Ry], objUpdateData[serverIndexLoc.Rz], objUpdateData[serverIndexLoc.Rw] );
		
	
	}
	
	//since the arrays are filled and emptied, just set to empty
	this.renderingBuffer[this.renderingFrame].length = 0;
	
	//update the renderer to know what frame from buffer should be drawn next
	//it should always be ONE frame ahead so that after looping around the renderingBuffer is one buffer rotation behind the current bufferingFrame
	this.moveRenderingBufferIndexes();
	
}


graphicsWorldManager.prototype.moveRenderingBufferIndexes = function(){
	
	//bufferingFrame should always be 1 index BEHIND renderingFrame
	//this way by the time we render the frame that was just buffered we have gone through one loop of the whole buffer
	
	//end of array, loop back to start
	if(this.renderingFrame === (this.totalFramesInBuffer-1)) {
		this.renderingFrame =  0;
		this.bufferingFrame = this.totalFramesInBuffer-1;
	}else if(this.bufferingFrame === (this.totalFramesInBuffer-1)){
			this.bufferingFrame = 0;
			this.renderingFrame += 1;
	}else{
			this.bufferingFrame +=1;
			this.renderingFrame += 1;
		}
}


graphicsWorldManager.prototype.displayInHTMLElementId = function(elementID){
	
    //attach and display the renderer to an html element
    document.getElementById( elementID ).appendChild( this.renderer.domElement );
	
}

graphicsWorldManager.prototype.cameraChaseObject = function(obj){
	
	//obj should be the threejs MESH part of a world object, usually found under 'graphics' property.
	
	/*CHASE CAMERA EFFECT*/
		var relativeCameraOffset = this.vector3.set(this.cameraPerspectiveX,this.cameraPerspectiveY,this.cameraPerspectiveZ);//camera chase distance
		var cameraOffset = relativeCameraOffset.applyMatrix4( obj.matrixWorld );
		this.camera.position.x = cameraOffset.x;
		this.camera.position.y = cameraOffset.y;
		this.camera.position.z = cameraOffset.z;
		
		this.camera.lookAt( obj.position );
}

graphicsWorldManager.prototype.NoAssignment = -1;

graphicsWorldManager.prototype.setTextureFilesIndex = function(TFI){
	this.textureFilesIndex = TFI;
}

graphicsWorldManager.prototype.serverTextureLoader = function(fileNameArray){
	for (f=0, files = fileNameArray.length;f<files;f++) {
 		var texture = this.fileLoader.load(fileNameArray[f]);
 	 	this.textureFiles.push(texture);
 	};
}


graphicsWorldManager.prototype.add = function(obj){
	
	this.graphicsMasterObject[obj.id] = obj.graphics;
	this.scene.add(obj.graphics);
}

graphicsWorldManager.prototype.ServerShapeGraphicFaceCount = function(){
	
	//CONSIDER: Server should set this
	
	return {
			cube:6,
			sphere:1
		}
};

graphicsWorldManager.prototype.getServerMaterialArrayIndexLoc = function(){
	
	//CONSIDER: Server should set this
	
	return {
			material:0,
			shape:1
		}
};

graphicsWorldManager.prototype.ShapeIDCodes = function(){
	
	//CONSIDER: Server should set this

	return {
			cube:0,
			sphere:1
		}
};	

graphicsWorldManager.prototype.unpackServerBinaryData_graphics = function(binaryData){
	//return
	const UnpackedDataObject = new Object();
	
	//What makes this complicated is it's not uniform binary data.  Cubes for example use more bytes than sphere.
	//Each object has a uniform set of bytes at it's start.  
	//As data is unpacked we will be able to determine what shape is being unpacked, therefore how many bytes it occupies
	//first 8 bytes of the ENTIRE buffer are a set of int16 headers
	   var headerCount = 4;
	   var header = new Uint16Array(binaryData,0,headerCount);
		
			var totalObjs = header[0];
			var header2 = header[1];//unused
			var header3 = header[2];//unused
			var header4 = header[3];//unused
			
			//used to move along ENTIRE buffer
			var offset = headerCount * 2;//calculate bytes of headers for offset
			
			//used to log byte count of a single unpacked object
			var BytesOfPreviousObj = 0;
			
			//used to know how many GEOMETRY properties a shape has
			var ServerShapeGraphicFaceCount = this.ServerShapeGraphicFaceCount();
			
			//number to shape code object
			var ServerShapeIDCodes = this.ShapeIDCodes();
			
			//index locations for material array
			var materialArrayIndex = this.getServerMaterialArrayIndexLoc();
			
			//Graphics packing STRUCTURE and ORDER: ID,material,color,texture
			var IDarray;//Int32
			var materialArray;//Int8
			var colorArray;//float32
			var textureArray;//Int16
			
			//bytes occupied by a shapes ID
			const IDByteSize = 4;			
			
			//bytes occupied by a shapes material type (ie. basic, phong, lambert,etc..)
			const materialByteSize = 2;
			
		for(var i = offset,fullBuffer=binaryData.byteLength; i<fullBuffer;i+=BytesOfPreviousObj){
			
			BytesOfPreviousObj = 0;//reset byte counter
			offset = i;//slide our location in buffer 
			
			//new object blueprint to be constructed with the unpacked data
			var newObjBlueprint = Object();
			
		
			//leading 4 bytes are a Int32 single element array with the IDarray of object.  
			IDarray = new Int32Array(binaryData.slice(offset,offset+IDByteSize));

			//slide our location in buffer 
			offset += IDByteSize;
			//increment byte counter
			BytesOfPreviousObj += IDByteSize;
			
			materialArray = new Int8Array(binaryData.slice(offset,offset+materialByteSize));
			
			//slide our location in buffer 
			offset += materialByteSize;
			//increment byte counter
			BytesOfPreviousObj += materialByteSize;
			
			//begin adding to blueprint
			newObjBlueprint.material = materialArray[materialArrayIndex.material];//DON"T pass the array, just the single value it holds
			newObjBlueprint.shape = materialArray[materialArrayIndex.shape];//DON"T pass the array, just the single value it holds
			
			var colorF32props = 4; //4 is initially used as multiplyer to get byte count, then colorF32props is set total bytes
			var textureI16props = 2;//2 is initially used as multiplyer to get byte count, then textureI16props is set total bytes
			
			//based on shape,determine how many bytes graphics data occupies
			switch(newObjBlueprint.shape){
					case ServerShapeIDCodes.cube: colorF32props *= ServerShapeGraphicFaceCount.cube;		
												  textureI16props *= ServerShapeGraphicFaceCount.cube;		
					break;
					case ServerShapeIDCodes.sphere: colorF32props *= ServerShapeGraphicFaceCount.sphere;	
													textureI16props *= ServerShapeGraphicFaceCount.sphere;							
					break;
					default: console.log('shape code error in unpackServerBinaryData_physics()');
				}
			
			colorArray = new Float32Array(binaryData.slice(offset,offset+colorF32props));
			//slide our location in buffer 
			offset += colorF32props;
			//increment byte counter
			BytesOfPreviousObj += colorF32props;
			
			textureArray = new Int16Array(binaryData.slice(offset,offset+textureI16props));
			//increment byte counter, no longer need to move offset as it will be set to 'i' on next pass of loop and 'i' will be increased by BytesOfPreviousObj
			BytesOfPreviousObj += textureI16props;
			
			//add to blueprint
			newObjBlueprint.colors = colorArray;
		
			newObjBlueprint.textures = textureArray;
			
			//ADD TO THE RETURN OBJECT
			UnpackedDataObject[IDarray[0]] = newObjBlueprint;
	}
	
	return UnpackedDataObject;
}

graphicsWorldManager.prototype.graphicsMaterialCodes = function(){
	/*
	TYPES:
	MeshBasicMaterial -> https://threejs.org/docs/api/materials/MeshBasicMaterial.html
	MeshDepthMaterial - > https://threejs.org/docs/api/materials/MeshDepthMaterial.html
	MeshLambertMaterial -> https://threejs.org/docs/api/materials/MeshLambertMaterial.html
	MeshNormalMaterial -> https://threejs.org/docs/api/materials/MeshNormalMaterial.html
	MeshPhongMaterial - https://threejs.org/docs/api/materials/MeshPhongMaterial.html
	MeshStandardMaterial -> https://threejs.org/docs/api/materials/MeshStandardMaterial.html
	*/
	//INDEX KEYS SERVER USES:
	/*
		basic:0,
		depth:1,
		lambert:2,
		normal:3,
		phong:4,
		standard:5
	*/
	return {
		MeshBasicMaterial:0,
		MeshDepthMaterial:1,
		MeshLambertMaterial:2,
		MeshNormalMaterial:3,
		MeshPhongMaterial:4,
		MeshStandardMaterial:5
	}

}


// These two functions seem dumb.... MappingGeometricFaceCodes()  and graphicsDefaultMapping()
//one knows index locations based on a shape name, one returns the shape specific object
graphicsWorldManager.prototype.MappingGeometricFaceCodes = function(){
//cube texture index map:
					//0 -left
					//1 - right
					//2 - top
					//3 - bottom
					//4 - front
					//5 - back
	return{
		cube:{
			front:4,
			back:5,
			top:2,
			bottom:3,
			left:0,
			right:1
		},
		sphere:{
			front:0
		}
	}
}

graphicsWorldManager.prototype.graphicsDefaultMapping = function(shape){
	
	var FaceKeys = this.MappingGeometricFaceCodes();
	var shapeCodes = this.ShapeIDCodes();
	
	switch (shape){
			case shapeCodes.cube:
					return {
						[FaceKeys.cube.front]:'front',
						[FaceKeys.cube.back]:'back',
						[FaceKeys.cube.top]:'top',
						[FaceKeys.cube.bottom]:'bottom',
						[FaceKeys.cube.left]:'left',
						[FaceKeys.cube.right]:'right'
						}
					break;
				
			case shapeCodes.sphere:
					return {
						//wrapps whole sphere
						[FaceKeys.sphere.front]:'front',
						}
					break;

				//TODO: ADD MORE SHAPES>>>
				
				default: console.log('ERROR: this.shape either not defined or not a value of a known shape code from ShapeIDCodes()');
			}
}	

graphicsWorldManager.prototype.createGraphics = function(blueprint) {
		
		//blueprint has props: shape,material,colors,textures, geomtry
		//shape and material are single int, colors and textures are float32 array

		
		// *** MATERIAL
		//get object whos keys are names of THREE material types and whos value is an index location
		var materialSelector = this.graphicsMaterialCodes();
		
		//create the array of strings that represent THREEjs materials
		var matTypes = Object.keys(materialSelector);
		
		//pick the material type based on the value in blueprint.material which is a single number index location 
		var selectedMat = matTypes[blueprint.material];
		//Use like: new THREE[selectedMat]( { color:color,map:texture} );
		
		//get an object whos KEYS are names of faces, whos and VALUES are index locations
		var shapeFaceSelector = this.graphicsDefaultMapping(blueprint.shape);
		
		
		var materialArray = new Array();
		var notAssigned = this.NoAssignment;
	
		
		for(var face in shapeFaceSelector ){
		
			//Yes color, Yes texture
			if(blueprint.colors[face] !== notAssigned && blueprint.textures[face] !== notAssigned){
				
				var mat = new THREE[selectedMat]( { color:blueprint.colors[face] ,map:this.textureFiles[blueprint.textures[face]]} );
			}
			//No color, No texture
			else if(blueprint.colors[face] === notAssigned && blueprint.textures[face] === notAssigned){
				//consider NOT passing a default color, which will make it white
				var mat = new THREE[selectedMat]({color:this.defaultColor});
			}
			//No color
			else if(blueprint.colors[face] === notAssigned){
				
				mat = new THREE[selectedMat]( { map:this.textureFiles[blueprint.textures[face]]} );
			}
			//No texture
			else if(blueprint.textures[face] === notAssigned){
				
				mat = new THREE[selectedMat]( {color:blueprint.colors[face]} );
			}else{
				console.log("Error in graphicsWorldManager.createGraphics() material selector")
			}
			
			materialArray.push(mat);
		}
		
		var material = new THREE.MeshFaceMaterial(materialArray);
		
		
		//TESTING material assignment
		//var material = new THREE[selectedMat]({color:this.defaultColor});
		
		// *** GEOMETRY
		var geometry;
		//ALL Geometries - > https://threejs.org/docs/index.html?q=geometry
		//get object whos keys are names shapes and whos value is a number indicator for that shape
		var ServerShapeIDCodes = this.ShapeIDCodes();
		
		switch(blueprint.shape){
			
			//https://threejs.org/docs/index.html?q=geometry#Reference/Geometries/BoxGeometry
			case ServerShapeIDCodes.cube: geometry = new THREE.BoxGeometry(blueprint.geometry.width,blueprint.geometry.height,blueprint.geometry.depth);
			break;
			
			//https://threejs.org/docs/index.html?q=geometry#Reference/Geometries/SphereGeometry
			case ServerShapeIDCodes.sphere: geometry = new THREE.SphereGeometry(blueprint.geometry.radius,32,32);
			break;
			
			//TODO: add more geometries
			
			default: console.log("Error in graphicsWorldManager.createGraphics() geometry selector")
		}
		
		
		//http://threejs.org/docs/#Reference/Objects/Mesh
		var MESH =  new THREE.Mesh(geometry, material);
		
		//add to the MASTER object finder
		this.graphicsMasterObject[blueprint.id] = MESH;
		
		//add to the scene
		this.scene.add( MESH );
		
		//return to the requester
		return MESH;
		
}

graphicsWorldManager.prototype.removeGraphic = function (ID) {
	
	//nullify and delete key
	this.graphicsMasterObject[ID] = null;
	delete this.graphicsMasterObject[ID];
	
}

graphicsWorldManager.prototype.physics_indexLocations = {

//If needed can set this, but this is default	
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
						AVz:13
	}