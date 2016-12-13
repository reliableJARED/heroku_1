

if(typeof Ammo === 'undefined'){
	
	console.log('*******ERROR**********************There is no instance of \'Ammo\'.  Please import ammo.js first before using PhysicsWorldManager_client****************************');
}
const IMPACT_IMPULSE_MINIMUM = 1;//minimum collision force required to register

var physicsWorldManager = function () {

	/*
	HAVE Collision handling done by a function that is passed in.  the PWM will get all the collisions, then
	use the passed in function(s) to determine what to do with them.
	*/

	//keep these on instance NOT prototype like they are with rigidBodies from the 'PhysicsObjectFactory()'
	this.vector3 = new Ammo.btVector3();
	this.transform = new Ammo.btTransform();
	this.quaternion = new Ammo.btQuaternion();
	
	
	//ORGANIZERS: The rigidBodiesMasterObject and rigidBodiesMasterArray hold reference to all objects in the world.
	
	//Use rigidBodiesMasterObject to Find Objects by their ptr ID
	this.rigidBodiesMasterObject = new Object();
	
	//Use rigidBodiesMasterArray to Find Objects by their UserIndex
	this.rigidBodiesMasterArray = new Array(); 
	
	/*Private Variables*/
	const gravityConstant = -9.6;
	
	const broadphase = new Ammo.btDbvtBroadphase();//BROAD
	
	//NOTE: Don't need btSoftBodyRigidBodyCollisionConfiguration() config if no soft bodies!
	//const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration() ;//NARROW
	const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration() ;//NARROW
	
	const solver = new Ammo.btSequentialImpulseConstraintSolver();//SOLVER
	
	//IMPORTANT: Don't need this softBodySolver if no soft bodies!
	//remove from btSoftRigidDynamicsWorld() args if not using
	// new Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration)
	const softBodySolver = new Ammo.btDefaultSoftBodySolver();//SOLVER

	
	/*Public Variables*/
	//dispatcher is used to determine what objects are in collision
	this.dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );//DISPATCHER
	
	//THE VERY IMPORTANT ALL POWERFUL: PHYSICS WORLD
	this.world = new Ammo.btSoftRigidDynamicsWorld( this.dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
	
	//note: setGravity accepts a vector, you could set gravitationl force in x or z too if you wanted.	
	this.vector3.setValue( 0, gravityConstant, 0 )	
	this.world.setGravity( this.vector3 );
}	


physicsWorldManager.prototype.add = function(obj){
	
	//Zero Indexed so get the length BEFORE pushing the new obj
	var UserIndex = this.rigidBodiesMasterArray.length;
	this.rigidBodiesMasterArray.push(obj);
	
	//IMPORTANT!!!
	//you can set or get UserIndex.  ONLY this menthod should ever set it
	//it is a very import attribute that ties collisions back to objects, EFFECIENTLY
	obj.physics.setUserIndex(UserIndex);
	
	//master object organizer
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	//start the object as active
	obj.physics.setActivationState(1);
	
	//add to our master object organizer
	this.rigidBodiesMasterObject[ID] = obj;
	
	//add to the actual physics simulations
	this.world.addRigidBody( this.rigidBodiesMasterArray[UserIndex].physics );
}


physicsWorldManager.prototype.reassignIndexLocationsAfterIndex = function(IndexPosition){
	
	//update ALL the indexlocations for elements AFTER this one
	//....If large numbers of objects are being removed this method sux
	for(var i = IndexPosition, total = this.ridgidBodiesArray.length; i <total;i++){
		
		this.rigidBodiesMasterArray[i].physics.setUserIndex(i);
	};
	
}
physicsWorldManager.prototype.removeObj = function(obj){
	
	var ID; 
	if(typeof obj.id !== 'string'){ID = obj.id.toString()}
	else{ID = obj.id;}

	this.world.removeRigidBody( this.rigidBodiesMasterObject[ID].physics);
	
	//remove from our master object organizer
	delete this.rigidBodiesMasterObject[ID];
	
	//index location in our master array
	var IndexPosition = obj.physics.getUserIndex();
	
	//remove it from our master array
	this.rigidBodiesMasterArray.splice(IndexPosition,1);
	
	//update ALL the indexlocations for elements AFTER this one
	this.reassignIndexLocationsAfterIndex()
}

