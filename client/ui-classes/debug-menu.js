import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class DebugMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;

		this.windowsEventMapping = [];
		this.spawnAiButtonTemplate = null;
		this.killRandomAiButtonTemplate = null;
		this.killAllAiButtonTemplate = null;
		this.cbDisplayServerSightlines = null;
		this.cbDisplayServerSightlinesContainer = null;
		this.debugAiContents = null;
		this.aiControlButtons = [];
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-debug-menu',  func: this.toggleMenu.bind(this)},
			{event: 'close-debug-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#debug-menu");
		
		//reset to initial state
		this.menu.addClass("hide");

		//create ai controls
		this.spawnAiButtonTemplate = $("#spawn-ai-button-template");
		this.killAllAiButtonTemplate = $("#kill-all-ai-button-template");
		this.killRandomAiButtonTemplate = $("#kill-random-ai-button-template");
		this.cbDisplayServerSightlines = $("#display-server-sightlines");
		this.cbDisplayServerSightlinesContainer = $("#display-server-sightlines-container");
		
		this.debugAiContents = $("#debug-ai-contents");
	}

	populateAiControls() {
		//create a button for each team
		var teams = this.gc.tm.getTeams();
		var teamsSorted = teams.sort((a, b) => {return a.slotNum - b.slotNum});

		// for(var i = 0; i < teamsSorted.length; i++) {
		// 	//spawn button
		// 	var newSpawnButton = this.spawnAiButtonTemplate.clone();
		// 	newSpawnButton.on("click", this.spawnAiClick.bind(this, teamsSorted[i].serverId));
		// 	newSpawnButton.attr("value", "Spawn AI on " + teamsSorted[i].name);
		// 	newSpawnButton.attr("id", "spawn-ai-team-" + teamsSorted[i].serverId);
		// 	newSpawnButton.removeClass("hide");

		// 	this.debugAiContents.append(newSpawnButton);
		// 	this.aiControlButtons.push(newSpawnButton);

		// 	//kill button
		// 	var newKillButton = this.killAllAiButtonTemplate.clone();
		// 	newKillButton.on("click", this.killAllAiClick.bind(this, teamsSorted[i].serverId));
		// 	newKillButton.attr("value", "Kill All AI on " + teamsSorted[i].name);
		// 	newKillButton.attr("id", "kill-all-ai-team-" + teamsSorted[i].serverId);
		// 	newKillButton.removeClass("hide");

		// 	this.debugAiContents.append(newKillButton);
		// 	this.aiControlButtons.push(newKillButton);

		// 	//kill random button
		// 	var newKillRandomButton = this.killAllAiButtonTemplate.clone();
		// 	newKillRandomButton.on("click", this.killRandomAiClick.bind(this, teamsSorted[i].serverId));
		// 	newKillRandomButton.attr("value", "Kill random AI on " + teamsSorted[i].name);
		// 	newKillRandomButton.attr("id", "kill-random-ai-team-" + teamsSorted[i].serverId);
		// 	newKillRandomButton.removeClass("hide");

		// 	this.debugAiContents.append(newKillRandomButton);
		// 	this.aiControlButtons.push(newKillRandomButton);
		// }


		this.cbDisplayServerSightlinesContainer.removeClass("hide");
		this.cbDisplayServerSightlines.on("click", this.cbDisplayServerSightlinesClick.bind(this))

	}

	clearAiControls() {
		for(var i = 0; i < this.aiControlButtons.length; i++)
		{
			this.aiControlButtons[i].off("click");
			this.aiControlButtons[i].remove()
		}

		this.cbDisplayServerSightlinesContainer.addClass("hide");
		this.cbDisplayServerSightlines.off("click");
	}

	spawnAiClick(teamServerId) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientSpawnAi",
			"teamId": teamServerId
		});
	}
 
	killAllAiClick(teamServerId) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientKillAllAi",
			"teamId": teamServerId
		});
	}

	killRandomAiClick(teamServerId) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientKillRandomAi",
			"teamId": teamServerId
		});
	}

	cbDisplayServerSightlinesClick(e) {
		this.gc.bDisplayServerSightlines = this.cbDisplayServerSightlines[0].checked;
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("debug-menu-opened"));
		}
	}

	openMenu() {
		this.menu.removeClass("hide");		
		this.isVisible = true;
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("debug-menu-closed"));
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}
}