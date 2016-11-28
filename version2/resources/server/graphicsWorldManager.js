

var graphicsWorldManager = function (texture_files_array,texture_files_index_key) {
	
	this.INDEX = texture_files_index_key;// object whos keys represent index of files in the texture files array
	this.TEXTURE_FILES = texture_files_array;//an array of image files ['pic.png', 'house.jpg', etc]
	this.NoAssignment = -1;
	this.grapicBodiesIndex = new Object();//associates an ID with graphics component
	this.cubeShape = 0;
	this.cubeDataSize = {int32:7, int8:7, f32:3};
	
	/*This is strange way to do it, but done this way to easily change key names if needed*/
	this.headerKey = 'header';
	this.textureKey = 'textures';
	this.colorKey = 'colors';
	this.dimensionKey = 'dimensions';
	this.cubeDataKeys ={
		face1: 'front',
		face2: 'back',
		face3: 'top',
		face4: 'bottom',
		face5: 'left',
		face6: 'right'
		width: 'width',
		height: 'height',
		depth: 'depth'
	}
	
	
};

graphicsWorldManager.prototype.makeCube = function(obj,texture,color){
	//obj is typically a physics object built using RigidBodyConstructor(), but all that it really needs to have is ID and dimension props
	/*properties that  obj needs to have are: 
		obj.id; VERY IMPORTANT! uniqueID to associate this graphic with a physics object
		obj.w; width
		obj.h;  height
		obj.d; depth
	*/
	
	//for color or texture not assigned to an object face, default is none
	var DefaultNone = {
		[this.cubeDataKeys.face1]:this.NoAssignment,
		[this.cubeDataKeys.face2]:this.NoAssignment,
		[this.cubeDataKeys.face3]:this.NoAssignment,
		[this.cubeDataKeys.face4]:this.NoAssignment,
		[this.cubeDataKeys.face5]:this.NoAssignment,
		[this.cubeDataKeys.face6]:this.NoAssignment
	}
	//DIMENSIONS:
	//obj argument has the height,width,depth of the cubeShape
	//when packed as an array will become float32
	//FLOAT32: 3
	
	//TEXTURE:
	//texture argument passed in is an object with one or some of props: front, back,top,bottom,left,right.  
	/*the obj will be converted to an Int8Array.  We are using arrays because data will travel via network and JSON strings are ineffecient.  The texture assignment array is structured as:
	[front,back,top,bottom,left,right]
		where front, back, etc. are Index LOCATIONS of image files in our texture files array. File name strings are NOT saved here.
	INT8:6
	*/
	
	// replace the defaults with texture arguments passed in:
	var textures = Object.assign{DefaultNone,texture};
	
	
	//COLOR:
	/*Similar to texture, we assign colors the same way.  Colors are hexadecimal so they will become int32 arrays, and are structured :
	[front,back,top,bottom,left,right]
		where front, back, etc. are hexadecimal colors.  example WHITE would be: 0xffffff
	INT32:6
	*/
	//now replace the defaults with color arguments passed in:
	var colors = Object.assign{DefaultNone,color}
	
	//HEADER:
	//indicates what the shape is so client knows how the data is structured and can unpack it
	// INT8:1
	
	var ID;
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}
	
	
	this.grapicBodiesIndex[ID] = {
		[this.headerKey]:this.cubeShape ,
		[this.textureKey]:textures,
		[this.colorKey]:colors,
		[this.dimensionKey]:{[this.cubeDataKeys.width]:obj.w,[this.cubeDataKeys.height]:obj.h,[this.cubeDataKeys.depth]:obj.d}
	};
};

graphicsWorldManager.prototype.binary_cube = function(ID){
	
	var int32 = new Int32Array(this.cubeDataSize.int32);//ORDER: id,color:front,back,top,bottom,left,right -> 7
	var int8 = new Int8Array(this.cubeDataSize.int8);//ORDER: shape,texture:front,back,top,bottom,left,right -> 7
	var f32 = new Float32Array(this.cubeDataSize.f32);//ORDER: width,height,depth ->3
	
	var totalBytes = (this.cubeDataSize.int32 * 4) +(this.cubeDataSize.int8)+(this.cubeDataSize.f32 * 4)
	
	if(typeof ID !== 'number'){ID = parseInt(ID,10)};
	
	var graphicsObj = this.grapicBodiesIndex[ID.toString()];
	
	int32[0] = ID;
	int32[1] = graphicsObj[this.colorKey][this.cubeDataKeys.face1];
	int32[2] = graphicsObj[this.colorKey][this.cubeDataKeys.face2];
	int32[3] = graphicsObj[this.colorKey][this.cubeDataKeys.face3];
	int32[4] = graphicsObj[this.colorKey][this.cubeDataKeys.face4];
	int32[5] = graphicsObj[this.colorKey][this.cubeDataKeys.face5];
	int32[6] = graphicsObj[this.colorKey][this.cubeDataKeys.face6];
	
	int8[0] = this.cubeShape;
	int8[1] = graphicsObj[this.textureKey][this.cubeDataKeys.face1];
	int8[2] = graphicsObj[this.textureKey][this.cubeDataKeys.face2];
	int8[3] = graphicsObj[this.textureKey][this.cubeDataKeys.face3];
	int8[4] = graphicsObj[this.textureKey][this.cubeDataKeys.face4];
	int8[5] = graphicsObj[this.textureKey][this.cubeDataKeys.face5];
	int8[6] = graphicsObj[this.textureKey][this.cubeDataKeys.face6];
	
	f32[0] =  graphicsObj[this.dimensionKey][this.cubeDataKeys.width];
	f32[1] =  graphicsObj[this.dimensionKey][this.cubeDataKeys.height];
	f32[2] =  graphicsObj[this.dimensionKey][this.cubeDataKeys.depth];
	
	

	//prepare binary
	var int32Buffer = Buffer.from(int32.buffer);
	var int8Buffer = Buffer.from(int8.buffer);
	var f32Buffer = Buffer.from(f32.buffer);

	var binaryData = Buffer.concat([int32Buffer,int8Buffer,f32Buffer],totalBytes);
	
	return binaryData
	
}

graphicsWorldManager.prototype.exportBinary(ID) = function(ID){
	var LookUp;
	if(typeof ID !== 'string'){LookUp = ID.toString()}
	else{LookUp = ID};
	
	var graphicsObj = this.grapicBodiesIndex[ID];
	
	//check what kind of shape this is
	if(graphicsObj[this.headerKey] === this.cubeShape){
		return this.binary_cube(ID);
	}
	
}