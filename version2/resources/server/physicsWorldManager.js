

if(typeof Ammo === 'undefined'){
	
	console.log('**********ERROR*******************There is no instance of \'node-ammo\'.  Please import first with require(node-ammo) before using PhysicsObjectFactory********************************');
}

const IMPACT_IMPULSE_MINIMUM = 1;//minimum collision force required to register

var physicsWorldManager = function () {

	//keep these on instance NOT prototype like they are with rigidBodies from the 'PhysicsObjectFactory()'
	this.vector3 = new Ammo.btVector3();
	this.transform = new Ammo.btTransform();
	this.quaternion = new Ammo.btQuaternion();
	
	this.rigidBodies = new Object();//holds info about world objects.  Sent to newly connected clients so that they can build the world.  Similar to ridgidBodies but includes height, width, depth, color, object type.
		
	/*Private Variables*/
	const gravityConstant = -9.6;
	
	const broadphase = new Ammo.btDbvtBroadphase();//BROAD
	
	//IMPORTANT: Don't need this config if no soft bodies!
	//const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration() ;//NARROW
	
	
	const solver = new Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	
	//IMPORTANT: Don't need this softBodySolver if no soft bodies!
	//remove from btSoftRigidDynamicsWorld() args if not using
	const softBodySolver = new Ammo.btDefaultSoftBodySolver();//SOLVER

	
	/*Public Variables*/
	//dispatcher is used to determine what objects are in collision
	this.dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );//DISPATCHER
	
	//THE VERY IMPORTANT ALL POWERFUL: PHYSICS WORLD
	this.world = new Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration)//, softBodySolver);
				
	//note: setGravity accepts a vector, you could set gravitationl force in x or z too if you wanted.	
	this.vector3.setValue( 0, gravityConstant, 0 )	
	this.world.setGravity( this.vector3 );
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

/*
GENERAL collision detection notes:

1) there are a lot of options, see: http://www.bulletphysics.org/mediawiki-1.5.8/index.php?title=Collision_Callbacks_and_Triggers

the best options will obviously be subject to the specific goal.  In the case of smashing blocks we don't care what hit them, just that they were struck with enough force to break.

In the case of colliding with a 'power up' we only care that it was struck and by which player.

for this reason the getCollisionPairsArray() menthod was created.  It returns an array with the form [force,obj1,obj2,force,obj1,obj2,etc.]

you can now tell what two objects collided and with how much force.

*/
physicsWorldManager.prototype.getCollisionPairsArray = function(){
	
	var collisionPairs = this.dispatcher.getNumManifolds();

	//for each pair we need 3 index positions [force,obj1,obj2]
	//using typedArray in the event this needs to be sent to clients as binary
	//var collisionPairsArray = new Int32Array(collisionPairs*3);
	var collisionPairsArray = new Array();
	
	var IndexPosition = 0 ;
	
	for(var i=0;i<collisionPairs;i++){
		
		//truncate decimal, don't need that high of precision
		var impactImpulse = this.dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse() | 0;
		
		if( impactImpulse > IMPACT_IMPULSE_MINIMUM){
				
				var Obj1_collisionObject = this.dispatcher.getManifoldByIndexInternal(i).getBody0();
				var Obj2_collisionObject = this.dispatcher.getManifoldByIndexInternal(i).getBody1();

				//isActive() will help eliminate reporting objects resting on eachother.
				//they are technically in collision but we don't care.... or do we?!
				if(Obj2_collisionObject.isActive() && Obj1_collisionObject.isActive()){
					
					collisionPairsArray.push(impactImpulse,Obj1_collisionObject.ptr,Obj2_collisionObject.ptr)
					//collisionPairsArray[IndexPosition] = impactImpulse;
					//collisionPairsArray[IndexPosition+1] = Obj1_collisionObject.ptr;
					//collisionPairsArray[IndexPosition+2] = Obj2_collisionObject.ptr;
					//IndexPosition += 3;	
				};
				
			};
	}
	
	return collisionPairsArray;
}
physicsWorldManager.prototype.getCollisionImpulses = function(){

	//http://www.bulletphysics.org/Bullet/phpBB3/viewtopic.php?p=10269&f=9&t=2568
	
		var CollisionObjs_IDandImpact = new Object(); 
		var ThereWereCollisions = false;
		
		var collisionPairs = this.dispatcher.getNumManifolds();

		for(var i=0;i<collisionPairs;i++){
		//for each collision pair, check if the impact impulse of the two objects exceeds our minimum threshold 
		//this will eliminate small impacts from being evaluated, light resting on the ground, gravity acting on object etc.
		
			//truncate with bit OR 0 because don't need decimal, not looking for that high precision

			var impactImpulse = this.dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse() | 0;
			//var impactImpulse = this.dispatcher.getManifoldByIndexInternal(i).getContactPoint().getAppliedImpulse();
			
			//NOTE: impactImpulse != impact force
			//to get force see the link to the bullet forum above.  It would require many extra calcs and would
			//not improve game play, but would slow things down.  for that reason impulse not force will be used.
			//since the goal is basically to check if the object was hit 'hard', not check exactly how hard from all sides

			if( impactImpulse > IMPACT_IMPULSE_MINIMUM){
				
				var Obj1_collisionObject = this.dispatcher.getManifoldByIndexInternal(i).getBody0()
				var Obj2_collisionObject = this.dispatcher.getManifoldByIndexInternal(i).getBody1();
				
				//OBJECT 1
				//first check if it's active.  Resting on the ground produces a collision, but isActive() = false
				if(Obj1_collisionObject.isActive()){
					
					//flag that we will be returning something
					ThereWereCollisions = true;
					
					//Objects ptr id, MUST be a string to be used as lookup
					//a collision object ptr will match our rigidBodies ptr
					var Obj1_lookupID = Obj1_collisionObject.ptr.toString();
					
					//A single object can be in more than one collision, we want to record the LARGEST
					if(typeof CollisionObjs_IDandImpact[Obj1_lookupID] === 'undefined'){
						CollisionObjs_IDandImpact[Obj1_lookupID] = impactImpulse;
					}else{
						if(impactImpulse > CollisionObjs_IDandImpact[Obj1_lookupID] ){
							CollisionObjs_IDandImpact[Obj1_lookupID] = impactImpulse}
					}
				}
				////OBJECT 2
				if(Obj2_collisionObject.isActive()){
					ThereWereCollisions = true;
					var Obj2_lookupID = Obj2_collisionObject.ptr.toString();
					if(typeof CollisionObjs_IDandImpact[Obj2_lookupID] === 'undefined'){
						CollisionObjs_IDandImpact[Obj2_lookupID] = impactImpulse;
					}else{
						if(impactImpulse > CollisionObjs_IDandImpact[Obj2_lookupID] ){
							CollisionObjs_IDandImpact[Obj2_lookupID] = impactImpulse}
					}
				}
		
			};
		};
	
	//if(Object.keys(CollisionObjs_IDandImpact).length > 0){
	if(ThereWereCollisions){
		return CollisionObjs_IDandImpact
	}else{
		return false;
	}
};


