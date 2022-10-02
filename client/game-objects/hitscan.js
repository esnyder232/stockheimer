import ClientConstants from "../client-constants.js"

//A class just used to draw hitscan bullets.
export default class Hitscan {
	constructor() {
		this.gc = null;
		this.teamId = 0;
		this.x1 = 0;
		this.y1 = 0;
		this.x2 = 0;
		this.y2 = 0;
		this.gameObjectIdHit = null;
		this.hitscanResourceId = null;
		
		this.timeLength = 100.0;
		this.timeLengthAcc = 0.0;
		
		this.lineGraphics = null;
		this.line = null;
	}

	hitscanInit(gameClient) {
		this.gc = gameClient;

		this.x1 = this.x1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio;
		this.y1 = this.y1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1;
		this.x2 = this.x2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio;
		this.y2 = this.y2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1;

		//create a line
		this.lineGraphics = this.gc.mainScene.add.graphics();
		this.line = new Phaser.Geom.Line(this.x1, this.y1, this.x2, this.y2);
		this.lineGraphics.strokeLineShape(this.line);
		this.lineGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
	}


	deinit() {
		this.line = null;
		if(this.lineGraphics !== null) {
			this.lineGraphics.clear();
			this.lineGraphics.destroy();
			this.lineGraphics = null;
		}
		this.gc = null;
	}


	// activated(dt) {
	// 	//get resource data
		
		
	// 	//calculate stuff
	// 	this.x = this.x * this.ms.planckUnitsToPhaserUnitsRatio;
	// 	this.y = this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1

	// 	//calculate the xSpeed and ySpeed components for phaser units
	// 	this.xSpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.cos(this.angle);
	// 	this.ySpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.sin(this.angle);

	// 	//get colors sorted out
	// 	this.calculateColors();

	// 	//create the graphics objects
	// 	this.createBoxGraphics();
	// 	this.createSpriteGraphics(dt);
		
	// 	//backout 1 frame worth of velocity (a little quirk I have to deal with to interpolate projectiles correctly)
	// 	this.x -= this.xSpeedPhaser * (dt/1000);
	// 	this.y -= this.ySpeedPhaser * (dt/1000);

	// 	this.spriteGraphics.setX(this.x);
	// 	this.spriteGraphics.setY(this.y);

	// 	//draw the graphics objects on activation
	// 	this.drawBoxGraphics();
	// 	this.drawSpriteGraphics();

	// 	this.spriteGraphics.setPipeline(this.projectileShaderKey);

	// 	// //another cheap attempt for client side projectiles. only do this for the user's projectiles
	// 	// if(this.gc.myCharacter !== null && this.characterId === this.gc.myCharacter.serverId) {
	// 	// 	this.tempLagMs = 100;
	// 	// }
		
	// }


	// calculateColors() {
	// 	var team = this.gc.tm.getTeamByServerID(this.teamId);
	
	// 	if(team !== null) {
	// 		this.boxGraphicsStrokeColor = team.phaserCharacterStrokeColor;
	// 		this.projectileShaderKey = team.projectileShaderKey;
	// 	}
	// }

	
	//update called by mainScene
	sceneUpdate(dt) {
		this.timeLengthAcc += dt;

		
		// this.x += this.xSpeedPhaser * (dt/1000);
		// this.y += this.ySpeedPhaser * (dt/1000);

		// this.spriteGraphics.setX(this.x);
		// this.spriteGraphics.setY(this.y);
	}
}
