import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"
import ServerEventQueue from "../classes/server-event-queue.js"
import CharacterClassState from "../classes/character-class-state.js"

export default class Character {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.serverOwnerId = null;
		this.seq = null;

		this.type = "character";
		this.ownerId = null;
		this.ownerType = "";
		this.serverX = 0;
		this.serverY = 0;
		this.x = 0;
		this.y = 0;
		this.serverCharacterDirection = 0.0;
		this.clientInputs = {};
		
		this.globalfuncs = null;
		this.state = null;
		this.nextState = null;

		this.hpMax = 100;
		this.hpCur = 100;
		this.shieldCur = 0;
		this.shieldMax = 0;

		this.isDirty = false;

		this.boxGraphics = null;
		this.hpBarGraphics = null;
		this.shieldBarGraphics = null;
		this.textGraphics = null;
		this.spriteGraphics = null;
		this.glowGraphics = null;
		this.mouseOverHitbox = null;
		this.directionGraphics = null;
		this.cooldownGraphics = null;

		this.serverEventMapping = {
			"activeCharacterUpdate": this.activeCharacterUpdateEvent.bind(this),
			"activeCharacterShieldUpdate": this.activeCharacterShieldUpdateEvent.bind(this),
			"updateCharacterState": this.updateCharacterStateEvent.bind(this)
		}

		this.boxGraphicsStrokeColor = 0;
		this.characterBorderThickness = 1;
		this.characterTextStrokeColor = 0;
		this.characterTextFillColor = 0;
		this.characterTextStrokeThickness = 1;
		this.characterFillColor = 0x000000;
		this.characterShieldFillColor = 0x888888;
		this.usernameText = "???";
		this.teamShaderKey = "";
		this.circleShape = null;

		this.characterClassResourceId = null;
		this.characterClassResource = null;

		//HP Bar variables
		this.hpBarStrokeThickness = 2;
		this.hpBarOffsetX = -50;
		this.hpBarOffsetY = -45;
		this.hpBarHeight = 10;
		this.hpBarWidthMax = 50;

		this.hpBarHeightMin = 5;
		this.hpBarHeightMax = 10;
		this.hpBarHeightSizeRatio = 3;
		this.hpBarStrokeMin = 1;
		this.hpBarStrokeMax = 2;
		this.hpBarStrokeSizeRatio = 1;
		this.hpBarOffsetYMin = -35;
		this.hpBarOffsetYMax = -999;
		this.hpBarOffsetYSizeRatio = -20;


		this.shieldBarStrokeThickness = 2;
		this.shieldBarOffsetX = -50;
		this.shieldBarOffsetY = -45;
		this.shieldBarHeight = 4;
		this.shieldBarWidthMax = 50;

		this.shieldBarHeightMin = 4;
		this.shieldBarHeightMax = 8;
		this.shieldBarHeightSizeRatio = 3;
		this.shieldBarStrokeMin = 1;
		this.shieldBarStrokeMax = 2;
		this.shieldBarStrokeSizeRatio = 1;
		this.shieldBarOffsetYMin = -30;
		this.shieldBarOffsetYMax = -999;
		this.shieldBarOffsetYSizeRatio = -20;





		//Name text variables
		this.textHeight = 10;
		this.textOffsetY = 18;

		this.textHeightMin = 18;
		this.textHeightMax = 32;
		this.textHeightSizeRatio = 10;

		this.textOffsetYMin = 18;
		this.textOffsetYMax = 999;
		this.textOffsetYSizeRatio = 15;

		this.updateHealthBar = true;
		this.updateShieldBar = true;

		//glow vatiables
		this.glowRadius = 8;
		this.glowCenterColor = "#ffffff";
		this.glowOffsetY = 10;

		//cooldown variables
		this.cooldownHeight = 10;
		this.cooldownOffsetY = -18;
		this.cooldownOffsetX = 36;

		this.cooldownHeightMin = 18;
		this.cooldownHeightMax = 32;
		this.cooldownHeightSizeRatio = 10;

		this.cooldownOffsetYMin = -30;
		this.cooldownOffsetYMax = -999;
		this.cooldownOffsetYSizeRatio = -20;

