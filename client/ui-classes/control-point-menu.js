import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class ControlPointMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.windowsEventMapping = [];
		this.controlPointsMap = {};	//key: serverId of the control point, val: obj containing information and jquery objects for the control point
		this.teamObjMap = {}; //key: serverId of team, val: obj containing team information, like colors

		this.menu = null;
		this.controlPointsContainer = null;
		this.controlPointItemTemplate = null;
		this.controlPointNotification = null;
		this.controlPointCurrentlyOn = null;

		this.internalSampleTimer = 100; //sample timer so i don't run jquery 60 times a second
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'control-point-activated', func: this.controlPointActivated.bind(this)},
			{event: 'control-point-deactivated', func: this.controlPointDeactivated.bind(this)},
			{event: 'control-point-updated', func: this.controlPointUpdated.bind(this)},
			{event: 'character-on-control-point', func: this.characterOnControlPoint.bind(this)},
			{event: 'character-off-control-point', func: this.characterOffControlPoint.bind(this)},
			{event: 'resize', func: this.resizeEvent.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#control-point-menu");
		this.controlPointItemTemplate = $("#control-point-item-template");
		this.controlPointsContainer = $("#control-point-container");
		this.controlPointNotification = $("#control-point-notification");

		//get team information
		var allTeams = this.gc.tm.getTeams();
		for(var i = 0; i < allTeams.length; i++) {
			if(!allTeams[i].isSpectatorTeam) {
				this.teamObjMap[allTeams[i].serverId] = {
					controlPointOwnerColor: allTeams[i].controlPointOwnerColor,
					controlPointCaptureColor: allTeams[i].controlPointCaptureColor
				}
			}
		}

		//fill in the default colors for when no team owns the point
		this.teamObjMap[0] = {
			controlPointOwnerColor: "#cccccc",
			controlPointCaptureColor: "#000000"
		}

		this.controlPointNotification.addClass("hide");
		this.controlPointCurrentlyOn = null;
	}

	controlPointActivated(e) {
		var cp = this.gc.gom.getGameObjectByServerID(e.detail.serverId);
		if(cp !== null) {
			var cpObj = this.controlPointsMap[e.detail.serverId];
			if(cpObj === undefined) {
				cpObj = this.addControlPointContents(cp, e.detail.serverId);
			}

			cpObj.ownerTeamId = cp.ownerTeamId;
			cpObj.capturingTeamId = cp.capturingTeamId;
			cpObj.capturingTimeAcc = cp.capturingTimeAcc;
			cpObj.capturingRate = cp.capturingRate;
			cpObj.capturingRateCoeff = cp.capturingRateCoeff;
			cpObj.capturingTimeRequired = cp.capturingTimeRequired;
			
			this.redrawControlPoint(cpObj);
		}
	}

	controlPointUpdated(e) {
		var cpObj = this.controlPointsMap[e.detail.serverId];
		if(cpObj !== undefined) {
			this.updateCpObj(cpObj);
			this.redrawControlPoint(cpObj);
		}
	}

	controlPointDeactivated(e) {
		if(this.controlPointsMap[e.detail.serverId] !== undefined) {
			this.removeControlPointContents(this.controlPointsMap[e.detail.serverId]);
			if(this.controlPointCurrentlyOn === e.detail.serverId) {
				this.controlPointCurrentlyOn = null;
				this.redrawControlPointNotification();
			}
		}
	}

	addControlPointContents(cp, serverId) {
		var newCp = this.controlPointItemTemplate.clone()
		newCp.removeAttr("id");
		newCp.removeClass("hide");
		
		var cpObj = {
			serverId: serverId,
			cpContents: newCp[0],
			cpRef: cp,
			divText: newCp.find("div[name='control-point-progress-text']")[0],
			divFiller: newCp.find("div[name='control-point-progress-filler']")[0],
			ownerTeamId: 0,
			capturingTeamId: 0,
			capturingTimeAcc: 0,
			capturingRate: 0,
			capturingRateCoeff: 0,
			capturingTimeRequired: 0
		};

		this.controlPointsMap[cpObj.serverId] = cpObj;
		this.controlPointsContainer.append(cpObj.cpContents);

		return cpObj;
	}



	removeControlPointContents(cpObj) {
		cpObj.divFiller.parentNode.removeChild(cpObj.divFiller);
		cpObj.divText.parentNode.removeChild(cpObj.divText);
		cpObj.cpContents.parentNode.removeChild(cpObj.cpContents);

		cpObj.cpContents = null;
		cpObj.divText = null;
		cpObj.divFiller = null;
		cpObj.cpRef = null;
		
		delete this.controlPointsMap[cpObj.serverId];
	}

	updateCpObj(cpObj) {
		cpObj.ownerTeamId = cpObj.cpRef.ownerTeamId;
		cpObj.capturingTeamId = cpObj.cpRef.capturingTeamId;
		cpObj.capturingTimeAcc = cpObj.cpRef.capturingTimeAcc;
		cpObj.capturingRate = Math.round(cpObj.cpRef.capturingRate);
		cpObj.capturingRateCoeff = cpObj.cpRef.capturingRateCoeff;
	}


	redrawControlPoint(cpObj) {
		var ownerTeamColor = this.teamObjMap[cpObj.ownerTeamId] !== undefined ? this.teamObjMap[cpObj.ownerTeamId].controlPointOwnerColor : "#cccccc";
		var capturingTeamColor = this.teamObjMap[cpObj.capturingTeamId] !== undefined ? this.teamObjMap[cpObj.capturingTeamId].controlPointCaptureColor : "#999999";

		//owner border
		cpObj.cpContents.style.borderColor = ownerTeamColor;

		//filler color
		cpObj.divFiller.style.backgroundColor = capturingTeamColor;

		//filler width
		var w = this.globalfuncs.clamp(Math.round(cpObj.capturingTimeAcc/cpObj.capturingTimeRequired * 100), 0, 100);
		cpObj.divFiller.style.width = w + "%";

		//cp text
		var capRateFloored = Math.floor(cpObj.capturingRate);
		var capRateText = capRateFloored === 0 ? "" : "x" + capRateFloored.toString().padStart(2, " ");
		cpObj.divText.textContent = capRateText;
	}

	characterOnControlPoint(e) {
		if(this.controlPointsMap[e.detail.serverId] !== undefined) {
			this.controlPointCurrentlyOn = e.detail.serverId;
			this.redrawControlPointNotification();
		}
	}

	characterOffControlPoint(e) {
		this.controlPointCurrentlyOn = null;
		this.redrawControlPointNotification();
	}


	redrawControlPointNotification() {
		var cpObj = this.controlPointsMap[this.controlPointCurrentlyOn];
		if(cpObj !== undefined) {
			this.controlPointNotification.removeClass("hide");
			var cpMenuHeight = this.menu.height();
			var cpOffsetLeft = cpObj.cpContents.offsetLeft;
			var notOuterWidth = this.controlPointNotification.outerWidth();
			var cpOuterWidth = cpObj.cpContents.offsetWidth;
			
			this.controlPointNotification.css("bottom", cpMenuHeight + 25 + "px");
			this.controlPointNotification.css("left", cpOffsetLeft - (notOuterWidth/2) + (cpOuterWidth/2) + "px");
		} else {
			this.controlPointNotification.addClass("hide");
		}

	}

	resizeEvent(e) {
		this.redrawControlPointNotification();
	}


	update(dt) {
		
		this.internalSampleTimer -= dt;
		if(this.internalSampleTimer <= 0) {
			// console.log("updating control point menu")
			
			for(var key in this.controlPointsMap) {
				if (this.controlPointsMap.hasOwnProperty(key)) {
					this.updateCpObj(this.controlPointsMap[key]);
					this.redrawControlPoint(this.controlPointsMap[key]);
				}
			}

			this.internalSampleTimer = 100;
		}
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}


}