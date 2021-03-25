import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class TeamSmallDiv {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;

		this.teamSmallDiv = null;
		this.teamButtonContainer = null;
		this.joinTeamButtonTemplate = null;

		this.joinTeamButtonArray = [];
		this.windowsEventMapping = [];
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'close-team-small-div', func: this.closeTeamSmallDiv.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.teamSmallDiv = $("#team-small-div");
		this.teamButtonContainer = $("#team-button-container");
		this.joinTeamButtonTemplate = $("#join-team-buttom-template");

		//create a button for each team
		var teams = this.gc.tm.getTeams();
		var teamsSorted = teams.sort((a, b) => {return a.slotNum - b.slotNum});

		for(var i = 0; i < teamsSorted.length; i++) {
			var newButton = this.joinTeamButtonTemplate.clone();
			newButton.on("click", this.joinTeamClick.bind(this, teamsSorted[i].serverId));
			newButton.attr("value", teamsSorted[i].name);
			newButton.attr("id", "join-team-button-" + teamsSorted[i].serverId);
			newButton.removeClass("hide");

			this.teamButtonContainer.append(newButton);
			this.joinTeamButtonArray.push(newButton);
		}
	}

	joinTeamClick(serverId) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientJoinTeam",
			"teamId": serverId
		});
	}

	closeTeamSmallDiv() {
		this.teamSmallDiv.addClass("hide");
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		for(var i = 0; i < this.joinTeamButtonArray.length; i++)
		{
			this.joinTeamButtonArray[i].off("click");
			this.joinTeamButtonArray[i].remove()
		}
	}

	deinit() {
		this.reset();
	}


}