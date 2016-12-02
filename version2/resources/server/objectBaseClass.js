
//http://www.htmlgoodies.com/html5/javascript/javascript-object-chaining-using-prototypal-inheritance.html#fbid=1W1osQ4qGFs

var RigidBodyBaseConstructor = function(obj,transform, vector3){
		
		this.physics = obj.physics;//our AMMO portion of this object
	
		var ID;
		if(typeof obj.id !== 'number'){ID = parseInt(ID,10)}
		else {ID = this.id};
		this.id = ID;
	
		this.x = obj.x;
		this.y = obj.y; 
		this.z = obj.z; 
		this.mass = obj.mass; 
		this.shape = obj.shape;
		this.Rx = obj.Rx,
		this.Ry = obj.Ry, 
		this.Rz = obj.Rz, 
		this.Rw = obj.Rw,
		this.transformAux1 = transform;//reusable AMMO transform object
		this.vector3Aux1 = vector3;//reusable AMMO transform object

};