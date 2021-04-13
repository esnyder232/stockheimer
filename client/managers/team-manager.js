import GlobalFuncs from "../global-funcs.js";
import Team from "../classes/team.js";

export default class TeamManager {
	constructor() {
		this.gc = null;
		this.idCounter = 1;
		this.teamArray = [];
		this.idIndex = {};
		this.serverIdClientIdMap = {};
		this.isDirty = false;
		this.spectatorTeam = null;
	}

	init(gameClient) {
		this.gc = gameClient;
	}

	createTeam(serverId) {
		var o = new Team();

		o.id = this.idCounter;
		this.idCounter++;
		this.teamArray.push(o);
		this.isDirty = true;

		if(serverId !== undefined)
		{
			o.serverId = serverId
		}

		this.updateIndex();
		
		return o;
	}

	//this just marks the team for deletion
	destroyTeam(id) {
		var t = this.getTeamByID(id);
		if(t !== null)
		{
			t.deleteMe = true;
			this.isDirty = true;
		}
	}

	destroyTeamServerId(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			this.destroyTeam(this.serverIdClientIdMap[serverId]);
		}
	}


	updateIndex() {
		//just rebuild the index for now
		this.idIndex = {};
		this.serverIdClientIdMap = {};
		for(var i = 0; i < this.teamArray.length; i++)
		{
			if(this.teamArray[i])
			{
				this.idIndex[this.teamArray[i].id] = this.teamArray[i];
				
				if(this.teamArray[i].serverId !== null)
				{
					this.serverIdClientIdMap[this.teamArray[i].serverId] = this.teamArray[i].id;
				}
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

	getTeamByServerID(serverId) {
		if(this.serverIdClientIdMap[serverId] !== undefined)
		{
			return this.getTeamByID(this.serverIdClientIdMap[serverId]);
		}
		else 
		{
			return null;
		}
	}

	assignSpectatorTeamByServerId(serverId) {
		var t = this.getTeamByServerID(serverId);
		if(t) {
			this.spectatorTeam = t;
		}
	}

	getSpectatorTeam() {
		return this.spectatorTeam;
	}
}
