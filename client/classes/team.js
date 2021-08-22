import GlobalFuncs from "../global-funcs.js";
import ServerEventQueue from "./server-event-queue.js";
import $ from "jquery"

export default class Team {
	constructor() {
		this.id = null;
		this.serverId = null;
		this.seq = null;
		this.gc = null;
		this.slotNum = null;
		this.name = "??? team";
		this.globalfuncs = null;
		this.isSpectatorTeam = false;
		this.roundPoints = 0;

		this.characterStrokeColor = "#ffffff";
		this.characterFillColor = "#ffffff";
		this.characterTextStrokeColor = "#ffffff";
		this.characterTextFillColor = "#ffffff";
		this.killFeedTextColor = "#ffffff";
		this.projectileStrokeColor = "#000000";
		this.characterTintColor = "#ffffff";

		this.phaserCharacterFillColor = 0xffffff;
		this.phaserCharacterStrokeColor = 0xffffff;
		this.phaserProjectileStrokeColor = 0x000000;
		this.phaserCharacterTintColor = 0xffffff;

		this.teamShaderKey = "";
		
		this.serverEventMapping = {
			"updateTeam": this.updateTeamEvent.bind(this)
		}
	}

	teamInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();

		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);
	}

	deinit() {
		this.destroyTeamShader();
		this.gc = null;
		this.globalfuncs = null;
		

		this.seq.batchUnregisterFromEvent(this.serverEventMapping);
		this.seq.deinit();
		this.seq = null;
	}

	update() {
		this.seq.processOrderedEvents();
		this.seq.processEvents();
	}

	updateTeamEvent(e) {
		this.roundPoints = e.roundPoints;
		
		window.dispatchEvent(new CustomEvent("team-points-updated", {detail: {serverId: this.serverId}}));
	}

	changeCharacterFillColor(newColor) {
		this.characterFillColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserCharacterFillColor = Number.parseInt(newColor, 16);
	}

	changeCharacterStrokeColor(newColor) {
		this.characterStrokeColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserCharacterStrokeColor = Number.parseInt(newColor, 16);
	}

	changeProjectileStrokeColor(newColor) {
		this.projectileStrokeColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserProjectileStrokeColor = Number.parseInt(newColor, 16);
	}


	changeCharacterTintColor(newColor) {
		this.characterTintColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserCharacterTintColor = Number.parseInt(newColor, 16);
	}

	createTeamShader() {
		// this.teamShaderKey = this.name + "-" + this.serverId;

		// var CustomPipeline = new Phaser.Class({

		// 	Extends: Phaser.Renderer.WebGL.Pipelines.SinglePipeline,
		
		// 	initialize:
		
		// 	function CustomPipeline (game)
		// 	{
		// 		var testGlsl = $("#team-shader").text();
		// 		console.log("inside custom pipeline");
		// 		console.log(testGlsl);
		// 		Phaser.Renderer.WebGL.Pipelines.SinglePipeline.call(this, {
		// 			game: game,
		// 			fragShader: testGlsl,
		// 			uniforms: [
		// 				'uProjectionMatrix',
		// 				'uViewMatrix',
		// 				'uModelMatrix',
		// 				'uMainSampler',
		// 				'uResolution',
		// 				'uTime'
		// 			]
		// 		});
		// 	}
		// });
		
		// this.customPipeline = this.gc.resourceLoadingScene.renderer.pipelines.add(this.teamShaderKey, new CustomPipeline(this.gc.phaserGame));
	}

	destroyTeamShader() {
		// this.gc.resourceLoadingScene.renderer.pipelines.remove(this.teamShaderKey, true);
	}

}


