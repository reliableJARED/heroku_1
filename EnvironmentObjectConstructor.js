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
function EnvironmentObjectConstructor(object) {
	
	'use strict';


	//Check that we got the right args
	if(object.type !== 'Mesh'){
		throw new Error('You did not pass a THREE.js Mesh to EnvironmentObjectConstructor()');
		}
		
	if(!object.userData.physics.hasOwnProperty('ptr')){
		throw new Error('THREE.js mesh passed to EnvironmentObjectConstructor() missing an Ammo.js object assigned to: userData.physics');
	}
	
	this.id = object.userData.id;//string with format 'id0000000'
	this.graphicsBody = object;//Threejs
	this.physicsBody = object.userData.physics;//Ammojs
	this.transformAux1 = new Ammo.btTransform();//used to get position and rotation

	//set to active when created
	this.physicsBody.setActivationState(1);
			
};

/**********World Position X,Y,Z*/
EnvironmentObjectConstructor.prototype.getOrigin = function(){
	
	this.physicsBody.getMotionState().getWorldTransform(this.transformAux1);
	var pos = this.transformAux1.getOrigin();
	return {x:pos.x(),y:pos.y(),z:pos.z()};
};


/**********World Rotation  X,Y,Z,W */
EnvironmentObjectConstructor.prototype.getRotation = function(){
	
	this.physicsBody.getMotionState().getWorldTransform(this.transformAux1)
	var quat = this.transformAux1.getRotation();
	return {x:quat.x(),y:quat.y(),z:quat.z(),w:quat.w()};
};















