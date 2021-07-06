import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class CharacterClassMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;
		this.characterClassButtonContainer = null;
		this.characterClassButtonTemplate = null;

		this.characterClassButtonArray = [];
		this.windowsEventMapping = [];
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-character-class-menu', func: this.toggleMenu.bind(this)},
			{event: 'close-character-class-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#character-class-menu");
		this.characterClassButtonContainer = $("#character-class-button-container");
		this.characterClassButtonTemplate = $("#character-class-buttom-template");

		//create a button for each class
		var classes = this.gc.rm.getResourceByType("character-class");
		var classesSorted = classes.sort((a, b) => {return a.serverId - b.serverId});

		for(var i = 0; i < classesSorted.length; i++) {
			var newButton = this.characterClassButtonTemplate.clone();
			newButton.on("click", this.characterClassClick.bind(this, classesSorted[i].serverId));
			newButton.attr("value", classesSorted[i].data.name);
			newButton.attr("id", "character-class-button-" + classesSorted[i].serverId);
			newButton.removeClass("hide");

			this.characterClassButtonContainer.append(newButton);
			this.characterClassButtonArray.push(newButton);
		}

		//reset to initial state
		var showCharacterClassMenu = false;
		this.menu.addClass("hide");

		// //if the user has a team but not a class selected, show the team menu so they can pick a team
		// if(this.gc.myUser !== null) {
		// 	var spectatorTeam = this.gc.tm.getSpectatorTeam();

		// 	//make sure they are on a a team
		// 	if(spectatorTeam !== null && this.gc.myUser.teamId !== spectatorTeam.serverId) {
		// 		//check if they have a character class selected
		// 		if(this.gc.myUser.characterClassResourceId !== null) {
		// 			showCharacterClassMenu = true;
		// 		}
		// 	}
		// }

		// if(showCharacterClassMenu) {
		// 	this.menu.removeClass("hide");
		// }
		// else {
		// 	this.menu.addClass("hide");
		// }
	}

	characterClassClick(serverId) {
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientChangeClass",
			"characterClassResourceId": serverId
		});

		this.closeMenu();
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("character-class-menu-opened"));
		}
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("character-class-menu-closed"));
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

		for(var i = 0; i < this.characterClassButtonArray.length; i++) {
			this.characterClassButtonArray[i].off("click");
			this.characterClassButtonArray[i].remove()
		}
	}

	deinit() {
		this.reset();
	}


}