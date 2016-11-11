	/** PlayerObjectConstructor
		
		*@author Jared / http://reliableJARED.com ,https://github.com/reliableJARED
		
		*date: Nov 4, 2016
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
function PlayerObjectConstructor(playerObj) {
	
	'use strict';


	//Check that we got the right args
	if(playerObj.type !== 'Mesh'){
		throw new Error('You did not pass a THREE.js Mesh to PlayerObjectConstructor()');
		}
	if(!playerObj.userData.physics.hasOwnProperty('ptr')){
		throw new Error('THREE.js mesh passed to PlayerObjectConstructor() missing an Ammo.js object assigned to: userData.physics');
	}
	
	this.id = playerObj.userData.id;//string with format 'id0000000'
	this.graphicsBody = playerObj;//Threejs
	this.physicsBody = playerObj.userData.physics;//Ammojs
	this.Health = 100;
	this.Ammo = 100;
	this.thrustFuel = 50;
	this.Items = new Object();//place holder
	this.TopHorizontalSpeed = 15;//although set locally, server uses it's own value.  prevent cheating
	this.TopVerticalSpeed = 15;//although set locally, server uses it's own value.  prevent cheating
	this.ShotSpeed = 500;
	this.RotationSpeed = 0.5;
	this.vector3Aux1 = new Ammo.btVector3();

	//PlayerCube is ALLWAYS ACTIVEATE
	this.physicsBody.setActivationState(4);
			
};

/******Player Attributes */
PlayerObjectConstructor.prototype.setTopHorizontalSpeed = function(speed){
	
	this.TopHorizontalSpeed = speed;
};


PlayerObjectConstructor.prototype.setTopVerticalSpeed = function(speed){
	
	this.TopVerticalSpeed = speed;
};


PlayerObjectConstructor.prototype.setHealth = function(health){
	
	this.Health = health;
};


/**********Current Linear Velocity ****/
PlayerObjectConstructor.prototype.LVlength = function(){
	
	return this.physicsBody.getLinearVelocity().length();
};

PlayerObjectConstructor.prototype.LVx = function(){
	
	return this.physicsBody.getLinearVelocity().x();
};

PlayerObjectConstructor.prototype.LVy = function(){
	
	return this.physicsBody.getLinearVelocity().y();
};

PlayerObjectConstructor.prototype.setLV = function(){
	
	if(arguments.length > 1){
		this.physicsBody.setLinearVelocity(this.vector3Aux1.setValue(arguments[0],[1],[2]));
	}
	else{
/*
TODO: 11/4/16 JMN accept any object with any combo of properties: x,y,z or individual and apply argruments.  used setlv but pass current lv when arg obj hasOwnProperty() fails
*/
//console.log('TODO');
		}
}
	


PlayerObjectConstructor.prototype.LVz = function(){
	
	return this.physicsBody.getLinearVelocity().z();
};

/**********Current Angular Velocity ****/
PlayerObjectConstructor.prototype.AVx = function(){
	
	return this.physicsBody.getAngularVelocity().x();
};

PlayerObjectConstructor.prototype.AVy = function(){
	
	return this.physicsBody.getAngularVelocity().y();
};

PlayerObjectConstructor.prototype.AVz = function(){
	
	return this.physicsBody.getAngularVelocity().z();
};

PlayerObjectConstructor.prototype.AVlength = function(){
	
	return this.physicsBody.getAngularVelocity().length();
};

PlayerObjectConstructor.prototype.setAV = function(){
	
	if(arguments.length > 1){
		this.physicsBody.setAngularVelocity(this.vector3Aux1.setValue(arguments[0],[1],[2]));
	}
	else{
/*
TODO: 11/4/16 JMN accept any object with any combo of properties: x,y,z or individual and apply argruments.  used setav but pass current av when arg obj hasOwnProperty() fails
*/
console.log('TODO');
		}
}

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
	var quat = this.physicsBody.getWorldTransform().getRotation();
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
	
	return this.physicsBody.getWorldTransform().getRotation().x();
};

PlayerObjectConstructor.prototype.quanternionY = function(){
	
	return this.physicsBody.getWorldTransform().getRotation().y();
};

PlayerObjectConstructor.prototype.quanternionZ = function(){
	
	return this.physicsBody.getWorldTransform().getRotation().z();
};

PlayerObjectConstructor.prototype.quanternionW = function(){
	
	return this.physicsBody.getWorldTransform().getRotation().w();
};

/**********World Position X,Y,Z*/
PlayerObjectConstructor.prototype.x = function(){
	
	return this.physicsBody.getWorldTransform().getOrigin().x();
};

PlayerObjectConstructor.prototype.y = function(){
	
	return this.physicsBody.getWorldTransform().getOrigin().y();
};

PlayerObjectConstructor.prototype.z = function(){
	
	return this.physicsBody.getWorldTransform().getOrigin().z();
};