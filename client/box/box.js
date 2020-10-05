import GlobalFuncs from "../global-funcs.js"

export default class Box {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new GlobalFuncs();
		this.group = null;
	}

	create()
	{
		//create animations
		this.globalfuncs.createSceneAnimsFromAseprite(this.scene, "box", "box-json");
		this.group = this.scene.physics.add.staticGroup();
		this.scene.physics.add.collider(this.group, this.scene.layer1);
	}

	spawn(x, y)
	{		
		var a = this.group.create(x, y, "box");
		a.setScale(0.5, 0.5);
		console.log(a);

	}

}