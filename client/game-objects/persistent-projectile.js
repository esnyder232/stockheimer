import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"
import ServerEventQueue from "../classes/server-event-queue.js"

export default class PersistentProjectile {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.serverOwnerId = null;
		this.type = "persistent-projectile";
		this.ownerId = null;
		this.ownerType = "";
		this.serverCharacterId = null;	//characterId of the server
		this.characterId = null;		//characterId of the client
		this.character = null;			//client character game object reference
		this.teamId = 0;
		this.x = 0;
		this.y = 0;
		this.size = 1;
		this.sizeScaleFactor = 0.05/0.1; //scales the image based on the size given from the server
		this.offsetFactor = -50; //offsets the image based on the velocity trajectory. Units are: pixels/velocity
		this.pngUnitsToPlanckUnitsRatio = 1/75;
		this.offsetX = 0;
		this.offsetY = 0;
		this.angle = 0;
		this.serverAngle = 0;
		this.teamShaderKey = "";

		this.timeLength = 0.0;
		this.timeLengthAcc = 0.0;
		this.clientSideDraw = true;
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.isDirty = false;

		this.persistentProjectileResourceId = null;
		this.persistentProjectileResource = null;
		this.spawnOffsetLength = 1;
		this.hpStatResourceKey = "";

		this.spriteGraphics = null;

		this.serverEventMapping = {
			"updatePersistentProjectile": this.updatePersistentProjectile.bind(this)
		}

		this.enemyDamageTintColor = 0xffffff;
		this.enemyDamageTimerLength = 100;
		this.enemyDamageTimer = 0;

		this.selfDamageTintColor = 0xffffff;
		this.selfDamageTimerLength = 100;
		this.selfDamageTimer = 0;

