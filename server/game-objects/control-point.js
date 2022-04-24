const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class ControlPoint {
	constructor() {
		this.type = "control-point";
		this.plBody = null;
		this.id = null;
		this.xStarting = 0; //top left corner of control point
		this.yStarting = 0; //top left corner of control point
		this.x = 0;			//center point of control point (needed for planck since planck's 'position' is the center of object)
		this.y = 0;			//center point of control point (needed for planck since planck's 'position' is the center of object)
		this.angle = 0;
		this.width = 1;
		this.height = 1;

		this.ownerTeamId = 0; 				//the team that is currently owning the control point. 0 means nobody owns this control point		
		this.capturingTeamId = 0;			//the team that is currently occupying the control point (trying to capture it). 0 means nobody is currently capturing
		this.capturingTimeAcc = 0;			//time accumulated for the occupying team
		this.capturingRate = 0;				//current capturing/reverting rate of the point
		this.capturingRateCoeff = 0;		//1: capturing, -1: reverting, 0: stable

		this.capturingTimeRequired = 5000;	//time required to fully own the point for the occupying team
		this.teamCaptureRates = {};
		this.naturalRevertingRate = 1/4;
		this.isDirty = false;
		this.tempTimer = 0;
		this.syncTimerAcc = 0;
		this.syncTimer = 5000; 				//timer to send updates to clients every now and then
		
	}

	controlPointInit(gameServer, xStarting, yStarting, width, height, angle) {
		this.gs = gameServer;
		this.xStarting = xStarting;
		this.yStarting = yStarting;
		this.angle = angle;
		this.width = width;
		this.height = height;
	}

	activated() {
		this.x = this.xStarting + this.width/2;
		this.y = this.yStarting - this.height/2;

		var theShape = this.gs.pl.Box(this.width/2, this.height/2, this.gs.pl.Vec2(0, 0), this.angle*-1);

		this.plBody = this.gs.world.createBody({
			position: this.gs.pl.Vec2(this.x, this.y),
			type: this.gs.pl.Body.STATIC,
			fixedRotation: true,
			userData: {
				type:"control-point", 
				id: this.id
			}
		});

		this.plBody.createFixture({
			shape: theShape,
			friction: 0.0,
			isSensor: true,
			filterCategoryBits: CollisionCategories["control_point"],
			filterMaskBits: CollisionMasks["control_point"]
		});

		//prefill in the teamCaptureRates
		var teams = this.gs.tm.getTeams();
		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				this.teamCaptureRates[teams[i].id] = 0;
			}
		}

		//tell the active user agents about it
		this.gs.globalfuncs.insertTrackedEntityToPlayingUsers(this.gs, "gameobject", this.id);
	}

	

	deactivated() {
		if(this.plBody) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
				
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0 ; i < userAgents.length; i++) {
			userAgents[i].deleteTrackedEntity("gameobject", this.id);
		}
	}

	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		this.gs = null;
	}
	
	update(dt) {
		
	}
	
	modCapturingTimeAcc(amount) {
		this.capturingTimeAcc += Math.floor(amount);
		if(this.capturingTimeAcc >= this.capturingTimeRequired) {
			this.capturingTimeAcc = this.capturingTimeRequired;
		} else if (this.capturingTimeAcc <= 0) {
			this.capturingTimeAcc = 0;
		}
	}

	postPhysicsUpdate(dt) {
		var teamsOccupyingPoint = 0;
		var currentTeamIdOccupyingPoint = 0;
		var currentTeamcaptureRate = 0;
		for (var teamId in this.teamCaptureRates) {
			if (this.teamCaptureRates.hasOwnProperty(teamId)) {
				if(this.teamCaptureRates[teamId] > 0) {
					teamsOccupyingPoint++;
					currentTeamIdOccupyingPoint = teamId;
					currentTeamcaptureRate = this.teamCaptureRates[teamId];
				}
			}
		}

		//determine cap rate
		if(teamsOccupyingPoint === 0) {
			this.capturingRate = this.naturalRevertingRate;
		} else if (teamsOccupyingPoint === 1) {
			if(currentTeamIdOccupyingPoint === this.ownerTeamId) {
				this.capturingRate = currentTeamcaptureRate/2;
			} 
			else{
				this.capturingRate = currentTeamcaptureRate;
			}
		} else {
			this.capturingRate = 0;
		}

		//determine who is capturing
		if(this.capturingTimeAcc === 0 && this.capturingRate !== 0) {
			if(currentTeamIdOccupyingPoint !== this.ownerTeamId) {
				this.capturingTeamId = currentTeamIdOccupyingPoint;
				
				//if the capturingTeamId changed from one team to another
				if(this.capturingTeamId !== 0) {
					this.isDirty = true; 
				}
			} else {
				this.capturingTeamId = 0;
			}
		}

		//determine if its currently being capped or reverted
		if(this.capturingRate === 0 || this.capturingTeamId === 0) {
			this.capturingRateCoeff = 0;
		}
		else {
			this.capturingRateCoeff = currentTeamIdOccupyingPoint === this.capturingTeamId ? 1 : -1;
		}

		//apply cap or revert
		this.modCapturingTimeAcc(dt * this.capturingRate * this.capturingRateCoeff);

		//control point was captured
		if(this.capturingTimeAcc >= this.capturingTimeRequired) {
			this.ownerTeamId = this.capturingTeamId;
			this.capturingTeamId = 0;
			this.capturingTimeAcc = 0;
			this.isDirty = true;
		}
		
		//give the client an update every now and then
		this.syncTimerAcc += dt;
		if(this.syncTimerAcc >= this.syncTimer){
			this.syncTimerAcc = 0;
			this.isDirty = true;
		}

		//if its dirty in anyway, send the updates to the clients
		if(this.isDirty) {
			this.isDirty = false;
			this.syncTimerAcc = 0;

			var updateEvent = this.serializeUpdateControlPointEvent();
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertTrackedEntityEvent("gameobject", this.id, updateEvent);
			}
		}


		// //debug report
		// this.tempTimer += dt;
		// if(this.tempTimer >= 1000){
		// 	this.tempTimer = 0;
		// 	//ownId: -1		capId: 2		timeAcc: 99999		rate: 10		coef: 0
		// 	var report = [
		// 		{"key": "ownId", "val": this.ownerTeamId},
		// 		{"key": "capId", "val": this.capturingTeamId},
		// 		{"key": "timeAcc", "val": this.capturingTimeAcc},
		// 		{"key": "rate", "val": this.capturingRate},
		// 		{"key": "coef", "val": this.capturingRateCoeff}
		// 	];
			
		// 	var caprates = " | ";
			
		// 	for (var teamId in this.teamCaptureRates) {
		// 		if (this.teamCaptureRates.hasOwnProperty(teamId)) {
		// 			caprates += "("+teamId+"):" + this.teamCaptureRates[teamId] + "\t\t";
		// 		}
		// 	}
			
		// 	console.log("CP Report: " + report.reduce((prev, curr, index) => {return prev + curr.key + ": " + curr.val + "\t\t";}, "") + caprates);
		// }
	}

	postWebsocketUpdate() {

	}

	collisionCharacter(c) {
		this.teamCaptureRates[c.teamId]++;
		this.isDirty = true;

		//send to the specific user that their character entered the control point
		var user = this.gs.um.getUserByID(c.ownerId);
		if(user !== null) {
			var userAgent = this.gs.uam.getUserAgentByID(user.userAgentId);
			if(userAgent !== null) {
				var eventData = this.serializecharacterOnControlPointEvent();
				userAgent.insertTrackedEntityEvent("gameobject", this.id, eventData);
			}
		}
	}

	endCollisionCharacter(c) {
		this.teamCaptureRates[c.teamId]--;
		this.isDirty = true;

		//send to the specific user that their character exited the control point
		var user = this.gs.um.getUserByID(c.ownerId);
		if(user !== null) {
			var userAgent = this.gs.uam.getUserAgentByID(user.userAgentId);
			if(userAgent !== null) {
				var eventData = this.serializecharacterOffControlPointEvent();
				userAgent.insertTrackedEntityEvent("gameobject", this.id, eventData);
			}
		}
	}


	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////
	serializeAddControlPointEvent() {
		var eventData = null;
		var bodyPos = {x: this.x, y: this.y}
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "addControlPoint",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"width": this.width,
			"height": this.height,
			"capturingTimeRequired": this.capturingTimeRequired,
			"ownerTeamId": this.ownerTeamId,
			"capturingTeamId": this.capturingTeamId,
			"capturingTimeAcc": this.capturingTimeAcc,
			"capturingRate": this.capturingRate,
			"capturingRateCoeff": this.capturingRateCoeff
		};
		
		return eventData;
	}


	serializeUpdateControlPointEvent() {
		var eventData = null;

		eventData = {
			"eventName": "updateControlPoint",
			"id": this.id,
			"ownerTeamId": this.ownerTeamId,
			"capturingTeamId": this.capturingTeamId,
			"capturingTimeAcc": this.capturingTimeAcc,
			"capturingRate": this.capturingRate,
			"capturingRateCoeff": this.capturingRateCoeff
		};

		console.log("serialized update control point event: " + this.capturingRate);

		return eventData;
	}

	serializecharacterOnControlPointEvent() {
		return {
			"eventName": "characterOnControlPoint",
			"id": this.id
		};
	}

	serializecharacterOffControlPointEvent() {
		return {
			"eventName": "characterOffControlPoint",
			"id": this.id
		};
	}
}

exports.ControlPoint = ControlPoint;