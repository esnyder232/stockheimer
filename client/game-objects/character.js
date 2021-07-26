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
		
		this.globalfuncs = null;

		this.state = null;
		this.nextState = null;
		this.exitCurrentState = false;
		this.nextCharacterClassResource = null;
		this.isStateDirty = false;

		this.hpMax = 100;
		this.hpCur = 100;
		this.isDirty = false;

		this.boxGraphics = null;
		this.hpBarGraphics = null;
		this.textGraphics = null;
		this.spriteGraphics = null;
		this.glowGraphics = null;
		this.mouseOverHitbox = null;
		this.directionGraphics = null;

		this.serverEventMapping = {
			"activeCharacterUpdate": this.activeCharacterUpdateEvent.bind(this),
			"updateCharacterState": this.updateCharacterStateEvent.bind(this)
		}

		this.boxGraphicsStrokeColor = 0;
		this.characterBorderThickness = 1;
		this.characterTextStrokeColor = 0;
		this.characterTextFillColor = 0;
		this.characterTextStrokeThickness = 1;
		this.characterFillColor = 0x000000;
		this.usernameText = "???";
		this.circleShape = null;

		//sprite rendering stuff
		this.currentAnimationSetKey = "";
		this.frameTagDirection = "";
		this.spriteKey = "";
		this.animationPlayRate = 1;
		this.isSpriteDirty = false;
		this.preserveAnimationTiming = false;
		this.repeatNum = -1;
		this.preserveAnimationProgress = false;
		


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
		this.hpBarOffsetYMin = -30;
		this.hpBarOffsetYMax = -999;
		this.hpBarOffsetYSizeRatio = -20;


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

		//glow vatiables
		this.glowRadius = 8;
		this.glowCenterColor = "#ffffff";
		this.glowOffsetY = 10;

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

		this.characterTintColor = 0xffffff;

		//hacky shit for now. Delete this later.
		this.teamName = "";
	}

	characterInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);
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
		// this.spriteKey = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.animationSets?.idle?.spriteKey, this.spriteKey);
		
		//hard coding the animation to be idle-down for now
		// this.frameTag = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.animationSets?.idle?.frameTagDown, this.frameTag);

		// this.animationFullKey = this.spriteKey + "-" + this.frameTag;

		// console.log("=== Creating sprite graphics");
		// console.log(this.characterClassResource);
		// console.log(this.size);
		// console.log(this.originX);
		// console.log(this.originY);
		// console.log(this.scaleX);
		// console.log(this.scaleY);
		// console.log(this.spriteKey);
		// console.log(this.frameTag);
		// console.log(this.animationFullKey);


		//get colors sorted out
		this.calculateColors();

		//create the graphics objects
		this.createHpBarGraphics();
		this.createTextGraphics();
		this.createBoxGraphics();
		this.createSpriteGraphics();
		this.createGlowGraphics();
		this.createMouseoverHitbox();
		this.createDirectionGraphics();

		//draw the graphics objects on activation
		this.drawHpBarGraphics();
		this.drawTextGraphics();
		this.drawBoxGraphics();
		this.drawGlowGraphics();
		this.drawDirectionGraphics();

		//set the animation to be idle in the beginning
		this.changeAnimationSetKey("idle");
		this.updateLookDirection();
		this.isSpriteDirty = true;


		//temporarily play the only animation
		// this.spriteGraphics.anims.play(this.animationFullKey);
		// this.spriteGraphics.anims.msPerFrame = this.idleMsPerFrame;

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
				this.characterTintColor = team.phaserCharacterTintColor;
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

	pointeroverEvent() {
		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
		this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.mouseOverLayer);
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
		}
		else {
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.hpBarLayer);
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

	updateLookDirection() {
		var newFrameTagDirection = this.frameTagDirection;
		var xDirection = Math.cos(this.serverCharacterDirection);
		var yDirection = Math.sin(-this.serverCharacterDirection);

		//yup, this. There is a probably a better way to do this though. One that doesn't require any if statements.
		if(xDirection >= 0.707) {
			newFrameTagDirection = "frameTagRight";
		} else if (xDirection <= -0.707) {
			newFrameTagDirection = "frameTagLeft";
		} else if (yDirection >= 0.707) {
			newFrameTagDirection = "frameTagUp";
		} else {
			newFrameTagDirection = "frameTagDown";
		}

		//see if the direction of the sprite needs to change
		if(this.frameTagDirection !== newFrameTagDirection) {
			this.frameTagDirection = newFrameTagDirection;
			this.isSpriteDirty = true;
		}
	}

	changeAnimationSetKey(newAnimationSetKey, timeLength, repeatNum, preserveAnimationProgress) {
		if(repeatNum === undefined) {
			repeatNum = -1;
		}

		this.currentAnimationSetKey = newAnimationSetKey;
		this.spriteKey = this?.characterClassResource?.data?.animationSets?.[this.currentAnimationSetKey]?.spriteKey
		this.updateLookDirection();
		this.repeatNum = repeatNum;
		this.isSpriteDirty = true;
		this.isAnimationKeyChanged = true; //fucking stupid. Just used as a flag for updateAnimation.
		this.preserveAnimationProgress = preserveAnimationProgress;
		this.timeLength = timeLength;

		// console.log("Changing animation set key to: " + newAnimationSetKey + ", msPerFrame: " + msPerFrame + ", repeatNum: " + repeatNum);
	}

	updateAnimation() {
		// console.log("=== updateing animation ===");
		var frameTag = this?.characterClassResource?.data?.animationSets?.[this.currentAnimationSetKey]?.[this.frameTagDirection];
		var progress = this.spriteGraphics.anims.getProgress();
		var msPerFrame = 1000;
		this.spriteGraphics.anims.play(this.spriteKey + "-" + frameTag);
		
		//this is the worst thing in the world. If the state is null, make the animation speeds the defaults
		if(this.state === null) {
			msPerFrame = this.idleMsPerFrame;
		} else {
			//calculate msPerFrame by the new animation playing and timeLength
			var totalFrames = this.spriteGraphics.anims.getTotalFrames();
			if(totalFrames <= 0) {
				totalFrames = 1
			}
			msPerFrame = this.timeLength/totalFrames;
		}

		this.spriteGraphics.anims.msPerFrame = msPerFrame;
		this.spriteGraphics.anims.setRepeat(this.repeatNum);

		//fucking stupid
		if(this.isAnimationKeyChanged) {
			this.spriteGraphics.anims.restart();
			this.isAnimationKeyChanged = false;
		}
		else if(this.preserveAnimationProgress) {
			this.spriteGraphics.anims.setProgress(progress);
		} else {
			this.spriteGraphics.anims.restart();
		}
		
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpBarGraphics.destroy();
		this.spriteGraphics.destroy();
		this.glowGraphics.destroy();
		this.mouseOverHitbox.destroy();
		this.directionGraphics.destroy();

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
		this.nextCharacterClassResource = null;
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


	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();



		if(this.updateHealthBar) {
			this.drawHpBarGraphics();
			this.updateHealthBar = false;
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

		// //update state if there is one
		// if(this.state !== null) {
		// 	this.state.update(dt);

		// 	//exit the state if the flag is set
		// 	if(this.exitCurrentState) {
		// 		this.state.exit(dt);
		// 		this.state = null;
		// 	}
		// }

		// //change state if there is a next one
		// if(this.nextCharacterClassResource !== null) {
		// 	var nextState = new CharacterClassState(this.gc, this, this.nextCharacterClassResource);

		// 	nextState.enter(dt);
			
		// 	this.state = nextState;
		// 	this.nextCharacterClassResource = null;
		// }
		
		//check if sprite is dirty and needs to change animation
		if(this.isSpriteDirty) {
			this.updateAnimation();
			this.isSpriteDirty = false;
		}

		this.updateRenderTarget(dt);
		this.render(dt);

		// console.log(this.spriteGraphics.anims.getProgress());

		this.exitCurrentState = false;
	}


	activeCharacterUpdateEvent(e) {
		this.serverX = e.characterPosX;
		this.serverY = e.characterPosY;
		this.serverCharacterDirection = e.characterDirection;

		//temporary way just to flag a hp change
		if(this.hpCur !== e.characterHpCur) {
			this.updateHealthBar = true;
		}

		this.hpCur = e.characterHpCur;

		this.updateLookDirection();
	}

	updateCharacterStateEvent(e) {
		// console.log("character update event " + e.characterId)
		// var r = this.gc.rm.getResourceByServerId(e.characterClassStateResourceId);
		// if(r !== null) {
		// 	this.nextCharacterClassResource = r;
		// }
		// else {
		// 	this.nextCharacterClassResource = null;
		// }
		
		// this.exitCurrentState = true;
	}
	
	//this lerps the character from the (x,y) to the (serverX, serverY)
	updateRenderTarget(dt) {
		var curx = this.x;
		var cury = this.y;
		var targetx = this.serverX;
		var targety = this.serverY;
		var actualx = targetx;
		var actualy = targety;
		var tolerance = 0.07;
		var maxTolerance = 2.00;
		var mySpeed = 0.25;

		//if the target is too far away, snap to the target instead of slowly panning (this avoids a "zoop" across the screen)
		//snap to target if its too far away (above max tolerance)
		if(curx <= targetx - maxTolerance || curx >= targetx + maxTolerance) {
			actualx = targetx;
		}
		//slowly pan to the target
		else if (curx <= targetx - tolerance || curx >= targetx + tolerance) {
			actualx = ((targetx - curx) * mySpeed) + curx;
		}
		//snap to the target if your close enough (within tolerance)
		else {
			actualx = targetx;
		}


		//snap to target if its too far away (above max tolerance)
		if(cury <= targety - maxTolerance || cury >= targety + maxTolerance ) {
			actualy = targety
		}
		//slowly pan to the target
		else if (cury <= targety - tolerance || cury >= targety + tolerance) {
			actualy = ((targety - cury) * mySpeed) + cury;
		}
		//snap to the target if your close enough (within tolerance)
		else {
			actualy = targety;
		}


		this.x = actualx;
		this.y = actualy;
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

		this.spriteGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.spriteGraphics.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);

		this.mouseOverHitbox.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		this.mouseOverHitbox.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);

	}
}
