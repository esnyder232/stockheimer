import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"
import ServerEventQueue from "../classes/server-event-queue.js"

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
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.hpMax = 100;
		this.hpCur = 100;
		this.isDirty = false;

		this.boxGraphics = null;
		this.hpBarGraphics = null;
		this.textGraphics = null;
		this.spriteGraphics = null;
		this.glowGraphics = null;
		this.mouseOverHitbox = null;

		this.serverEventMapping = {
			"activeCharacterUpdate": this.activeCharacterUpdateEvent.bind(this)
		}

		this.boxGraphicsStrokeColor = 0;
		this.characterBorderThickness = 1;
		this.characterTextStrokeColor = 0;
		this.characterTextFillColor = 0;
		this.characterTextStrokeThickness = 1;
		this.characterFillColor = 0x000000;
		this.usernameText = "???";
		this.circleShape = null;

		this.spriteKey = "";
		this.animationKey = "";
		this.animationPlayRate = 1;

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

		//overwrite the defaults with data from the resource
		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.planckData.radius")) {
			this.planckRadius = this.characterClassResource.data.planckData.radius;
		}

		//testing sprite graphics
		//get phaser data from resource
		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.phaserData.originX")) {
			this.originX = this.characterClassResource.data.phaserData.originX;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.phaserData.originY")) {
			this.originY = this.characterClassResource.data.phaserData.originY;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.size")) {
			this.size = this.characterClassResource.data.size;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.phaserData.scaleX")) {
			this.scaleX = this.characterClassResource.data.phaserData.scaleX;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.phaserData.scaleY")) {
			this.scaleY = this.characterClassResource.data.phaserData.scaleY;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.idleMsPerFrame")) {
			this.idleMsPerFrame = this.characterClassResource.data.idleMsPerFrame;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.moveMsPerFrame")) {
			this.moveMsPerFrame = this.characterClassResource.data.moveMsPerFrame;
		}



		//hard coding the animation to be idle-down for now
		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.animationSets.idle.spriteKey")) {
			this.spriteKey = this.characterClassResource.data.animationSets.idle.spriteKey;
		}

		if(this.globalfuncs.nestedValueCheck(this.characterClassResource, "data.animationSets.idle.frameTagDown")) {
			this.frameTag = this.characterClassResource.data.animationSets.idle.frameTagDown;
		}

		this.animationKey = this.spriteKey + "-" + this.frameTag;

		// console.log("=== Creating sprite graphics");
		// console.log(this.characterClassResource);
		// console.log(this.size);
		// console.log(this.originX);
		// console.log(this.originY);
		// console.log(this.scaleX);
		// console.log(this.scaleY);
		// console.log(this.spriteKey);
		// console.log(this.frameTag);
		// console.log(this.animationKey);


		//get colors sorted out
		this.calculateColors();

		//create the graphics objects
		this.createHpBarGraphics();
		this.createTextGraphics();
		this.createBoxGraphics();
		this.createSpriteGraphics();
		this.createGlowGraphics();
		this.createMouseoverHitbox();

		//draw the graphics objects on activation
		this.drawHpBarGraphics();
		this.drawTextGraphics();
		this.drawBoxGraphics();
		this.drawGlowGraphics();


		//temporarily play the only animation
		this.spriteGraphics.anims.play(this.animationKey);
		this.spriteGraphics.anims.msPerFrame = this.idleMsPerFrame;

		//check if this is your character your controlling. If it is, then switch camera modes
		if(this.gc.myCharacter !== null && this.id === this.gc.myCharacter.id)
		{
			this.ms.switchCameraMode(1);
			var killCharacterBtn = $("#kill-character");

			if(killCharacterBtn.length > 0)
			{
				killCharacterBtn.removeClass("hide");
			}
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
				this.teamName = team.name;
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
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.textLayer);
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
		this.hpBarGraphics.fillStyle(0xFF0000);
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
			this.hpBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.textLayer);
		}
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpBarGraphics.destroy();
		this.spriteGraphics.destroy();
		this.glowGraphics.destroy();
		this.mouseOverHitbox.destroy();

		//put gravestone where the character was removed
		var gravestone = {
			gravestoneImage: null,
			gravestoneText: null,
			countdownTimer: 15000 //ms
		};

		gravestone.gravestoneImage = this.ms.add.image((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "data/sprites/gravestone.json");
		gravestone.gravestoneImage.setDepth(ClientConstants.PhaserDrawLayers.gravestoneLayer);
		gravestone.gravestoneImage.setScale(2, 2);

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

			gravestone.gravestoneText = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 20 , usernameText, textStyle);
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
	}



	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		this.updateRenderTarget(dt);
		this.render(dt);

		if(this.updateHealthBar) {
			this.drawHpBarGraphics();
			this.updateHealthBar = false;
		}


		//change state
		// if(this.nextState)
		// {
		// 	this.state.exit();
		// 	this.nextState.enter();
		// 	this.state = this.nextState;
		// 	this.nextState = null;
		// }
	}


	activeCharacterUpdateEvent(e) {
		this.serverX = e.characterPosX;
		this.serverY = e.characterPosY;

		//temporary way just to flag a hp change
		if(this.hpCur !== e.characterHpCur) {
			this.updateHealthBar = true;
		}

		this.hpCur = e.characterHpCur;
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
