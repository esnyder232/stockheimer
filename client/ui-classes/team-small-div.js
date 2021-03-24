import $ from "jquery"

export default class TeamSmallDiv {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;

		this.teamSmallDiv = null;
		this.teamButtonContainer = null;
		this.joinTeamButtonTemplate = null;

		this.joinTeamButtonArray = [];
	}

	init(gc) {
		this.gc = gc;
	}

	activate() {
		//grab all the ui elements
		this.teamSmallDiv = $("#team-small-div");
		this.teamButtonContainer = $("#team-button-container");
		this.joinTeamButtonTemplate = $("#join-team-buttom-template");

		//create a button for each team
		var teams = this.gc.tm.getTeams();
		var teamsSorted = teams.sort((a, b) => {return a.slotNum - b.slotNum});

		for(var i = 0; i < teamsSorted.length; i++) {
			var newButton = this.joinTeamButtonTemplate.clone();
			newButton.on("click", this.joinTeamClick.bind(this, teamsSorted[i].slotNum));
			newButton.attr("value", teamsSorted[i].name);
			newButton.attr("id", "join-team-button-" + teamsSorted[i].id);
			newButton.removeClass("hide");

			this.teamButtonContainer.append(newButton);
			this.joinTeamButtonArray.push(newButton);
		}
	}

	joinTeamClick(slotNum) {
		console.log('team aguiowhliugera');
		console.log('team id clicked ' + slotNum);
		
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientJoinTeam",
			"slotNum": slotNum
		});
	}
	
	deactivate() {
		

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