physicsWorldManager.prototype.removeObjByID = function(objID){
	
	var ID; 
	if(typeof objID !== 'string'){ID = objID.toString()}
	else{ID = objID;}

	//remove from simulation
	this.world.removeRigidBody( this.rigidBodiesMasterObject[ID].physics);
	
	//get objects index location in our master array
	var IndexPosition = this.rigidBodiesMasterObject[ID].physics.getUserIndex();
	
	//remove from our master object organizer
	delete this.rigidBodiesMasterObject[ID];
	
	//remove it from our master array
	this.rigidBodiesMasterArray.splice(IndexPosition,1);
	
	//update ALL the indexlocations for elements AFTER this one
	this.reassignIndexLocationsAfterIndex(IndexPosition)
}

physicsWorldManager.prototype.removeObjByIndex = function(IndexPosition){
	
	var object = this.ridgidBodiesArray[IndexPosition];
	
	//remove from simulation
	this.world.removeRigidBody( object.physics);
	
	//remove from our master object organizer
	var ID = object.id;
	if(typeof ID !== 'string'){ID = ID.toString()};
	delete this.rigidBodiesMasterObject[ID];
	
	//remove it from our master array
	this.rigidBodiesMasterArray.splice(IndexPosition,1);
	
	//update ALL the indexlocations for elements AFTER this one
	this.reassignIndexLocationsAfterIndex(IndexPosition)
};

physicsWorldManager.prototype.removeObjByIndexBatch = function(IndexPositionsArray){
	
	//FIRST:
	//sort array deccending
	IndexPositionsArray.sort(function(a, b){return b - a});

	//SECOND:
	//remove the objects from master locations
	for(var i=0,count=IndexPositionsArray.length; i<count;i++){
		
		var theObject = this.rigidBodiesMasterArray[IndexPositionsArray[i]];
		
		var ID = theObject.physics.id.toString();
		if(typeof ID !== 'string'){ID = ID.toString()};
		delete this.rigidBodiesMasterObject[ID];
		
		this.world.removeRigidBody( theObject.physics);
			
		this.rigidBodiesMasterArray.splice(IndexPositionsArray[i],1);
	}

	//THIRD:
	//get lowest index value that was removed with .pop() (remember we sorted so value lowest is at end)
	//then update ALL the index locations for elements AFTER this lowest index removed
	this.reassignIndexLocationsAfterIndex(IndexPositionsArray.pop());
};


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

IMPORTANT Note on collision objects:------->
this.dispatcher.getManifoldByIndexInternal(i).getBody0().getUserPointer() returns an object: VoidPtr{ptr:number}
or
this.dispatcher.getManifoldByIndexInternal(i).getBody0().getUserIndex() returns the ptr value of the
VoidPtr object