/*********
getCollisionForces() EXPERIMENTAL METHOD UNDER DEVELOPMENT 
***********/
physicsWorldManager.prototype.getCollisionForces = function(timeStep){

	//http://www.bulletphysics.org/Bullet/phpBB3/viewtopic.php?p=10269&f=9&t=2568
	
	/*
	void myTickCallback( btDynamicsWorld *world, btScalar timeStep) {
   if (world)
      world->performDiscreteCollisionDetection();
   int i;
   ///one way to draw all the contact points is iterating over contact manifolds / points:
   int numManifolds = dynamicsWorld->getDispatcher()->getNumManifolds();
   for (i=0;i<numManifolds;i++)
   {
      btPersistentManifold* contactManifold = world->getDispatcher()->getManifoldByIndexInternal(i);
      btCollisionObject* obA = static_cast<btCollisionObject*>(contactManifold->getBody0());
      btCollisionObject* obB = static_cast<btCollisionObject*>(contactManifold->getBody1());

      int numContacts = contactManifold->getNumContacts();
      for (int j=0;j<numContacts;j++)
      {
         btManifoldPoint& contactPoint = contactManifold->getContactPoint(j);
         btVector3 normal = contactPoint.m_normalWorldOnB;
         btScalar angleX = normal.angle(btVector3(1,0,0));
         btScalar angleY = normal.angle(btVector3(0,1,0));
         btScalar angleZ = normal.angle(btVector3(0,0,1));
         btScalar impulseX = contactPoint.m_appliedImpulse*cos(angleX);
         btScalar impulseY = contactPoint.m_appliedImpulse*cos(angleY);
         btScalar impulseZ = contactPoint.m_appliedImpulse*cos(angleZ);
         btScalar forceX = impulseX/(timeStep);
         btScalar forceY = impulseY/(timeStep);
         btScalar forceZ = impulseZ/(timeStep);
         //printf("Force: %8.6f %8.6f %8.6f %8.6f \n",(float)timeStep,forceX,forceY,forceZ);
      }
   }
}
	*/
	var collisionCount = this.dispatcher.getNumManifolds();
	console.log("total collisions:",collisionCount)
	
	for(var i=0; i<collisionCount;i++){
		//collisionPair is a btPersistentManifold object
		//http://bulletphysics.org/Bullet/BulletFull/btPersistentManifold_8h_source.html#l00043
		var collisionPair = this.dispatcher.getManifoldByIndexInternal(i);
		
		var obj1 = collisionPair.getBody0();
		var obj2 = collisionPair.getBody1();
		
		var contactsCount = collisionPair.getNumContacts();
		console.log("collision",i+1," contact count:",contactsCount)
		
		for(var j=0; j<contactsCount;j++){
			var contactPoint = collisionPair.getContactPoint(j);
			
			//contactPoint is a btManifoldPoint object
			//http://bulletphysics.org/Bullet/BulletFull/btManifoldPoint_8h_source.html#l00136
			
			//FYI the 'distance' returned from  contactPoint.getDistance() is related to the CollisionMargin 
			//set for the object. >0 no touch <0 penetrating(ie touch) =0 exactly touch. 
			//http://bulletphysics.org/Bullet/phpBB3/viewtopic.php?t=5831
			var pointVector = contactPoint.getPositionWorldOnB();
			
			var angleX = pointVector.x();
			var angleY = pointVector.y();
			var angleZ = pointVector.z();
			
			var impulse = contactPoint.getAppliedImpulse()
			if(impulse > 1){
				var impulseX = impulse*Math.cos(angleX);
				var impulseY = impulse*Math.sin(angleY);
				var impulseZ = impulse*Math.cos(angleZ);

				console.log("Ximp:",impulseX,"Yimp:",impulseY,"Zimp:",impulseZ)
				console.log("Xang:",angleX,"Yang:",angleY,"Zang:",angleZ)
			}	
			
		}
	}
	
};



//IMPORTANT! tells node.js what you'd like to export from this file. 
//module.exports = physicsWorldManager; //constructor

// Export an instance when imported
module.exports =  (function(){
	//this assumes you would only ever have ONE world....
	//convert to regular function not an IIEF if more than one world is expected
	return new physicsWorldManager();//instance
})();