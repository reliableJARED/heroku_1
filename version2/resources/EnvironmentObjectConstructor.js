	/** PlayerObjectConstructor
		
		*@author Jared / http://reliableJARED.com ,https://github.com/reliableJARED
		
		*date: Nov 14, 2016
	*/

	/*
btRigidBody

__proto__

activate(arg0)
applyCentralForce(vec3)
applyCentralImpulse(vec3)
applyCentralLocalForce(arg0)
applyForce(arg0,arg1)
applyImpulse(arg0,arg1)
applyLocalTorque(arg0)
applyTorque(vec3)
applyTorqueImpulse(vec3)
constructor:btRigidBody(arg0)
forceActivationState(arg0)
getAngularVelocity()
getCenterOfMassTransform()
getCollisionFlags()
getCollisionShape()
getLinearVelocity()
getMotionState()
getUserIndex()
getUserPointer()
getWorldTransform()
isActive()
isKinematicObject()
setActivationState(arg0)
setAngularFactor(arg0)
setAngularVelocity(arg0)
setAnisotropicFriction(arg0,arg1)
setCcdMotionThreshold(arg0)
setCcdSweptSphereRadius(arg0)
setCenterOfMassTransform(arg0)
setCollisionFlags(arg0)
setCollisionShape(arg0)
setContactProcessingThreshold(arg0)
setDamping(arg0,arg1)
setFriction(arg0)
setLinearFactor(arg0)
setLinearVelocity(arg0)
setMassProps(arg0,arg1)
setMotionState(arg0)
setRestitution(arg0)
setRollingFriction(arg0)
setSleepingThresholds(arg0,arg1)
setUserIndex(arg0)
setUserPointer(arg0)
setWorldTransform(arg0)
upcast(arg0)
updateInertiaTensor()
	*/




EnvironmentObjectConstructor = function(obj){
		
		this.physics = obj.physics;//our AMMO portion of this object
		this.id = obj.id;
		this.w = obj.w;
		this.h = obj.h; 
		this.d = obj.d; 
		this.mass = obj.mass; 
		this.shape = obj.shape;
		this.color = obj.color;
		this.texture = obj.texture;
		this.graphicsBody = object;//Threejs
		this.physicsBody = object.userData.physics;//Ammojs
		this.transformAux1 = new Ammo.btTransform();//reusable transform object
		
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

EnvironmentObjectConstructor.prototype.getOrigin = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	var pos = this.transformAux1.getOrigin();
	return {x:pos.x(),y:pos.y(),z:pos.z()};
};

EnvironmentObjectConstructor.prototype.getRotation = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	var quat = this.transformAux1.getRotation();
	return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
};

EnvironmentObjectConstructor.prototype.getLinearVelocity = function(){
	
	var LV =  this.physics.getLinearVelocity();
	return {x:LV.x(), y:LV.y(), z:LV.z()};
};

EnvironmentObjectConstructor.prototype.getAngularVelocityVelocity = function(){
	
	var AV =  this.physics.getAngularVelocity();
	return {x:AV.x(), y:AV.y(), z:AV.z()};
};

EnvironmentObjectConstructor.prototype.x = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().x();
};

EnvironmentObjectConstructor.prototype.y = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().y();
};

EnvironmentObjectConstructor.prototype.z = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1);
	return this.transformAux1.getOrigin().z();
};

EnvironmentObjectConstructor.prototype.Rx = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().x();
};

EnvironmentObjectConstructor.prototype.Ry = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().y();
};

EnvironmentObjectConstructor.prototype.Rz = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().z();
};

EnvironmentObjectConstructor.prototype.Rw = function(){
	
	this.physics.getMotionState().getWorldTransform(this.transformAux1)
	return this.transformAux1.getRotation().w();
};

EnvironmentObjectConstructor.prototype.LVx = function(){
	
	return this.physics.getLinearVelocity().x();
};

EnvironmentObjectConstructor.prototype.LVy = function(){
	
	return this.physics.getLinearVelocity().y();
};

EnvironmentObjectConstructor.prototype.LVz = function(){
	
	return this.physics.getLinearVelocity().z();
};

EnvironmentObjectConstructor.prototype.AVx = function(){
	
	return this.physics.getAngularVelocity().x();
};

EnvironmentObjectConstructor.prototype.AVy = function(){
	
	return this.physics.getAngularVelocity().y();
};

EnvironmentObjectConstructor.prototype.AVz = function(){
	
	return this.physics.getAngularVelocity().z();
};











