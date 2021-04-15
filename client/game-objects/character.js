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
		this.textGraphics = null;
		this.hpTextGraphics = null;

		this.serverEventMapping = {
			"activeCharacterUpdate": this.activeCharacterUpdateEvent.bind(this)
		}
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

		////////////////////////////////////////////////////////////////////////////////
		//main scene stuff:
		var boxGraphicsColor = this.ms.userColor;
		var boxGraphicsFillColor = this.ms.userFillColor;

		if(this.ownerType === "ai")
		{
			boxGraphicsColor = this.ms.aiColor;
			boxGraphicsFillColor = this.ms.aiFillColor;
		}

		var circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * 0.375);

		this.boxGraphics = this.ms.add.graphics({ 
			fillStyle: { color: boxGraphicsFillColor }, 
			lineStyle: {
				width: this.ms.characterBorderThickness,
				color: boxGraphicsColor}
		});
		this.boxGraphics.fillCircleShape(circleShape);
		this.boxGraphics.strokeCircleShape(circleShape);

		this.boxGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);

		var usernameText = "???";
		var u = this.gc.um.getUserByServerID(this.ownerId);
		
		var textStyle = {
			color: this.ms.userTextColor,
			fontSize: "18px",
			strokeThickness: this.ms.userStrokeThickness,
			stroke: this.ms.userStrokeColor
		}

		//add username text
		if(this.ownerType === "user")
		{
			if(u)
			{
				usernameText = u.username;
			}
		}
		else if(this.ownerType === "ai")
		{
			usernameText = "AI " + this.ownerId
			textStyle.color = this.ms.aiTextColor;
			textStyle.stroke = this.ms.aiStrokeColor;
			textStyle.strokeThickness = this.ms.aiStrokeThickness;
		}
		
		this.textGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
		this.hpTextGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 34 , this.hpCur + "/" + this.hpMax, textStyle);

		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.hpTextGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

		//check if this is your character your controlling. If it is, then switch pointer modes
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

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpTextGraphics.destroy();

		//put gravestone where the character was removed
		var gravestone = {
			gravestoneImage: null,
			gravestoneText: null,
			countdownTimer: 15000 //ms
		};

		gravestone.gravestoneImage = this.ms.add.image((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "gravestone");
		gravestone.gravestoneImage.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
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

			gravestone.gravestoneText = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-16, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
		}

		this.ms.gravestones.push(gravestone);
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
	}

	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		this.updateRenderTarget(dt);
		this.render(dt);


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
		this.textGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18)
		this.textGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + 18)
	
		this.hpTextGraphics.setX((this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18)
		this.hpTextGraphics.setY((this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + 34)
		this.hpTextGraphics.setText(this.hpCur + "/" + this.hpMax);
	}
}
