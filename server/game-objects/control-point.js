const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');


///////////////////////////////////////////////////////////////////////////
//MIGHT NOT NEED THIS ANYMORE, BUT I'M GONNA KEEP IT AROUND INCASE I DO
//0 - CP_STABLE - control point is occupied by 0 teams, capturingTimeAcc is at 0
//1 - CP_CAPTURING - control point is occuped by only 1 team, and control point capturingTimeAcc is increasing at the current rate capturingRate
//2 - CP_CONTESTED - control point is occupied by 2+ teams, and control point capturingTimeAcc does not increase or decrease
//3 - CP_REVERTING - control point is occupied by an opposing team (opposing the captyringTeamId), and control point capturingTimeAcc is decreasing back to 0:
//						if the occupying opposing team is the OWNER of the point (ownerTeamId), then decrease the capturingTimeAcc at the naturalRevertingRate
//						if the occupying opposing team is NOT THE OWNER of the point (ownerTeamId), then decrease the capturingTimeAcc at the capturingRate
//4 - CP_REVERTING_NATURAL - control point is occupied by 0 teams, and control point capturingTimeAcc is naturally decreasing back to 0 at the naturalRevertingRate
const CONTROL_POINT_STATES = {
	CP_STABLE: 0,
	CP_CAPTURING: 1,
	CP_CONTESTED: 2,
	CP_REVERTING: 3,
	CP_REVERTING_NATURAL: 4
}
///////////////////////////////////////////////////////////////////////////



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

		this.ownerTeamId = -1; 				//the team that is currently owning the control point. -1 means nobody owns this control point		
		this.capturingTeamId = -1;			//the team that is currently occupying the control point (trying to capture it)
		this.capturingTimeAcc = 0;			//time accumulated for the occupying team
		this.capturingRate = 0;				//current capturing/reverting rate of the point
		this.capturingRateCoeff = 0;		//1: capturing, -1: reverting, 0: stable

		this.capturingTimeRequired = 5000;	//time required to fully own the point for the occupying team
		this.teamCaptureRates = {};
		this.naturalRevertingRate = 1/4;
		this.isDirty = false;
		this.tempTimer = 0;

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

		var stophere = true;

		//tell the active user agents about it
		// this.gs.globalfuncs.insertTrackedEntityToPlayingUsers(this.gs, "gameobject", this.id);
	}

	

	deactivated() {
		if(this.plBody) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
				
		// var userAgents = this.gs.uam.getUserAgents();
		// for(var i = 0 ; i < userAgents.length; i++) {
		// 	userAgents[i].deleteTrackedEntity("gameobject", this.id);
		// }
	}

	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		this.gs = null;
	}
	
	update(dt) {
		
	}
	
	modCaptureTimeAcc(amount) {
		this.capturingTimeAcc += Math.floor(amount);
		if(this.capturingTimeAcc >= this.capturingTimeRequired) {
			this.capturingTimeAcc = this.capturingTimeRequired;
		} else if (this.capturingTimeAcc <= 0) {
			this.capturingTimeAcc = 0;
		}
	}

	postPhysicsUpdate(dt) {
		var teamsOccupyingPoint = 0;
		var currentTeamIdOccupyingPoint = -1;
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
			} else {
				this.capturingTeamId = -1;
			}
		}

		//determine if its currently being capped or reverted
		if(this.capturingRate === 0 || this.capturingTeamId === -1) {
			this.capturingRateCoeff = 0;
		}
		else {
			this.capturingRateCoeff = currentTeamIdOccupyingPoint === this.capturingTeamId ? 1 : -1;
		}

		//apply cap or revert
		this.modCaptureTimeAcc(dt * this.capturingRate * this.capturingRateCoeff);

		//control point was captured
		if(this.capturingTimeAcc >= this.capturingTimeRequired) {
			this.ownerTeamId = this.capturingTeamId;
			this.capturingTeamId = -1;
			this.capturingTimeAcc = 0;
		}


		//debug report
		this.tempTimer += dt;
		if(this.tempTimer >= 1000){
			this.tempTimer = 0;
			//ownId: -1		capId: 2		timeAcc: 99999		rate: 10		coef: 0
			var report = [
				{"key": "ownId", "val": this.ownerTeamId},
				{"key": "capId", "val": this.capturingTeamId},
				{"key": "timeAcc", "val": this.capturingTimeAcc},
				{"key": "rate", "val": this.capturingRate},
				{"key": "coef", "val": this.capturingRateCoeff}
			];
			
			var caprates = " | ";
			
			for (var teamId in this.teamCaptureRates) {
				if (this.teamCaptureRates.hasOwnProperty(teamId)) {
					caprates += "("+teamId+"):" + this.teamCaptureRates[teamId] + "\t\t";
				}
			}

			console.log("CP Report: " + report.reduce((prev, curr, index) => {return prev + curr.key + ": " + curr.val + "\t\t";}, "") + caprates);
		}
	}

	postWebsocketUpdate() {

	}

	collisionCharacter(c) {
		// console.log("INSIDE HILL CONTROL POINT: collision character.");
		this.teamCaptureRates[c.teamId]++;
		this.isDirty = true;
	}

	endCollisionCharacter(c) {
		// console.log("INSIDE HILL CONTROL POINT END: collision character.");
		this.teamCaptureRates[c.teamId]--;
		this.isDirty = true;
	}




}

exports.ControlPoint = ControlPoint;