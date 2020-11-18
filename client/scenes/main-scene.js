import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import PlayerController from "../classes/player-controller.js"

export default class MainScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
		this.planckUnitsToPhaserUnitsRatio = 32;
		this.radiansToDegreesRatio = 180/3.14
		
		this.playerInputKeyboardMap = {};
		this.playerController = {};
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');
		
		this.gc = data.gc;
		
		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events}
		];
		this.windowsEventMapping = [
			{event: 'exit-game-click', func: this.exitGameClick.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);
		
		//mapping of actions to keyboard key codes. Export this to external file and load in on game startup.
		this.playerInputKeyboardMap = {
			left: 37,
			right: 39,
			up: 38,
			down: 40,
			jump: 90,
			attackWeak: 88,
			attackStrong: 67,
			start: 13,
			select: 32
		};
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#main-scene-root").removeClass("hide");

		this.cameras.main.setZoom(0.5);
		this.cameras.main.scrollX = -400;
		this.cameras.main.scrollY = -320;

		this.xAxisGraphic = this.add.graphics();
		this.xAxisGraphic.lineStyle(1, 0xff0000, 1.0);
		this.xAxisGraphic.moveTo(0, 0);
		this.xAxisGraphic.lineTo(10, 0);
		this.xAxisGraphic.strokePath();

		this.yAxisGraphic = this.add.graphics();
		this.yAxisGraphic.lineStyle(1, 0xff0000, 1.0);
		this.yAxisGraphic.moveTo(0, 0);
		this.yAxisGraphic.lineTo(0, 10);
		this.yAxisGraphic.strokePath();

		
		this.playerController = new PlayerController(this);
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		$("#main-scene-root").addClass("hide");
	}

	exitGameClick() {
		this.gc.gameState.exitGameClick();
	}

	userConnected(e) {
		console.log('user connected in main scene');
		console.log(e);

		var userList = $("#user-list");
		var userListItemTemplate = $("#user-list-item-template");
		
		var newUser = userListItemTemplate.clone();
		newUser.removeClass("hide");
		newUser.text(e.username);

		userList.append(newUser);
	}

	  
	update(timeElapsed, dt) {
		this.playerController.update();
	}

	// createWorld() {
	// 	console.log('creating world now');
		
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var o = this.world[i];
	// 		o.planckGraphics = [];

	// 		for(var j = 0; j < o.fixtures.length; j++)
	// 		{
	// 			var f = o.fixtures[j];
	// 			switch(f.shapeType.toLowerCase())
	// 			{
	// 				case "polygon":
	// 				case "edge":
	// 					var tempLineGraphics = this.add.graphics();

	// 					tempLineGraphics.lineStyle(1, 0x00ff00, 1);
	// 					tempLineGraphics.moveTo(f.vertices[0].x, f.vertices[0].y);

	// 					for(var v = 1; v < f.vertices.length; v++)
	// 					{
	// 						tempLineGraphics.lineTo(f.vertices[v].x, f.vertices[v].y);
	// 					}

	// 					tempLineGraphics.closePath();
	// 					tempLineGraphics.strokePath();

	// 					tempLineGraphics.setX(o.x);
	// 					tempLineGraphics.setY(o.y);

	// 					o.planckGraphics.push(tempLineGraphics);

	// 					break;
	// 			}
	// 		}
	// 	}

	// 	console.log('creating world done');
	// }

	// processDeltas(deltas) {
	// 	//update x, y of all bodies in the world
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var obj = this.world[i];
	// 		var myDelta = deltas.find((x) => {return x.id == obj.id});
	// 		if(myDelta)
	// 		{
	// 			//console.log('myDelta x, y: %s, %s', myDelta.x, myDelta.y);
	// 			var newx = myDelta.x * this.planckUnitsToPhaserUnitsRatio;
	// 			var newy = myDelta.y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 			var newa = myDelta.a * -this.radiansToDegreesRatio;

	// 			for(var j = 0; j < obj.planckGraphics.length; j++)
	// 			{
	// 				obj.planckGraphics[j].setX(newx);
	// 				obj.planckGraphics[j].setY(newy);
	// 				obj.planckGraphics[j].setAngle(newa);
	// 			}
	// 		}
	// 	}
	// }

	// convertPlankToPhaserUnits() {
	// 	console.log('converting units now');
		
	// 	for(var i = 0; i < this.world.length; i++)
	// 	{
	// 		var o = this.world[i];
	// 		for(var j = 0; j < o.fixtures.length; j++)
	// 		{
	// 			var f = o.fixtures[j];
	// 			switch(f.shapeType.toLowerCase())
	// 			{
	// 				case "polygon":
	// 				case "edge":
	// 					for(var v = 0; v < f.vertices.length; v++)
	// 					{
	// 						f.vertices[v].x = f.vertices[v].x * this.planckUnitsToPhaserUnitsRatio;
	// 						f.vertices[v].y = f.vertices[v].y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 					}						
	// 					break;
	// 			}
	// 		}

	// 		o.x = o.x * this.planckUnitsToPhaserUnitsRatio;
	// 		o.y = o.y * this.planckUnitsToPhaserUnitsRatio * -1;
	// 	}

	// 	console.log('converting units done');
	// }
}