		this.cooldownOffsetXMin = 32;
		this.cooldownOffsetXMax = 128;
		this.cooldownOffsetXSizeRatio = 0;
		
		this.bShowCooldownGraphics = false;
		this.cooldownTimeLength = 0;
		this.cooldownUpdateInterval = 200;
		this.cooldownUpdateAcc = 0;
		this.cooldownTimeAcc = 0;

		//phaser data from resource (default values)
		this.originX = 0.5;
		this.originY = 0.5;
		this.scaleX = 1;
		this.scaleY = 1;
		this.size = 1;
		this.planckRadius = 1;
		this.idleMsPerFrame = 100;
		this.moveMsPerFrame = 100;

		this.enemyDamageTintColor = 0xffffff;
		this.enemyDamageTimerLength = 100;
		this.enemyDamageTimer = 0;

		this.selfDamageTintColor = 0xdd0000;
		this.selfDamageTimerLength = 100;
		this.selfDamageTimer = 0;

		this.healTintColor = 0xADD8E6;
		this.healTimerLength = 100;
		this.healTimer = 0;

		this.characterTintColor = 0xffffff;
	}

	characterInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);


		this.clientInputs.up = {state: false, prevState: false};
		this.clientInputs.down = {state: false, prevState: false};
		this.clientInputs.left = {state: false, prevState: false};
		this.clientInputs.right = {state: false, prevState: false};
	}

	activated() {
		//get resource data
		this.characterClassResource = this.gc.rm.getResourceByServerId(this.characterClassResourceId);
		// console.log(this.characterClassResource);
		this.planckRadius = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.planckData?.plRadius, this.planckRadius);
		this.originX = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.phaserData?.originX, this.originX);
		this.originY = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.phaserData?.originY, this.originY);
		this.size = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.size, this.size);
		this.scaleX = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.phaserData?.scaleX, this.scaleX);
		this.scaleY = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.phaserData?.scaleY, this.scaleY);
		this.idleMsPerFrame = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.idleMsPerFrame, this.idleMsPerFrame);
		this.moveMsPerFrame = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.moveMsPerFrame, this.moveMsPerFrame);
		this.shieldMax = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.shield, this.shieldMax);

		//get colors sorted out
		this.calculateColors();

		//create the graphics objects
		this.createHpBarGraphics();
		this.createShieldBarGraphics();
		this.createTextGraphics();
		this.createBoxGraphics();
		this.createSpriteGraphics();
		this.createGlowGraphics();
		this.createMouseoverHitbox();
		this.createDirectionGraphics();
		this.createCooldownGraphics();

		//draw the graphics objects on activation
		this.drawHpBarGraphics();
		this.drawShieldBarGraphics();
		this.drawTextGraphics();
		this.drawBoxGraphics();
		this.drawGlowGraphics();
		this.drawDirectionGraphics();
		this.drawCooldownGraphics();

		this.hideCooldownGraphics();

		this.state = new CharacterClassState(this.gc, this, null, 0);
		this.state.enter(0);

		
		this.spriteGraphics.setPostPipeline(this.teamShaderKey);


		//check if this is your character your controlling. If it is, then switch camera modes
		if(this.gc.myCharacter !== null && this.id === this.gc.myCharacter.id)
		{
			this.ms.switchCameraMode(1);
		}
	}

	increaseAnimation(sprite, dir) {
		window.setTimeout(() => {
			var current = sprite.anims.msPerFrame;
			var future = current;

			if(current <= 16) {
				dir = "increase";
			}
			else if (current >= 200) {
				dir = "decrease";
			}

			if(dir === "increase") {
				future = current + 10;
			} else if (dir === "decrease") {
				future = current - 10;
			}

			// console.log("changing msPerFrame from " + current + " to " + future);
			sprite.anims.msPerFrame = future;
			
			this.increaseAnimation(this.spriteGraphics, dir)
		}, 100)
	}

	calculateColors() {
		this.characterTextStrokeThickness = 5;

		var user = this.gc.um.getUserByServerID(this.ownerId);

		if(user !== null) {
			var team = this.gc.tm.getTeamByServerID(user.teamId);
		
			if(team !== null) {
				this.boxGraphicsStrokeColor = team.phaserCharacterStrokeColor;
				this.characterTextFillColor = team.characterTextFillColor;
				this.characterTextStrokeColor = team.characterTextStrokeColor;
				this.characterFillColor = team.phaserCharacterFillColor;
				// this.characterShieldFillColor = team.phaserCharacterShieldFillColor;
				this.characterTintColor = team.phaserCharacterTintColor;
				this.teamShaderKey = team.teamShaderKey;
			}
		}
	}

	createHpBarGraphics() {
		//calculate hpbar stuff
		this.hpBarHeight = this.hpBarHeightMin + ((this.size - 1) * this.hpBarHeightSizeRatio);
		this.hpBarStrokeThickness = this.hpBarStrokeMin + ((this.size - 1) * this.hpBarStrokeSizeRatio)
		this.hpBarOffsetY= this.hpBarOffsetYMin + ((this.size - 1) * this.hpBarOffsetYSizeRatio)

		this.hpBarHeight = this.globalfuncs.clamp(this.hpBarHeight, this.hpBarHeightMin, this.hpBarHeightMax);
		this.hpBarStrokeThickness = this.globalfuncs.clamp(this.hpBarStrokeThickness, this.hpBarStrokeMin, this.hpBarStrokeMax);
		this.hpBarOffsetY = this.globalfuncs.clamp(this.hpBarOffsetY, this.hpBarOffsetYMax, this.hpBarOffsetYMin);

		this.hpBarOffsetX = -this.hpBarWidthMax/2;

		this.hpBarBorderAlpha = 1.0;

		if(this.ownerId !== this.gc.myUserServerId) {
			this.hpBarBorderAlpha = 0;
		}
		
		this.hpBarGraphics = this.ms.add.graphics();
		this.hpBarGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.hpBarGraphics.setY((this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + this.hpBarOffsetY);

		//if its your own character, put it on a special layer that is always on top
		if(this.ownerId === this.gc.myUserServerId) {
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
		}
		else {
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.hpBarLayer);
		}
	}

	createShieldBarGraphics() {
		this.shieldBarHeight = this.shieldBarHeightMin + ((this.size - 1) * this.shieldBarHeightSizeRatio);
		this.shieldBarStrokeThickness = this.shieldBarStrokeMin + ((this.size - 1) * this.shieldBarStrokeSizeRatio)
		this.shieldBarOffsetY= this.shieldBarOffsetYMin + ((this.size - 1) * this.shieldBarOffsetYSizeRatio)

		this.shieldBarHeight = this.globalfuncs.clamp(this.shieldBarHeight, this.shieldBarHeightMin, this.shieldBarHeightMax);
		this.shieldBarStrokeThickness = this.globalfuncs.clamp(this.shieldBarStrokeThickness, this.shieldBarStrokeMin, this.shieldBarStrokeMax);
		this.shieldBarOffsetY = this.globalfuncs.clamp(this.shieldBarOffsetY, this.shieldBarOffsetYMax, this.shieldBarOffsetYMin);

		this.shieldBarOffsetX = -this.shieldBarWidthMax/2;

		this.shieldBarBorderAlpha = 1.0;

		if(this.ownerId !== this.gc.myUserServerId) {
			this.shieldBarBorderAlpha = 0;
		}

		this.shieldBarGraphics = this.ms.add.graphics();
		this.shieldBarGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.shieldBarGraphics.setY((this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + this.shieldBarOffsetY);

		//if its your own character, put it on a special layer that is always on top
		if(this.ownerId === this.gc.myUserServerId) {
			this.shieldBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
		}
		else {
			this.shieldBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.hpBarLayer);
		}
	}



	drawHpBarGraphics() {
        this.hpBarGraphics.clear();

        //Background + border
        this.hpBarGraphics.fillStyle(0xffffff, this.hpBarBorderAlpha);
        this.hpBarGraphics.fillRect(this.hpBarOffsetX - this.hpBarStrokeThickness, this.hpBarOffsetY - this.hpBarStrokeThickness, this.hpBarWidthMax + (this.hpBarStrokeThickness*2), this.hpBarHeight + (this.hpBarStrokeThickness*2));


        this.hpBarGraphics.fillStyle(0x000000);
        this.hpBarGraphics.fillRect(this.hpBarOffsetX, this.hpBarOffsetY, this.hpBarWidthMax, this.hpBarHeight);

        //Health
		this.hpBarGraphics.fillStyle(this.characterFillColor);
		var hpCurrentWidth = (this.hpCur/this.hpMax) * this.hpBarWidthMax;
		this.hpBarGraphics.fillRect(this.hpBarOffsetX, this.hpBarOffsetY, hpCurrentWidth, this.hpBarHeight);
	}

	drawShieldBarGraphics() {
        this.shieldBarGraphics.clear();

        //Background + border
		if(this.shieldMax !== 0) {
			this.shieldBarGraphics.fillStyle(0xffffff, this.shieldBarBorderAlpha);
			this.shieldBarGraphics.fillRect(this.shieldBarOffsetX - this.shieldBarStrokeThickness, this.shieldBarOffsetY - this.shieldBarStrokeThickness, this.shieldBarWidthMax + (this.shieldBarStrokeThickness*2), this.shieldBarHeight + (this.shieldBarStrokeThickness*2));
	
	
			this.shieldBarGraphics.fillStyle(0x000000);
			this.shieldBarGraphics.fillRect(this.shieldBarOffsetX, this.shieldBarOffsetY, this.shieldBarWidthMax, this.shieldBarHeight);
	
			//shield
			this.shieldBarGraphics.fillStyle(this.characterShieldFillColor);
			var shieldCurrentWidth = (this.shieldCur/this.shieldMax) * this.shieldBarWidthMax;
			this.shieldBarGraphics.fillRect(this.shieldBarOffsetX, this.shieldBarOffsetY, shieldCurrentWidth, this.shieldBarHeight);
		}
	}


	createTextGraphics() {
		//calculate text height and offset
		this.textHeight = this.textHeightMin + ((this.size - 1) * this.textHeightSizeRatio);
		this.textOffsetY= this.textOffsetYMin + ((this.size - 1) * this.textOffsetYSizeRatio);

		this.textHeight = this.globalfuncs.clamp(this.textHeight, this.textHeightMin, this.textHeightMax);
		this.textOffsetY = this.globalfuncs.clamp(this.textOffsetY, this.textOffsetYMin, this.textOffsetYMax);
		

		this.textGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18, this.usernameText);
		this.textGraphics.setOrigin(0.5, 0.5);
		this.textGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.textGraphics.setY((this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + this.textOffsetY);

		this.textGraphics.setAlpha(0.2);

		//if its your own character, put it on a special layer that is always on top
		if(this.ownerId === this.gc.myUserServerId) {
			this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
		}
		else {
			this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.textLayer);
		}
	}

	drawTextGraphics() {
		if(this.ownerType === "ai") {
			this.usernameText = "AI " + this.ownerId
		}
		else {
			var user = this.gc.um.getUserByServerID(this.ownerId);
			if(user !== null) {
				this.usernameText = user.username;
			}
		}

		var textStyle = {
			color: this.characterTextFillColor,
			fontSize: this.textHeight + "px",
			strokeThickness: this.characterTextStrokeThickness,
			stroke: this.characterTextStrokeColor
		}

		if(this.textGraphics !== null) {
			this.textGraphics.setStyle(textStyle);
			this.textGraphics.setText(this.usernameText);
		}
	}
	
	createBoxGraphics() {
		this.boxGraphics = this.ms.add.graphics();
		this.boxGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);
	}

	drawBoxGraphics() {
		var circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * this.planckRadius * this.size);
		// this.boxGraphics.fillStyle(this.boxGraphicsFillColor);
		// this.boxGraphics.lineStyle(this.characterBorderThickness, this.boxGraphicsStrokeColor);
		// this.boxGraphics.fillCircleShape(circleShape);
		// this.boxGraphics.strokeCircleShape(circleShape);
	}

	createSpriteGraphics() {
		this.spriteGraphics = this.ms.add.sprite((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), this.spriteKey);
		this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.spriteGraphics.setOrigin(this.originX, this.originY);
		this.spriteGraphics.setScale(this.size * this.ms.planckUnitsToPhaserUnitsRatio * this.scaleX, this.size * this.ms.planckUnitsToPhaserUnitsRatio * this.scaleY);
	}

	createGlowGraphics() {
		//ELLIPSE
		this.glowOffsetY = this.glowOffsetY * this.size;
		this.glowGraphics = this.ms.add.ellipse((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + this.glowOffsetY, 25 * this.size, 10 * this.size, this.characterFillColor);
		this.glowGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.glowGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
		this.glowGraphics.setDepth(ClientConstants.PhaserDrawLayers.glowLayer);
	}

	drawGlowGraphics() {

	}

	createMouseoverHitbox() {
		var circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * this.planckRadius * this.size);
		this.mouseOverHitbox = this.ms.add.graphics();
		this.mouseOverHitbox.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.mouseOverHitbox.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
		this.mouseOverHitbox.setDepth(this.hitboxLayer);
		
		//debugging hitbox
		// this.mouseOverHitbox.lineStyle(1, 0xff00ff);
		// this.mouseOverHitbox.strokeCircleShape(circleShape);

		this.mouseOverHitbox.setInteractive(circleShape, Phaser.Geom.Circle.Contains);
		this.mouseOverHitbox.on('pointerover', this.pointeroverEvent.bind(this));
		this.mouseOverHitbox.on('pointerout', this.pointeroutEvent.bind(this));
	}

	createCooldownGraphics() {
		if(this.ownerId === this.gc.myUserServerId) {			
			//calculate cooldown height and offset
			this.cooldownHeight = this.cooldownHeightMin + ((this.size - 1) * this.cooldownHeightSizeRatio);
			this.cooldownOffsetY = this.cooldownOffsetYMin + ((this.size - 1) * this.cooldownOffsetYSizeRatio);
			this.cooldownOffsetX = this.cooldownOffsetXMin + ((this.size - 1) * this.cooldownOffsetXSizeRatio);

			this.cooldownHeight = this.globalfuncs.clamp(this.cooldownHeight, this.cooldownHeightMin, this.cooldownHeightMax);
			this.cooldownOffsetY = this.globalfuncs.clamp(this.cooldownOffsetY, this.cooldownOffsetYMax, this.cooldownOffsetYMin);
			this.cooldownOffsetX = this.globalfuncs.clamp(this.cooldownOffsetX, this.cooldownOffsetXMin, this.cooldownOffsetXMax);

			this.cooldownGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "9");
			this.cooldownGraphics.setX((this.x * this.ms.planckUnitsToPhaserUnitsRatio) + this.cooldownOffsetX);
			this.cooldownGraphics.setY((this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + this.cooldownOffsetY);

			this.cooldownGraphics.setAlpha(1.0);

			//if its your own character, put it on a special layer that is always on top
			this.cooldownGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
		}
	}

	drawCooldownGraphics() {
		if(this.cooldownGraphics !== null) {
			var textStyle = {
				color: this.characterTextFillColor,
				fontSize: this.textHeight + "px",
				strokeThickness: this.characterTextStrokeThickness,
				stroke: this.characterTextStrokeColor
			}
	
			if(this.cooldownGraphics !== null) {
				this.cooldownGraphics.setStyle(textStyle);
				this.cooldownGraphics.setText("9");
			}
		}
	}

	pointeroverEvent() {
		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.shieldBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.glowGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);

		this.textGraphics.setAlpha(1.0);
	}


	pointeroutEvent() {
		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);
		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.textLayer);
		this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.glowGraphics.setDepth(ClientConstants.PhaserDrawLayers.glowLayer);
		
		this.textGraphics.setAlpha(0.2);

		if(this.ownerId === this.gc.myUserServerId) {
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
			this.shieldBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);
		}
		else {
			this.shieldBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.hpBarLayer);
		}
	}

	createDirectionGraphics() {
		this.directionGraphics = this.ms.add.graphics({
			lineStyle: {
				width: 1.5,
				color: 0xffff00
			},
			fillStyle: {
				color: 0xffff00
			}
		});

		this.directionGraphics.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);
	}

	drawDirectionGraphics() {
		// console.log(this.serverCharacterDirection);
		this.directionGraphics.clear();
		if(this.gc.bDisplayServerSightlines) {
			var targetLine = new Phaser.Geom.Line(0, 0, 0, 0);
			var targetLineLength = 100;
	
			//redraw the target line
			var x1 = this.x * this.ms.planckUnitsToPhaserUnitsRatio;
			var y1 = this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1;
	
			targetLine.x1 = x1;
			targetLine.y1 = y1;
			
			Phaser.Geom.Line.SetToAngle(targetLine, x1, y1, this.serverCharacterDirection, targetLineLength);
	
			this.directionGraphics.strokeLineShape(targetLine);
		}
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpBarGraphics.destroy();
		this.shieldBarGraphics.destroy();
		this.spriteGraphics.destroy();
		this.glowGraphics.destroy();
		this.mouseOverHitbox.destroy();
		this.directionGraphics.destroy();

		if(this.cooldownGraphics !== null) {
			this.cooldownGraphics.destroy();
			this.cooldownGraphics = null;
		}

		//put gravestone where the character was removed
		var gravestone = {
			gravestoneImage: null,
			gravestoneText: null,
			countdownTimer: 15000 //ms
		};

		gravestone.gravestoneImage = this.ms.add.image((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "data/sprites/gravestone.json");
		gravestone.gravestoneImage.setDepth(ClientConstants.PhaserDrawLayers.gravestoneLayer);
		gravestone.gravestoneImage.setScale(2, 2);
		//gravestone.gravestoneImage.setScale(this.size * this.ms.planckUnitsToPhaserUnitsRatio * this.scaleX, this.size * this.ms.planckUnitsToPhaserUnitsRatio * this.scaleY);

		if(this.ownerType === "ai")
		{
			gravestone.countdownTimer = 5000;
		}
		else if(this.ownerType === "user")
		{
			var u = this.gc.um.getUserByServerID(this.ownerId);
			var usernameText = "???";

			if(u)
			{
				usernameText = u.username;	
			}
			var textStyle = {
				color: this.ms.gravestoneTextColor, 
				fontSize: "18px",
				strokeThickness: this.ms.gravestoneStrokeThickness,
				stroke: this.ms.gravestoneStrokeColor
			}
			var offsetY = 25;

			gravestone.gravestoneText = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + (offsetY), usernameText, textStyle);
			gravestone.gravestoneText.setDepth(ClientConstants.PhaserDrawLayers.textLayer);
			gravestone.gravestoneText.setOrigin(0.5, 0.5);
		}

		this.ms.gravestones.push(gravestone);
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
		this.boxGraphics = null;
		this.textGraphics = null;
		this.boxGraphicsStrokeColor = 0;
		this.boxGraphicsFillColor = 0;
		this.characterBorderThickness = 3;
		this.characterTextStrokeColor = 0;
		this.characterTextFillColor = 0;
		this.characterTextStrokeThickness = 1;
		this.usernameText = "???";
		this.circleShape = null;
		this.state = null;
		this.nextState = null;
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


	showHealTint() {
		this.spriteGraphics.setTintFill(this.healTintColor);
		this.healTimer = this.healTimerLength;
	}

	hideHealTint() {
		this.spriteGraphics.clearTint();
	}


	showCooldownGraphics(cooldownTimeLength) {
		if(this.cooldownGraphics !== null) {
			this.bShowCooldownGraphics = true;
			this.cooldownTimeAcc = 0;
			this.cooldownUpdateAcc = 200;
			this.cooldownTimeLength = cooldownTimeLength;
	
			//also unhide the phaser graphics here somehow
			this.cooldownGraphics.setVisible(true);
		}
	}

	updateCooldownGraphics() {
		if(this.cooldownGraphics !== null) {
			var secondsLeft = Math.floor((this.cooldownTimeLength - this.cooldownTimeAcc)/1000);
			this.cooldownGraphics.setText(secondsLeft);
		}
	}

	hideCooldownGraphics() {
		if(this.cooldownGraphics !== null) {
			this.bShowCooldownGraphics = false;

			//also hide the phaser graphics here somehow
			this.cooldownGraphics.setVisible(false);
		}
	}


	//update called by state
	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		//update state
		this.state.update(dt);

		if(this.nextState !== null) {
			this.state.exit(dt);
			this.nextState.enter(dt);

			this.state = this.nextState;
			this.nextState = null;
		}

		this.updateClientInputs();
	}

	//update called by mainScene
	sceneUpdate(dt) {
		//update other graphic stuff
		if(this.updateHealthBar) {
			this.drawHpBarGraphics();
			this.updateHealthBar = false;
		}

		if(this.updateShieldBar) {
			this.drawShieldBarGraphics();
			this.updateShieldBar = false;
		}

		this.drawDirectionGraphics();

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


		if(this.healTimer > 0) {
			this.healTimer -= dt;
			if(this.healTimer <= 0) {
				this.hideHealTint();
			}
		}



		if(this.bShowCooldownGraphics) {
			this.cooldownTimeAcc += dt;
			this.cooldownUpdateAcc += dt;

			if(this.cooldownUpdateAcc >= this.cooldownUpdateInterval) {
				this.cooldownUpdateAcc = 0;
				this.updateCooldownGraphics();
			}

			if(this.cooldownTimeAcc >= this.cooldownTimeLength) {
				this.hideCooldownGraphics();
			}
		}

		this.updateRenderTarget(dt);
		this.render(dt);
	}


	activeCharacterUpdateEvent(e) {
		this.serverX = e.characterPosX;
		this.serverY = e.characterPosY;
		this.serverCharacterDirection = e.characterDirection;

		this.clientInputs.up.state = e.up;
		this.clientInputs.down.state = e.down;
		this.clientInputs.left.state = e.left;
		this.clientInputs.right.state = e.right;

		//temporary way just to flag a hp change
		if(this.hpCur !== e.characterHpCur) {
			this.updateHealthBar = true;
		}

		this.hpCur = e.characterHpCur;
	}

	activeCharacterShieldUpdateEvent(e) {
		if(this.shieldCur !== e.characterShieldCur) {
			this.updateShieldBar = true;
		}

		this.shieldCur = e.characterShieldCur;
	}


	updateCharacterStateEvent(e) {
		// console.log("character update event " + e.characterId)
		var r = this.gc.rm.getResourceByServerId(e.characterClassStateResourceId);
		this.nextState = new CharacterClassState(this.gc, this, r, 0);
	}
	
	//this lerps the character from the (x,y) to the (serverX, serverY)
	updateRenderTarget(dt) {
		var curx = this.x;
		var cury = this.y;
		var targetx = this.serverX;
		var targety = this.serverY;
		var actualx = targetx;
		var actualy = targety;
		var mySpeed = 0.25;

		actualx = ((targetx - curx) * mySpeed) + curx;
		actualy = ((targety - cury) * mySpeed) + cury;

		this.x = actualx;
		this.y = actualy;
	}

	updateClientInputs() {
		this.clientInputs.up.prevState = this.clientInputs.up.state;
		this.clientInputs.down.prevState = this.clientInputs.down.state;
		this.clientInputs.left.prevState = this.clientInputs.left.state;
		this.clientInputs.right.prevState = this.clientInputs.right.state;
	}

	//this actually renders the character in phaser
	render(dt) {
		//just to make it equivalent to the old "architecture"
		this.boxGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);

		this.glowGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.glowGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + this.glowOffsetY);
		
		this.textGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio))
		this.textGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + this.textOffsetY)
	
		this.hpBarGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio))
		this.hpBarGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1))

		this.shieldBarGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio))
		this.shieldBarGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1))

		this.spriteGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.spriteGraphics.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);

		this.mouseOverHitbox.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.mouseOverHitbox.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);

		if(this.bShowCooldownGraphics && this.cooldownGraphics !== null) {
			this.cooldownGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio) + this.cooldownOffsetX);
			this.cooldownGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + this.cooldownOffsetY);
		}
	}
}
