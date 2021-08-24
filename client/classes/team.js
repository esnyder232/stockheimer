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
		this.characterPrimaryColor = "#ffffffff";
		this.characterPrimaryColorReplace = "#ffffffff";
		this.characterSecondaryColor = "#ffffffff";
		this.characterSecondaryColorReplace = "#ffffffff";
		this.projectileColor1 = "#ffffffff";
		this.projectileColor1Replace = "#ffffffff";
		this.projectileColor2 = "#ffffffff";
		this.projectileColor2Replace = "#ffffffff";
		this.projectileColor3 = "#ffffffff";
		this.projectileColor3Replace = "#ffffffff";
		this.projectileColor4 = "#ffffffff";
		this.projectileColor4Replace = "#ffffffff";

		this.phaserCharacterFillColor = 0xffffff;
		this.phaserCharacterStrokeColor = 0xffffff;
		this.phaserProjectileStrokeColor = 0x000000;
		this.phaserCharacterTintColor = 0xffffff;
		this.phaserCharacterPrimaryColor = 0xFFFFFFFF;
		this.phaserCharacterPrimaryColorReplace = 0xFFFFFFFF;
		this.phaserCharacterSecondaryColor = 0xFFFFFFFF;
		this.phaserCharacterSecondaryColorReplace = 0xFFFFFFFF;

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
		this.destroyProjectileShader();
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

	//Wow look at that...your SOOO good at programming. And all by yourself? Good job!!!
	changeCharacterFillColor(newColor) {
		this.characterFillColor = newColor;
		this.phaserCharacterFillColor = Number.parseInt(this.getColorNumbers(this.characterFillColor), 16);
	}

	changeCharacterStrokeColor(newColor) {
		this.characterStrokeColor = newColor;
		this.phaserCharacterStrokeColor = Number.parseInt(this.getColorNumbers(this.characterStrokeColor), 16);
	}

	changeProjectileStrokeColor(newColor) {
		this.projectileStrokeColor = newColor;
		this.phaserProjectileStrokeColor = Number.parseInt(this.getColorNumbers(this.projectileStrokeColor), 16);
	}

	changeCharacterTintColor(newColor) {
		this.characterTintColor = newColor;
		this.phaserCharacterTintColor = Number.parseInt(this.getColorNumbers(this.characterTintColor), 16);
	}

	changeCharacterPrimaryColor(newColor) {
		this.characterPrimaryColor = newColor;
		this.phaserCharacterPrimaryColor = Number.parseInt(this.getColorNumbers(this.characterPrimaryColor), 16);
	}

	changeCharacterPrimaryColorReplace(newColor) {
		this.characterPrimaryColorReplace = newColor;
		this.phaserCharacterPrimaryColorReplace = Number.parseInt(this.getColorNumbers(this.characterPrimaryColorReplace), 16);
	}

	changeCharacterSecondaryColor(newColor) {
		this.characterSecondaryColor = newColor;
		this.phaserCharacterSecondaryColor = Number.parseInt(this.getColorNumbers(this.characterSecondaryColor), 16);
	}

	changeCharacterSecondaryColorReplace(newColor) {
		this.characterSecondaryColorReplace = newColor;
		this.phaserCharacterSecondaryColorReplace = Number.parseInt(this.getColorNumbers(this.characterSecondaryColorReplace), 16);
	}

	getColorNumbers(color) {
		if(color[0] === "#")
		{
			color = color.slice(1, color.length);
		}

		return color;
	}

	//classes/interface just don't exist in my mind at this point in time.
	//colorString needs to be like "#FFFFFF" or "#FFFFFFFF".
	//This is very hacky and shitty.
	getRGBA(colorString) {
		var rgba = {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		}
		var temp = this.getColorNumbers(colorString);

		//its in the form RGB ("#FFFFFF").
		//Tack on the alpha at the end to make things more complete. Assume its 255.
		if(temp.length <= 6) {
			temp += "FF";
		}

		var hex = Number.parseInt(temp, 16);

		rgba.a = 0xFF & (hex);
		rgba.b = 0xFF & (hex >> 8);
		rgba.g = 0xFF & (hex >> 16);
		rgba.r = 0xFF & (hex >> 24);

		return rgba;
	}

	createTeamShader() {
		this.teamShaderKey = this.name + "-" + this.serverId;

		//Creates a phaser PostFXPipeline class dynamically. Not an instance, just the class definition itself.
		//This is necessary to have dynamic glsl shader code AND work with phaser's post fx pipeline architecture stuff.
		//...so fucking stupid...
		function TeamShaderClassGenerator(gameClient, team) {
			var testGlsl = $("#team-shader").text();
			var teamPrimaryColor = team.getRGBA(team.characterPrimaryColor);
			var teamPrimaryColorReplace = team.getRGBA(team.characterPrimaryColorReplace);
			var teamSecondaryColor = team.getRGBA(team.characterSecondaryColor);
			var teamSecondaryColorReplace = team.getRGBA(team.characterSecondaryColorReplace);

			// console.log("+++++++++++++++++REVIEW COLORS: +++++++++++++++++")
			// console.log(teamPrimaryColor);
			// console.log(teamPrimaryColorReplace);
			// console.log(teamSecondaryColor);
			// console.log(teamSecondaryColorReplace);
			// console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++");

			//build out the team shader with custom color replacement
			var teampPrimaryColorVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(teamPrimaryColor.r, teamPrimaryColor.g, teamPrimaryColor.b, teamPrimaryColor.a);
			var teamPrimaryColorReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(teamPrimaryColorReplace.r, teamPrimaryColorReplace.g, teamPrimaryColorReplace.b, teamPrimaryColorReplace.a);
			var teamSecondaryColorVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(teamSecondaryColor.r, teamSecondaryColor.g, teamSecondaryColor.b, teamSecondaryColor.a);
			var teamSecondaryColorReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(teamSecondaryColorReplace.r, teamSecondaryColorReplace.g, teamSecondaryColorReplace.b, teamSecondaryColorReplace.a);

			//finally reaplce the shader stubs with the vec4 colors
			testGlsl = testGlsl.replace("#primaryColorToReplace#", teampPrimaryColorVec4);
			testGlsl = testGlsl.replace("#primaryColorNewColor#", teamPrimaryColorReplaceVec4);
			testGlsl = testGlsl.replace("#secondaryColorToReplace#", teamSecondaryColorVec4);
			testGlsl = testGlsl.replace("#secondaryColorNewColor#", teamSecondaryColorReplaceVec4);

			return class TeamShader extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
				constructor(game) {
					 super({
						"game": game,
						"name": team.teamShaderKey,
						"fragShader": testGlsl,
						uniforms: [
							'uMainSampler',
							'uTime',
							'uSpeed'
						]
					});
				}
			}
		};
		
		this.gc.resourceLoadingScene.renderer.pipelines.addPostPipeline(this.teamShaderKey, TeamShaderClassGenerator(this.gc, this));
	}

	destroyTeamShader() {
		this.gc.resourceLoadingScene.renderer.pipelines.remove(this.teamShaderKey, true, true);
	}

	createProjectileShader() {
		this.projectileShaderKey = this.name + "-projectile-" + this.serverId;

		var CustomPipeline = new Phaser.Class({
			Extends: Phaser.Renderer.WebGL.Pipelines.SinglePipeline,
			initialize:

			function CustomPipeline (game, gameClient, team)
			{
				var testGlsl = $("#projectile-shader").text();
				var projectileColor1 = team.getRGBA(team.projectileColor1);
				var projectileColor1Replace = team.getRGBA(team.projectileColor1Replace);
				var projectileColor2 = team.getRGBA(team.projectileColor2);
				var projectileColor2Replace = team.getRGBA(team.projectileColor2Replace);
				var projectileColor3 = team.getRGBA(team.projectileColor3);
				var projectileColor3Replace = team.getRGBA(team.projectileColor3Replace);
				var projectileColor4 = team.getRGBA(team.projectileColor4);
				var projectileColor4Replace = team.getRGBA(team.projectileColor4Replace);
	
				// console.log("+++++++++++++++++REVIEW COLORS: +++++++++++++++++")
				// console.log(teamPrimaryColor);
				// console.log(teamPrimaryColorReplace);
				// console.log(teamSecondaryColor);
				// console.log(teamSecondaryColorReplace);
				// console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++");
	
				//build out the team shader with custom color replacement
				var projectileColor1Vec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor1.r, projectileColor1.g, projectileColor1.b, projectileColor1.a);
				var projectileColor1ReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor1Replace.r, projectileColor1Replace.g, projectileColor1Replace.b, projectileColor1Replace.a);
				var projectileColor2Vec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor2.r, projectileColor2.g, projectileColor2.b, projectileColor2.a);
				var projectileColor2ReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor2Replace.r, projectileColor2Replace.g, projectileColor2Replace.b, projectileColor2Replace.a);
				var projectileColor3Vec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor3.r, projectileColor3.g, projectileColor3.b, projectileColor3.a);
				var projectileColor3ReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor3Replace.r, projectileColor3Replace.g, projectileColor3Replace.b, projectileColor3Replace.a);
				var projectileColor4Vec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor4.r, projectileColor4.g, projectileColor4.b, projectileColor4.a);
				var projectileColor4ReplaceVec4 = gameClient.globalfuncs.glslBuildVec4RGBA(projectileColor4Replace.r, projectileColor4Replace.g, projectileColor4Replace.b, projectileColor4Replace.a);
	
				//finally reaplce the shader stubs with the vec4 colors
				testGlsl = testGlsl.replace("#color1ToReplace#", projectileColor1Vec4);
				testGlsl = testGlsl.replace("#color1NewColor#", projectileColor1ReplaceVec4);
				testGlsl = testGlsl.replace("#color2ToReplace#", projectileColor2Vec4);
				testGlsl = testGlsl.replace("#color2NewColor#", projectileColor2ReplaceVec4);
				testGlsl = testGlsl.replace("#color3ToReplace#", projectileColor3Vec4);
				testGlsl = testGlsl.replace("#color3NewColor#", projectileColor3ReplaceVec4);
				testGlsl = testGlsl.replace("#color4ToReplace#", projectileColor4Vec4);
				testGlsl = testGlsl.replace("#color4NewColor#", projectileColor4ReplaceVec4);
	
				Phaser.Renderer.WebGL.Pipelines.SinglePipeline.call(this, {
					game: game,
					fragShader: testGlsl,
					uniforms: [
						'uProjectionMatrix',
						'uViewMatrix',
						'uModelMatrix',
						'uMainSampler',
						'uResolution',
						'uTime'
					]
				});
			}
		});

		this.customPipeline = this.gc.resourceLoadingScene.renderer.pipelines.add(this.projectileShaderKey, new CustomPipeline(this.gc.phaserGame, this.gc, this));
	}

	destroyProjectileShader() {
		this.gc.resourceLoadingScene.renderer.pipelines.remove(this.projectileShaderKey, true);
	}
}