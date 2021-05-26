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

		this.boxGraphicsStrokeColor = 0;
		this.boxGraphicsFillColor = 0;
		this.characterBorderThickness = 3;
		this.characterTextStrokeColor = 0;
		this.characterTextFillColor = 0;
		this.characterTextStrokeThickness = 1;
		this.usernameText = "???";
		this.circleShape = null;

		// this.spriteGraphics = null;
		// this.spriteKey = "slime";
		// this.animationKey = "slime-idle-down";

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
		//create the graphics first
		this.circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * 0.375);
		this.boxGraphics = this.ms.add.graphics();
		this.boxGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);

		this.textGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18, this.usernameText);
		this.hpTextGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 34, this.hpCur + "/" + this.hpMax);

		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.hpTextGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

		//now fill in the graphics colors
		this.drawGraphics();

		//testing sprite graphics
		// this.spriteGraphics = this.ms.add.sprite(this.x*this.ms.planckUnitsToPhaserUnitsRatio, this.y*this.ms.planckUnitsToPhaserUnitsRatio, this.spriteKey);
		// this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		// this.spriteGraphics.anims.play(this.animationKey);

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


	//this draws the graphics with the correct team colors and user name text
	drawGraphics() {
		//get the colors sorted out
		//ai gets special treatment because they don't belong to a team yet
		if(this.ownerType === "ai") {
			this.boxGraphicsStrokeColor = this.ms.aiColor;
			this.boxGraphicsFillColor = this.ms.aiFillColor;
			this.characterTextFillColor = this.ms.aiTextColor;
			this.characterTextStrokeColor = this.ms.aiStrokeColor;
			this.characterTextStrokeThickness = this.ms.aiStrokeThickness;
			this.usernameText = "AI " + this.ownerId
		}
		else {
			var user = this.gc.um.getUserByServerID(this.ownerId);

			if(user !== null)
			{
				var team = this.gc.tm.getTeamByServerID(user.teamId);
			
				if(team !== null)
				{
					this.boxGraphicsStrokeColor = team.phaserCharacterStrokeColor;
					this.boxGraphicsFillColor = team.phaserCharacterFillColor;
					this.characterTextFillColor = team.characterTextFillColor;
					this.characterTextStrokeColor = team.characterTextStrokeColor;

				}

				this.usernameText = user.username;
			}
		}

		//now redraw the graphics
		if(this.boxGraphics !== null) {
			this.boxGraphics.fillStyle(this.boxGraphicsFillColor);
			this.boxGraphics.lineStyle(this.characterBorderThickness, this.boxGraphicsStrokeColor);
			this.boxGraphics.fillCircleShape(this.circleShape);
			this.boxGraphics.strokeCircleShape(this.circleShape);
		}

		
		var textStyle = {
			color: this.characterTextFillColor,
			fontSize: "18px",
			strokeThickness: this.characterTextStrokeThickness,
			stroke: this.characterTextStrokeColor
		}

		if(this.textGraphics !== null) {
			this.textGraphics.setStyle(textStyle);
			this.textGraphics.setText(this.usernameText);
		}

		if(this.hpTextGraphics !== null) {

			this.hpTextGraphics.setStyle(textStyle);
			this.hpTextGraphics.setText(this.hpCur + "/" + this.hpMax);
		}
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpTextGraphics.destroy();
		// this.spriteGraphics.destroy();

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
		this.boxGraphics = null;
		this.textGraphics = null;
		this.hpTextGraphics = null;
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

		// this.spriteGraphics.setX(this.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
		// this.spriteGraphics.setY(this.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);
	}
}
