

if(typeof Ammo === 'undefined'){
	
	console.log('there is no instance of \'node-ammo\'.  Please import first with require(node-ammo) before using PhysicsObjectFactory');
}


var physicsWorldManager = function () {

	this.Ammo = Ammo;//Physics Engine
	this.vector3Aux1 = new this.Ammo.btVector3();
	this.transformAux1 = new this.Ammo.btTransform();
	this.quaternionAux1 = new this.Ammo.btQuaternion();
	this.rigidBodies = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
	
	this.dispatcher; //Collision Manager
	this.IMPACT_IMPULSE_MINIMUM = 1;//minimum collision force required to register
	this.world;//WORLD
	this.init();
}	


physicsWorldManager.prototype.add = function(obj){
	
	//master object organizer
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	//start the object as active
	obj.physics.setActivationState(1);
	//add to our master object organizer
	this.rigidBodies[ID] = obj;

	//add to the actual physics simulations
	this.world.addRigidBody( this.rigidBodies[ID].physics );
}

physicsWorldManager.prototype.remove = function(obj){
	
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	this.world.removeRigidBody( this.rigidBodies[ID].physics);
	
	//remove from our master object organizer
	delete this.rigidBodies[ID];
}

physicsWorldManager.prototype.step = function(deltaTime){
	this.world.stepSimulation( deltaTime,10);
};

function getCollisions(){
	
	//http://www.bulletphysics.org/Bullet/phpBB3/viewtopic.php?p=10269&f=9&t=2568
	
		var CollisionObjIDandImp = new Object(); 
		
		var collisionPairs = this.dispatcher.getNumManifolds();
		
		var minImpact =  this.IMPACT_IMPULSE_MINIMUM;
		
		for(var i=0;i<collisionPairs;i++){
		//for each collision pair, check if the impact impulse of the two objects exceeds our minimum threshold 
		//this will eliminate small impacts from being evaluated, light resting on the ground, gravity acting on object etc.
		
			//truncate with bit OR 0 because don't need decimal
			//var impactForce = this.dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse() | 0;
			var impactImpulse = this.dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse();
			
			//NOTE: impactImpulse != impact force
			//to get force see the link to the bullet forum above.  It would require many extra calcs and would
			//not improve game play, but would slow things down.  for that reason impulse not force will be used.
			//since the goal is basically to check if the object was hit 'hard', not check exactly how hard from all sides

			if( impactImpulse > minImpact){

				//Objects ptr id, MUST be a string to be used as lookup
				var Obj1_lookupID = dispatcher.getManifoldByIndexInternal(i).getBody0().ptr.toString();
				var Obj2_lookupID = dispatcher.getManifoldByIndexInternal(i).getBody1().ptr.toString();
				
				//A single object can be in more than one collision, we want to record the LARGEST
				
				//Object 1
				if(CollisionObjIDandImp[Obj1_lookupID] === 'undefined'){
					CollisionObjIDandImp[Obj1_lookupID] = impactImpulse;
				}else{
					if(impactImpulse > CollisionObjIDandImp[Obj1_lookupID] ){
						CollisionObjIDandImp[Obj1_lookupID] = impactImpulse}
				}
				
				//Object 2
				if(CollisionObjIDandImp[Obj2_lookupID] === 'undefined'){
					CollisionObjIDandImp[Obj2_lookupID] = impactImpulse;
				}else{
					if(impactImpulse > CollisionObjIDandImp[Obj2_lookupID] ){
						CollisionObjIDandImp[Obj2_lookupID] = impactImpulse}
				}

		
			};
		};
	
	return CollisionObjIDandImp;
};


physicsWorldManager.prototype.init = function (){
	/*Private Variables*/
	const gravityConstant = -9.6;
	const broadphase = new this.Ammo.btDbvtBroadphase();//BROAD
	const collisionConfiguration = new this.Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	const solver = new this.Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	const softBodySolver = new this.Ammo.btDefaultSoftBodySolver();//SOLVER
	
	
	/*Public Variables*/
	//dispatcher is used to determine what objects are in collision
	this.dispatcher = new this.Ammo.btCollisionDispatcher( collisionConfiguration );//DISPATCHER
	
	//our World
	this.world = new this.Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
				
	//note setGravity accepts a vector, you could set gravitationl force in x or z too if you wanted.	
	this.vector3Aux1.setValue( 0, gravityConstant, 0 )	
	this.world.setGravity( this.vector3Aux1 );
}


//IMPORTANT! tells node.js what you'd like to export from this file. 
//module.exports = physicsWorldManager; //constructor

// Export a convenience function that creates an instance
module.exports = (function() {
  return new physicsWorldManager();//Instance
})();
