

var RigidBodyConstructor = function(obj,byteInt32,byteInt8, byteF32){
		
		this.physics = obj.physics;//our AMMO portion of this object
		this.id = obj.id;
		this.w = obj.w;
		this.h = obj.h; 
		this.d = obj.d; 
		this.mass = obj.mass; 
		this.shape = obj.shape;
		this.color = obj.color;
		this.texture = obj.texture;
		this.player = obj.player;
		this.breakApartForce = obj.breakApartForce;
		this.destroyObject = obj.destroyObject;
		this.transformAux1 = new Ammo.btTransform();//reusable transform object
		
		/*used for binary exporting*/
		this.int32Count = byteInt32;//id
		this.int8Count = byteInt8;//w,h,d,mass,texture,shape,player
		this.float32Count = byteF32;//color,x,y,z,Rx,Ry,Rz,Rw
		
		this.totalBytes = (this.int32Count*4)+(this.int8Count)+(this.float32Count*4);
	
};

RigidBodyConstructor.prototype.breakObject = function(impactForce){
	
	//this.destroyObject is a flag to indicate obj is already qued for destruction
	if(this.breakApartForce === 0 || this.breakApartForce > impactForce || this.destroyObject){
			return false;
	}else{
			this.destroyObject = true;
			this.breakApartForce = impactForce;
			return true;
	};
};

RigidBodyConstructor.prototype.getOrigin = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	var pos = this.transformAux1.getOrigin();
	return {x:pos.x(),y:pos.y(),z:pos.z()};
};

RigidBodyConstructor.prototype.getRotation = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	var quat = this.transformAux1.getRotation();
	return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
};

RigidBodyConstructor.prototype.getLinearVelocity = function(){
	
	var LV =  this.physics.getLinearVelocity();
	return {x:LV.x(), y:LV.y(), z:LV.z()};
};

RigidBodyConstructor.prototype.getAngularVelocityVelocity = function(){
	
	var AV =  this.physics.getAngularVelocity();
	return {x:AV.x(), y:AV.y(), z:AV.z()};
};

RigidBodyConstructor.prototype.x = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().x();
};

RigidBodyConstructor.prototype.y = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().y();
};

RigidBodyConstructor.prototype.z = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().z();
};

RigidBodyConstructor.prototype.Rx = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().x();
};

RigidBodyConstructor.prototype.Ry = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().y();
};

RigidBodyConstructor.prototype.Rz = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().z();
};

RigidBodyConstructor.prototype.Rw = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().w();
};

RigidBodyConstructor.prototype.LVx = function(){
	
	return this.physics.getLinearVelocity().x();
};

RigidBodyConstructor.prototype.LVy = function(){
	
	return this.physics.getLinearVelocity().y();
};

RigidBodyConstructor.prototype.LVz = function(){
	
	return this.physics.getLinearVelocity().z();
};

RigidBodyConstructor.prototype.AVx = function(){
	
	return this.physics.getAngularVelocity().x();
};

RigidBodyConstructor.prototype.AVy = function(){
	
	return this.physics.getAngularVelocity().y();
};

RigidBodyConstructor.prototype.AVz = function(){
	
	return this.physics.getAngularVelocity().z();
};

RigidBodyConstructor.prototype.exportJSON = function(){
	
	var pos = this.getOrigin();
	var quat = this.getRotation();
	return {
		id:this.id,
		x:pos.x, 
		y:pos.y, 
		z:pos.z,
		Rx:quat.x,
		Ry:quat.y, 
		Rz:quat.z, 
		Rw:quat.w,
		w:this.w,
		h:this.h, 
		d:this.d,
		mass:this.mass,
		shape:this.shape,
		color:this.color,
		texture:this.texture,
		player:this.player
	};	
}

RigidBodyConstructor.prototype.exportBinary = function(){
	                   

	var int32 = new Int32Array(this.int32Count);//ORDER: id,w,h,d,mass,
	var int8 = new Int8Array(this.int8Count);//ORDER: texture,shape,player
	var f32 = new Float32Array(this.float32Count);//ORDER: color,x,y,z,Rx,Ry,Rz,Rw

	int32[0] = parseInt(this.id.slice(2),10);//remove the 'id' and return as number
	int32[1] = this.w;
	int32[2] = this.h;
	int32[3] = this.d;
	int32[4] = this.mass;
	
	int8[0] = this.texture;
	int8[1] = this.shape;
	int8[2] = this.player;
	
	f32[0] = this.color;
	f32[1] = this.x();
	f32[2] = this.y();
	f32[3] = this.z();
	f32[4] = this.Rx();
	f32[5] = this.Ry();
	f32[6] = this.Rz();
	f32[7] = this.Rw();
	

	//prepare binary
	var int32Buffer = Buffer.from(int32.buffer);
	var int8Buffer = Buffer.from(int8.buffer);
	var f32Buffer = Buffer.from(f32.buffer);

	var binaryData = Buffer.concat([int32Buffer,int8Buffer,f32Buffer],this.totalBytes);
	
	return binaryData
}

//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = RigidBodyConstructor;