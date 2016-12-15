

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
		cameraPerspectiveZ: -50,
		physicsWorldManager: false
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
	this.textureFiles = [];
	this.textureFilesIndex;
	this.fileLoader = new THREE.TextureLoader();
	
	//Use graphicsMasterObject to Find Objects by their ID from PHYSICS! not their uuid from threejs
	this.graphicsMasterObject = new Object();
    				
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
			
			//recycle object blueprint
			var newObjBlueprint = Object();
			
			
			//Graphics packing STRUCTURE and ORDER: ID,material,color,texture
			var IDarray;//Int32
			var materialArray;//Int8
			var colorArray;//float32
			var textureArray;//float32
			
			const IDByteSize = 4;			
			const materialByteSize = 2;
			
		for(var i = offset,fullBuffer=binaryData.byteLength; i<fullBuffer;i+=BytesOfPreviousObj){
			
			newObjBlueprint = {};//reset
			
			BytesOfPreviousObj = 0;//reset byte counter
			offset = i;//slide our location in buffer 
		
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
			
			var graphicF32props = 4;//4 is initially used as multiplyer to get byte count, then graphicF32props is set total bytes
			
			//based on shape,determine how many bytes graphics data occupies
			switch(newObjBlueprint.shape){
					case ServerShapeIDCodes.cube: graphicF32props *= ServerShapeGraphicFaceCount.cube;										
					break;
					case ServerShapeIDCodes.sphere: graphicF32props *= ServerShapeGraphicFaceCount.sphere;										
					break;
					default: console.log('shape code error in unpackServerBinaryData_physics()');
				}
			
			colorArray = new Float32Array(binaryData.slice(offset,offset+graphicF32props));
			//slide our location in buffer 
			offset += graphicF32props;
			//increment byte counter
			BytesOfPreviousObj += graphicF32props;
			
			textureArray = new Float32Array(binaryData.slice(offset,offset+graphicF32props));
			//increment byte counter, no longer need to move offset as it will be set to 'i' on next pass of loop and 'i' will be increased by BytesOfPreviousObj
			BytesOfPreviousObj += graphicF32props;
			
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

	return{
		cube:{
			front:0,
			back:1,
			top:2,
			bottom:3,
			left:4,
			right:5
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
		
		console.log(this.textureFiles)
		
		//blueprint has props: shape,material,colors,textures, geomtry
		//shape and material are single int, colors and textures are float32 array

		
		// *** MATERIAL
		//get object whos keys are names of THREE material types and whos value is an index location
		var materialSelector = this.graphicsMaterialCodes();
		
		//create the array of strings that represent THREE materials
		var matTypes = Object.keys(materialSelector);
		
		//pick the material type based on the value in blueprint.material which is a single number index location 
		var selectedMat = matTypes[blueprint.material];
		//Use like: new THREE[selectedMat]( { color:color,map:texture} );
		
		//get an object whos KEYS are names of faces, whos and VALUES are index locations
		var shapeFaceSelector = this.graphicsDefaultMapping(blueprint.shape);
		
		console.log(Object.values(shapeFaceSelector))
		
		var materialArray = new Array();
		var notAssigned = this.NoAssignment;
		
		for(var face in shapeFaceSelector ){
			
			//Yes color, Yes texture
			if(blueprint.colors[face] !== notAssigned && blueprint.colors[face] !== notAssigned){
				var mat = new THREE[selectedMat]( { color:this.textureFiles[blueprint.colors[face]] ,map:this.textureFiles[blueprint.textures[face]]} );
			}
			//No color, No texture
			else if(blueprint.colors[face] === notAssigned && blueprint.colors[face] === notAssigned){
				var mat = new THREE[selectedMat]();
			}
			//No color
			else if(blueprint.colors[face] === notAssigned){
				mat = new THREE[selectedMat]( { map:this.textureFiles[blueprint.textures[face]]} );
			}
			//No texture
			else if(blueprint.colors[face] === notAssigned){
				mat = new THREE[selectedMat]( {color:this.textureFiles[blueprint.colors[face]] } );
			}else{
				console.log("Error in graphicsWorldManager.createGraphics() material selector")
			}
			
			materialArray.push(mat);
		}
		
		var material = new THREE.MeshFaceMaterial(materialArray);
		console.log(material)
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
		
		console.log(geometry)
		//http://threejs.org/docs/#Reference/Objects/Mesh
		var MESH =  new THREE.Mesh(geometry, material);
		console.log(MESH)
		//add to the MASTER object finder
		this.graphicsMasterObject[blueprint.id] = MESH;
		
		//add to the scene
		this.scene.add( MESH );
		
		//return to the requester
		return MESH;
		
}