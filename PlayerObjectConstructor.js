	/** PlayerObjectConstructor
		
		*@author Jared / http://reliableJARED.com ,https://github.com/reliableJARED
		
		*date: Nov 4, 2016
	*/

	/*
btRigidBody

__proto__

activate(arg0)
applyCentralForce(arg0)
applyCentralImpulse(arg0)
applyCentralLocalForce(arg0)
applyForce(arg0,arg1)
applyImpulse(arg0,arg1)
applyLocalTorque(arg0)
applyTorque(arg0)
applyTorqueImpulse(arg0)
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
function PlayerObjectConstructor(rbID,rigidBodies) {
	
	'use strict';
	
	//rbID is a uniqueID assigned to all rigigdbodies in physics world
	//rigidBodies is the main object that holds all of our world physics objects.
	//an individual object can be found in rigidBodies by doing rigidBodies[rbID]
	
	//Check that we got the right args
	if(rigidBodies[rbID].type !== 'Mesh'){
		throw new Error('You did not pass a THREE.js Mesh to PlayerObjectConstructor()');
		}
	if(!rigidBodies[rbID].userData.physics.hasOwnProperty('ptr')){
		throw new Error('THREE.js mesh passed to PlayerObjectConstructor() missing an Ammo.js object assigned to: userData.physics');
	}
	
	this.id = rbID;//string with format 'id0000000'
	this.Graphics = rigidBodies[this.id];//Threejs
	this.Physics = rigidBodies[this.id].userData.physics;//Ammojs
	this.Health = 100;
	this.Items = new Object();//place holder
	this.TopHorizontalSpeed = 15;//although set locally, server uses it's own value.  prevent cheating
	this.TopVerticalSpeed = 15;//although set locally, server uses it's own value.  prevent cheating
};

/******Player Attributes */
PlayerObjectConstructor.prototype.setTopHorizontalSpeed = function(speed){
	
	this.TopHorizontalSpeed = speed;
};
PlayerObjectConstructor.prototype.getTopHorizontalSpeed = function(){
	
	return this.TopHorizontalSpeed;
};

PlayerObjectConstructor.prototype.setTopVerticalSpeed = function(speed){
	
	this.TopVerticalSpeed = speed;
};

PlayerObjectConstructor.prototype.getTopVerticalSpeed = function(){
	
	return this.TopVerticalSpeed;
};

PlayerObjectConstructor.prototype.setHealth = function(health){
	
	this.Health = health;
};

PlayerObjectConstructor.prototype.getHealth = function(){
	
	return this.Health;
};

/**********Current Linear Velocity ****/
PlayerObjectConstructor.prototype.LVlength = function(){
	
	return this.Physics.getLinearVelocity().length();
};

PlayerObjectConstructor.prototype.LVx = function(){
	
	return this.Physics.getLinearVelocity().x();
};

PlayerObjectConstructor.prototype.LVy = function(){
	
	return this.Physics.getLinearVelocity().y();
};

PlayerObjectConstructor.prototype.LVz = function(){
	
	return this.Physics.getLinearVelocity().z();
};

/**********Current Angular Velocity ****/
PlayerObjectConstructor.prototype.AVx = function(){
	
	return this.Physics.getAngulVelocity().x();
};

PlayerObjectConstructor.prototype.AVy = function(){
	
	return this.Physics.getAngulVelocity().y();
};

PlayerObjectConstructor.prototype.AVz = function(){
	
	return this.Physics.getAngulVelocity().z();
};

PlayerObjectConstructor.prototype.AVlength = function(){
	
	return this.Physics.getAngulVelocity().length();
};
/*
http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToEuler/
Convert quanternion to randians:
heading = atan2(2*qy*qw-2*qx*qz , 1 - 2*qy2 - 2*qz2)
attitude = asin(2*qx*qy + 2*qz*qw) 
bank = atan2(2*qx*qw-2*qy*qz , 1 - 2*qx2 - 2*qz2)
*/

PlayerObjectConstructor.prototype.heading = function(){
	
	//heading(y) = atan2(2*qy*qw-2*qx*qz , 1 - 2*qy2 - 2*qz2)
	//Math.atan2(y, x)
	var quat = this.Physics.getWorldTransform().getRotation();
	var arg1 = (2*quat.y()*quat.w() - 2*quat.x()*quat.z());
	var arg2 = (1 - 2*(quat.y()*quat.y()) - 2 * (quat.z()*quat.z()));
	
	//help match up with Three js as this function is used in camera control
	//result is 0 to Pi, but ThreeJS does 0 to Pi/2
	//Math.atan() didn't yield correct results
	var result =  Math.atan2(arg1, arg2);
	
	if(result > 1.55){
		return Math.PI - result;
	}
	else if(result < -1.55){
		return -Math.PI - result;
	}
	else{
		return result;
	}
};

/**********World Rotation  X,Y,Z,W */
PlayerObjectConstructor.prototype.quanternionX = function(){
	
	return this.Physics.getWorldTransform().getRotation().x();
};

PlayerObjectConstructor.prototype.quanternionY = function(){
	
	return this.Physics.getWorldTransform().getRotation().y();
};

PlayerObjectConstructor.prototype.quanternionZ = function(){
	
	return this.Physics.getWorldTransform().getRotation().z();
};

PlayerObjectConstructor.prototype.quanternionW = function(){
	
	return this.Physics.getWorldTransform().getRotation().w();
};

/**********World Position X,Y,Z*/
PlayerObjectConstructor.prototype.x = function(){
	
	return this.Physics.getWorldTransform().getOrigin().x();
};

PlayerObjectConstructor.prototype.y = function(){
	
	return this.Physics.getWorldTransform().getOrigin().y();
};

PlayerObjectConstructor.prototype.z = function(){
	
	return this.Physics.getWorldTransform().getOrigin().z();
};