		//resource variables
		this.plShape = "circle";
		this.plRadius = 1;
		this.originX = 0.5;
		this.originY = 0.5;
		this.scaleX = 1;
		this.scaleY = 1;
		this.size = 1;
		this.spriteKey = "";
		this.frameTag = "";
		this.hideSprite = false;
		this.animationTimeLength = 1000;
		this.repeatNum = -1;
	}

	persistentProjectileInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);
	}

	activated() {
		//get resource data
		this.persistentProjectileResource = this.gc.rm.getResourceByServerId(this.persistentProjectileResourceId);

		this.plShape = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.planckData?.plShape, this.plShape);
		this.plRadius = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.planckData?.plRadius, this.plRadius);
		this.originX = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.phaserData?.originX, this.originX);
		this.originY = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.phaserData?.originY, this.originY);
		this.scaleX = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.phaserData?.scaleX, this.scaleX);
		this.scaleY = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.phaserData?.scaleY, this.scaleY);
		this.size = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.size, this.size);
		this.spriteKey = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.renderData?.spriteKey, this.spriteKey);
		this.frameTag = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.renderData?.frameTag, this.frameTag);
		this.hideSprite = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.renderData?.hideSprite, this.hideSprite);
		this.animationTimeLength = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.renderData?.animationTimeLength, this.animationTimeLength);
		this.repeatNum = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.renderData?.repeatNum, this.repeatNum);
		this.timeLength = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.projectileData?.timeLength, this.timeLength);
		this.spawnOffsetLength = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.persistentProjectileData?.spawnOffsetLength);
		this.hpStatResourceKey = this.globalfuncs.getValueDefault(this?.persistentProjectileResource?.data?.persistentProjectileData?.hpStatResourceKey);

		//calculate stuff
		this.x = this.x * this.ms.planckUnitsToPhaserUnitsRatio;
		this.y = this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1

		//get colors sorted out
		this.calculateColors();

		//create the graphics objects
		this.createSpriteGraphics();

		//draw the graphics objects on activation
		this.drawSpriteGraphics();
		this.spriteGraphics.setPostPipeline(this.teamShaderKey);

		//destruction compensation for fast moving projectiles. This is to help time the destruction of fast moving projectiles with the sprite drawn on the screen (cheap client side destruction prediction)
		//Also only do this for projectiles that have a longer time length than 100 ms (ie, not melee or flash heal projectiles)
		if(this.timeLength > 100) {
			var u = this.gc.um.getUserByServerID(this.gc.myUserServerId);
			if(u !== null) {
				this.timeLengthAcc = u.userRtt*2;
			}
		} else {
			this.timeLengthAcc = 0;
		}

		this.character = this.gc.gom.getGameObjectByServerID(this.serverCharacterId);
	}


	calculateColors() {
		var team = this.gc.tm.getTeamByServerID(this.teamId);
	
		if(team !== null) {
			// this.projectileShaderKey = team.projectileShaderKey;
			this.teamShaderKey = team.teamShaderKey;
		}
	}

	createSpriteGraphics() {
		if(!this.hideSprite) {
			
			this.spriteGraphics = this.ms.add.sprite((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), this.spriteKey);
			this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
			this.spriteGraphics.setOrigin(this.originX, this.originY);
			this.spriteGraphics.setScale(this.size * this.scaleX, this.size * this.scaleY);
			this.spriteGraphics.setAngle(this.angle * (180/Math.PI));

			if(this.frameTag) {
				this.spriteGraphics.anims.play(this.spriteKey + "-" + this.frameTag);

				//calculate msPerFrame by the new animation playing and timeLength
				var totalFrames = this.spriteGraphics.anims.getTotalFrames();
				if(totalFrames > 0) {
					var msPerFrame = this.animationTimeLength/totalFrames;
					
					this.spriteGraphics.anims.msPerFrame = msPerFrame;
					this.spriteGraphics.anims.setRepeat(this.repeatNum);
				}
			}
		}
	}

	drawSpriteGraphics() {
		
	}


	deactivated() {
		if(this.spriteGraphics !== null) {
			this.spriteGraphics.destroy();
			this.spriteGraphics = null;
		}

		////////////////////////////////////////
		//temp for debugging hitbox
		// var debugCircle = this.ms.debugServerCircles.find((x) => {return x.gameObjectId === this.serverId;});
		// if(debugCircle !== undefined) {
		// 	// console.log("===FOUND DEBUG CIRCLE===");
		// 	// console.log("serverId: " + this.serverId + ", x: " + this.x + ", serverX: " + debugCircle.x + ", diff: " + this.x - debugCircle.x);
		// 	// var diff = this.x - debugCircle.x;
		// 	// console.log("serverId: " + this.serverId);
		// 	// console.log("x: " + this.x);
		// 	// console.log("serverX: " + debugCircle.x);
		// 	// console.log("diff: " + diff);
		// }
		
		////////////////////////////////////////

		this.character = null;
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
		this.projectileResource = null;
	}

	updatePersistentProjectile(e) {
		this.serverAngle = e.angle;
	}

	showEnemyDamageTint() {
		this.spriteGraphics.setTintFill(this.enemyDamageTintColor);
		this.enemyDamageTimer = this.enemyDamageTimerLength;
	}

	showSelfDamageTint() {
		this.spriteGraphics.setTintFill(this.selfDamageTintColor);
		this.selfDamageTimer = this.selfDamageTimerLength;
	}

	hideDamageTint() {
		this.spriteGraphics.clearTint();
	}

	//this follows the character, and lerps between the angle changes
	updateRenderTarget(dt) {
		if(this.character !== null) {
			//lerp between current angle and server angle
			var lerpSpeed = 0.75;
			var deltaAngle = this.serverAngle - this.angle;

			//if its more than a pi, then add/subtract 2pi to deal with wrap around the unit circle
			if(Math.abs(deltaAngle) > Math.PI) {
				if(deltaAngle > Math.PI) {
					this.angle += 2*Math.PI;
				} else {
					this.angle -= 2*Math.PI;
				}
			}
			
			this.angle = ((this.serverAngle - this.angle) * lerpSpeed) + this.angle;

			//follow the character's x,y
			this.x = this.character.x + (this.spawnOffsetLength * Math.cos(this.angle));
			this.y = this.character.y + (this.spawnOffsetLength * Math.sin(-this.angle));
		}
	}

	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		this.updateRenderTarget();


		if(this.enemyDamageTimer > 0) {
			this.enemyDamageTimer -= dt;
			if(this.enemyDamageTimer <= 0) {
				this.hideDamageTint();
			}
		}

		if(this.selfDamageTimer > 0) {
			this.selfDamageTimer -= dt;
			if(this.selfDamageTimer <= 0) {
				this.hideDamageTint();
			}
		}

		if(this.character !== null) {
			this.spriteGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
			this.spriteGraphics.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);
			this.spriteGraphics.setAngle(this.angle * (180/Math.PI));

			if(this.character[this.hpStatResourceKey] <= 0) {
				this.spriteGraphics.visible = false;
			} else {
				this.spriteGraphics.visible = true;
			}
		}
	}
}