This can be used as a flag.  to indicate specific actions.  The ptr can be accessed by the physics property
of the rigid body.  Its one of the few if only direct links between a collision object and it's coresponding rigid body when using Ammo (obv in bullet you get actual pointers because it's c++)
there are coresponding set methods setUserPointer(number) setUserIndex(number).  they do what you'd expect.
--------/>
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
				//also objects that are Kinematic (aka static) like the GROUND will return false on .isActive()
				if(Obj2_collisionObject.isActive() && Obj1_collisionObject.isActive()){
					
					console.log("pwm1",Obj1_collisionObject.getUserIndex())
					console.log("pwm2",Obj2_collisionObject.getUserIndex())
					
					console.log(Obj1_collisionObject.ptr)
					
					collisionPairsArray.push(impactImpulse,Obj1_collisionObject.getUserIndex(),Obj2_collisionObject.getUserIndex())
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

physicsWorldManager.prototype.getServerBinaryDataStructure_physics = function () {
	
	return {
						id:0,
						x:1,
						y:2,
						z:3,
						Rx:4,
						Ry:5,
						Rz:6,
						Rw:7,
						LVx:8,
						LVy:9,
						LVz:10,
						AVx:11,
						AVy:12,
						AVz:13
			}
}

physicsWorldManager.prototype.unpackServerBinaryData = function(binaryData){
	
	
	// binaryData is mixed structure binary data for all objects
	//first 8 bytes are int16 headers
	   var headerCount = 4;
		var header = new Uint16Array(binaryData,0,headerCount);
		
			var totalObjs = header[0];
			var leadingF32data = header[1];
			var header3 = header[2];
			var header4 = header[3];
					
			//What makes it complicated is it's not uniform.  Cubes for example have more data than sphere
			//as data is unpacked we will be able to determine what shape is next to be unpacked
			//the data will ALWAYS have 14 float32 and 1 int8 before the non-uniform shape specific data
			
			
			
			var initF32Data = (leadingF32data * 4);// f32 are always leading
			var physicsDataStructure = this.getServerBinaryDataStructure_physics();
			
			//skip first 8 because they are headers
			var headerOffset = headerCount * 2;//want bytes not number of int16 headers
			
			
			//recycle object blueprint
			var newObjBlueprint = Object();
			
			var BytesOfPreviousObj = 0;//this will change EVERY pass of the for loop below
			var offset = headerOffset;
			for(var i = headerOffset,fullBuffer=binaryData.byteLength; i<fullBuffer;i+=BytesOfPreviousObj){
				
				//Reset
				newObjBlueprint = {};
				
				/*https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/slice
				need to slice the buffer before converting into typedArray.
				this is because new typedArray() expects start to be an increment
				of the base.  ie floats start on multipue of 4. because the total buffer is a mix we cant just
				iterate through
				*/
				BytesOfPreviousObj = 0;//reset
				offset = i;//buffer shift
			
				var bufferF32 = binaryData.slice(offset,offset+initF32Data)
				var firstF32 = new Float32Array(bufferF32);
				
				//Assign unpacked physics properties to blueprint
				newObjBlueprint.id = firstF32[physicsDataStructure.id]
				newObjBlueprint.x =firstF32[physicsDataStructure.x]
			   newObjBlueprint.y =firstF32[physicsDataStructure.y]
				newObjBlueprint.z =firstF32[physicsDataStructure.z] 
				newObjBlueprint.Rx =firstF32[physicsDataStructure.Rx] 
				newObjBlueprint.Ry =firstF32[physicsDataStructure.Ry] 
				newObjBlueprint.Rz =firstF32[physicsDataStructure.Rz] 
				newObjBlueprint.Rw =firstF32[physicsDataStructure.Rw] 
		      newObjBlueprint.LVx =firstF32[physicsDataStructure.LVx] 
				newObjBlueprint.LVy =firstF32[physicsDataStructure.LVy] 
				newObjBlueprint.LVz =firstF32[physicsDataStructure.LVz] 
				newObjBlueprint.AVx =firstF32[physicsDataStructure.AVx] 
				newObjBlueprint.AVy =firstF32[physicsDataStructure.AVy] 
				newObjBlueprint.AVz =firstF32[physicsDataStructure.AVz] 
				
				
				BytesOfPreviousObj += bufferF32.byteLength;
				
				//slide buffer
				offset += initF32Data
				
				var shapeBuffer = binaryData.slice(offset,offset+1)
				var shape = new Int8Array(shapeBuffer);
				
				newObjBlueprint.shape[0] 
				
				
				BytesOfPreviousObj += shapeBuffer.byteLength;
				
				//slide buffer
				offset += 1;
				
				//Unpack geometry
				var geometryF32props;
				var geoProps;
				switch(shape[0]){
					
					case ServerShapeIDCodes().cube: geometryF32props = ServerShapePropCount().cube;//width,height,depth
																geoProps = ['width','height','depth'];
					break;
					case ServerShapeIDCodes().sphere: geometryF32props = ServerShapePropCount().sphere;//radius
																geoProps = ['radius'];
					break;
					default: console.log('todo');
				}
				//multiply by 4 to get bytes
				geometryF32props *= 4
				
				var geometryBuffer = binaryData.slice(offset,offset+geometryF32props)
				var geof32 = new Float32Array(geometryBuffer);
				
				for (var p=0,geoProps.length;p<geoProps;p++) {
						newObjBlueprint[geoProps[p]] = geof32[p]	
				};
				
				BytesOfPreviousObj += geometryF32props;
				
				switch(newObjBlueprint.shape) {
					case ServerShapeIDCodes().cube: this.rigidBodiesMasterObject[newObjBlueprint.id] = new CubeObject(newObjBlueprint);		
				}
				
			}
			
}

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