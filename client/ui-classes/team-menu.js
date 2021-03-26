import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class TeamMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;
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
			{event: 'toggle-team-menu', func: this.toggleMenu.bind(this)},
			{event: 'close-team-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#team-menu");
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

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("team-menu-opened"));
		}
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("team-menu-closed"));
		this.isVisible = false;
	}

	openMenu() {
		if(this.gc.mainScene !== null)
		{
			this.gc.mainScene.closeMenuGroup();
		}
		this.menu.removeClass("hide");
		this.isVisible = true;
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