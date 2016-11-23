
var BuildWithCubes = function(obj){
	
	this.vector3 = obj.vector3;
	this.createPhysicalCube = obj.constructor;
	this.texture_files_index = obj.texture_files_index;
	this.AddToRigidBodiesIndex = obj.addToWorld;
	this.physicsWorld = obj.physicsWorld;
}



BuildWithCubes.prototype.createCubeTower = function (tex_index,height,width,depth){
	
	//defaults if no args passed for the TOWER, not the blocks
	var height = height || 10;
	var width = width || 2;
	var depth = depth || 2;
	
	//create random location for our tower, near other blocks
	var randX =  Math.floor(Math.random() * 300) - 100;
	var randZ =  Math.floor(Math.random() * 300) - 100;
	var randY = 1;//...not random
	
	this.vector3.setValue(randX,randY,randZ)
	var pos = this.vector3;

	var blockMass = 1; //zero mass makes objects static.  Objects can hit them but they dont move or fall 
	var blockW = 2;
	var blockH = 2;
	var blockD = 2;
	var blockShape = 0;//box =0
	var blockColor = 0xededed;//light gray, rubble will be based on this color
	var blockTexture = this.texture_files_index[tex_index];
	var blockBreakApartForce = 5 ;//DONT HARD CODE THIS
	
		
	//three nested loops will create the tower
	//inner loop lays blocks in a row
	//mid loop starts a new column
	//outer loop starts next new layer up 
	/*IMPORTANT: the number 2 is hard coded because CreateCube() creates 2x2x2 cubes.  bad form... but be aware!*/
	for (var h=1;h<=height;h++) {
		
		for (var w=0;w<width;w++) {
		
			for(var d =0; d<depth;d++){

				var block = this.createPhysicalCube({
						mass : blockMass, 
						w : blockW,
						h : blockH,
						d : blockD,
						shape:blockShape,
						color: blockColor,
						texture:blockTexture,
						x: pos.x(),
						y: pos.y(),
						z: pos.z(),
						Rx: 0,
						Ry: 0,
						Rz: 0,
						breakApartForce: blockBreakApartForce
					});
					
				// block.physics.setActivationState(1);

				this.physicsWorld.addRigidBody( block.physics );
				
				this.AddToRigidBodiesIndex(block);

				//add to pos, used in the placement for our next block being created	
				pos.setX(randX+blockW) //+X dimention
			}

			//Start our new row shifted over depth of our object
			pos.setX(randX);
			pos.setZ(randZ+blockD);//+Z dimention;

		}
		//reset our Z axis
		//start the new grid up one level
		//reset for next column
		pos.setX(randX);
		pos.setZ(randZ);//+Z dimention;
			
		//Start our new layer by moving up the height of our cubes
		pos.setY(blockH*h);

	}
}


//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = BuildWithCubes;