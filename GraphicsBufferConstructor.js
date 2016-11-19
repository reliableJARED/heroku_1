GraphicsBufferConstructor = function (buffSize,physicsWorld,entitiesObject) {
	
	
	this.bufferSize = buffSize;
	this.buffer = new Array(this.bufferSize);	
	this.physicsWorld = physicsWorld;
	this.entitiesObject = entitiesObject;
	this.index_id = 0;
	this.index_x = 1;
	this.index_y = 2;
	this.index_z = 3;
	this.index_Rx = 4;
	this.index_Ry = 5;
	this.index_Rz = 6;
	this.index_Rw = 7;
	this.currentFrame = 0;
	this.ready = false;
	this.movementThreshold = 0.01;
}

GraphicsBufferConstructor.prototype.graphicsBufferUpdate = function(){
	

	if(this.currentFrame < this.bufferSize) {
		this.currentFrame += 1
	}else{
		this.currentFrame =0;
	}

	var IDs = Object.keys(this.entitiesObject);	
	
	this.buffer[this.currentFrame] = new Array();
	var TotalObjs = 0;
	
	// grab current state of things
	for ( var i = 0; i < IDs.length; i++ ) {
	
		//get the objects ID
		var id = IDs[i]

		var objPhys = this.entitiesObject[id].physics;

			if ( objPhys.getLinearVelocity().length() > this.movementThreshold  ) {
			
				var ms = objPhys.getMotionState();
				
				//get the location and orientation of our ACTIVE object
				ms.getWorldTransform( this.transformAux1 );
				
				var p = this.transformAux1.getOrigin();
				var q = this.transformAux1.getRotation();

					this.buffer[this.currentFrame][TotalObjs] =  new Array(8);
					//update our comparisons for moving objs
					this.buffer[this.currentFrame][TotalObjs][this.index_id] = id;
					this.buffer[this.currentFrame][TotalObjs][this.index_x] = p.x();
					this.buffer[this.currentFrame][TotalObjs][this.index_y] = p.y();
					this.buffer[this.currentFrame][TotalObjs][this.index_z] = p.z();
					this.buffer[this.currentFrame][TotalObjs][this.index_Rx] = q.x();
					this.buffer[this.currentFrame][TotalObjs][this.index_Ry] = q.y();
					this.buffer[this.currentFrame][TotalObjs][this.index_Rz] = q.z();
					this.buffer[this.currentFrame][TotalObjs][this.index_Rw] = q.w();
				
				TotalObjs++
			};
	};
	
	//tell renderer what frame from buffer should be drawn
	//it should always be ONE frame ahead so that after looping around it is one buffer rotation behind
	if(this.currentFrame === this.bufferSize ) {
		return 0;
	}else{
		return this.currentFrame+1;
	}
}


GraphicsBufferConstructor.prototype.bufferingGraphics= function(){
	
	if(RENDERING_BUFFER_FRAME < RENDERING_BUFFER_TOTAL_FRAMES) {
		
		console.log('buffer:',RENDERING_BUFFER_FRAME)
		 var deltaTime = clock.getDelta();
		  
		// Step world
		physicsWorld.stepSimulation( deltaTime,10);
		
		graphicsBufferUpdate();
		
		//recursive call until buffer full of 30 frames
		 bufferingGraphics();
	}else{
		console.log('buffer done')
		animate();
	}
	
}
