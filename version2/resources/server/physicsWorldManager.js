
physicsWorldManager = function (ammo) {
	console.log(ammo)
	this.Ammo = ammo;
	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
};


physicsWorldManager.prototype.createPhysicalCube = function (blueprint){
	

	var mass =  blueprint.mass;
	
	/*set the position of our physics object using our reusable vector object*/
	
	this.vector3Aux1.setValue( blueprint.w * 0.5, blueprint.h * 0.5, blueprint.d * 0.5 )
	
	/*set the orientation of our physics object using our reusable quaternion object*/
	this.quaternionAux1.setEulerZYX(blueprint.Rz,blueprint.Ry,blueprint.Rx);
		
	var physicsShape = new this.Ammo.btBoxShape(this.vector3Aux1);
	
	//set the collision margin, don't use zero, default is typically 0.04
	physicsShape.setMargin(0.04);
	
	/* use a transform to apply the loc/orient of our new physics object in world space using our reusable transform object*/
	//btTransform() supports rigid transforms with only translation and rotation and no scaling/shear.
	this.transformAux1.setIdentity();
	
	this.vector3Aux1.setValue(blueprint.x,blueprint.y,blueprint.z);
	
	this.transformAux1.setOrigin( this.vector3Aux1 );
    
	//setRotation() is for Orientation
	this.transformAux1.setRotation( this.quaternionAux1 );
	
	//set the motion state and inertia of our object
	var motionState = new this.Ammo.btDefaultMotionState( this.transformAux );
	
	var localInertia = this.vector3Aux1.setValue(0,0,0);

	physicsShape.calculateLocalInertia( blueprint.mass, localInertia );
	
	//create our final physics rigid body info
	var rbInfo = new this.Ammo.btRigidBodyConstructionInfo( blueprint.mass, motionState, physicsShape, localInertia );
	
	//build our ridgidBody
	var Cube = new this.Ammo.btRigidBody( rbInfo );
	
	//clean up our blueprint to be returned as the final object
	//delete blueprint.x;
	//delete blueprint.y;
	//delete blueprint.z;
	//delete blueprint.Rx;
	//delete blueprint.Ry;
	//delete blueprint.Rz;
	
	//add new prop holding our object
	blueprint.physics = Cube;
	
	//assign the objects uniqueID
	blueprint.id = 'id'+Cube.ptr.toString();
	//blueprint.id = Cube.ptr;

	//return our object which is now ready to be added to the world
	return blueprint;
}

//IMPORTANT! tells node.js what you'd like to export from this file. 
module.exports = physicsWorldManager;