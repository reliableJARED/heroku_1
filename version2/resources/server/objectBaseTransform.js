
//http://www.htmlgoodies.com/html5/javascript/javascript-object-chaining-using-prototypal-inheritance.html#fbid=1W1osQ4qGFs
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Prototype-based_programming

var RigidBodyBase = function(org){

		this.x = 1;
		this.y = 1;
		this.z = 1;
		this.Rx = 1;
		this.Ry = 1;
		this.Rz = 1;
		this.Rw = 1;
		this.mass;
		this.shape;
		this.physics;
};
RigidBodyBase.prototype ={
		//note: these are on prototype to reduce memory, they are used as a sort
		// of 'helper' in executing different function which is why their
		//absolute values don't matter to an individual object
		//THESE EXACT INSTANCES ARE USED BY ALL INSTANCES OF RigidBodyBase!
		transform:new Ammo.btTransform(),
		vector3:new Ammo.btVector3(),
		quaternion:new Ammo.btQuaternion(),
		ShapeIDCodes:function(){
			var codes ={
					cube:0,
					sphere:1
				}
			return codes;
		}
}
		//manipulation functions:
		getOrigin:function(){
			this.physics.getMotionState().getWorldTransform(this.transform);
			var pos = this.transform.getOrigin();
			return {x:pos.x(),y:pos.y(),z:pos.z()};
			},
}

var CubeConstructorBase = function(obj){
		RigidBodyBase.call(this);
		this.w = obj.w || 1;
		this.h = obj.h || 1;
		this.d = obj.d || 1;
		this.shape = ShapeIDCodes().cube;
}
CubeConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
CubeConstructorBase.prototype.constructor = CubeConstructorBase;

var SphereConstructorBase = function(obj){
		RigidBodyBase.call(this);
		this.radius = obj.radius;
		this.shape = ShapeIDCodes.sphere;
}
SphereConstructorBase.prototype =  Object.create(RigidBodyBase.prototype); 
SphereConstructorBase.prototype.constructor = SphereConstructorBase;



