const {GlobalFuncs} = require('../global-funcs.js');
const {Team} = require('../classes/team.js');

class TeamManager {
	constructor() {
		this.gs = null;
		this.idCounter = 1;
		this.teamArray = [];
		this.idIndex = {};
		this.isDirty = false;
		this.spectatorTeam = null;
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	createTeam() {
		var t = new Team();

		t.id = this.idCounter;
		this.idCounter++;
		this.teamArray.push(t);
		this.isDirty = true;

		this.updateIndex();
		
		return t;
	}

	//this just marks the player for deletion
	destroyTeam(t) {
		t.deleteMe = true;
		this.isDirty = true;
	}

	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		for(var i = 0; i < this.teamArray.length; i++)
		{
			if(this.teamArray[i])
			{
				this.idIndex[this.teamArray[i].id] = this.teamArray[i];
			}
		}
	}

	update(dt) {
		if(this.isDirty)
		{
			//delete any players that were marked for deletion
			for(var i = this.teamArray.length-1; i >= 0; i--)
			{
				if(this.teamArray[i].deleteMe)
				{
					this.teamArray.splice(i, 1);
				}
			}

			this.updateIndex();
			this.isDirty = false;
		}
	}

	assignSpectatorTeamById(id) {
		var t = this.getTeamByID(id);
		if(t) {
			this.spectatorTeam = t;
		}
	}

	getSpectatorTeam() {
		return this.spectatorTeam;
	}

	getTeams() {
		return this.teamArray;
	}

	getTeamByID(id) {
		if(this.idIndex[id])
		{
			return this.idIndex[id];
		}
		else
		{
			return null;
		}
	}
}

exports.TeamManager = TeamManager;