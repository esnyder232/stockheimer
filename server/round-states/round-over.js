const {RoundBaseState} = require('./round-base-state.js');
const RoundStarting = require('./round-starting.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundOver extends RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "OVER";
	}
	
	enter(dt) {
		logger.log("info", 'Round over.');
		super.enter(dt);
		this.round.roundTimeAcc = 0;
		this.round.roundTimer = 10000;

		//calculate and send the results to the users
		var winningTeamCsv = "";
		var mvpBestCsv = "";
		var mvpWorstCsv = "";
		var mvpNumberUsers = 3;

		var teams = this.gs.tm.getTeams();
		var spectatorTeamId = this.gs.tm.getSpectatorTeam().id;
		var activeUsers = this.gs.um.getActiveUsers();

		////////////////////////////////////////
		// find the winning team(s)
		//find the team with the highest number of points

		var highestPointTeam = teams.reduce((acc, cur) => {return  acc.roundPoints > cur.roundPoints ? acc : cur})

		//check if there are any other teams that tied with the highest points
		var finalTeamWinnersArray = teams.filter((x) => {return x.roundPoints === highestPointTeam.roundPoints});
		var finalTeamWinnersIds = [];

		//get all the winning team's ids (except the spectator team)
		for(var i = 0; i < finalTeamWinnersArray.length; i++) {
			if(finalTeamWinnersArray[i].id !== spectatorTeamId) {
				finalTeamWinnersIds.push(finalTeamWinnersArray[i].id);
			}
		}

		winningTeamCsv = finalTeamWinnersIds.join(",");
		////////////////////////////////////////

		////////////////////////////////////////
		// find the best MVPs in the round - for now, people with the most points, then least deaths
		var userCandidates = [];

		//first filter the users out to not include spectators
		for(var i = 0; i < activeUsers.length; i++) {
			if(activeUsers[i].teamId !== spectatorTeamId) {
				userCandidates.push({
					id: activeUsers[i].id,
					points: activeUsers[i].roundUserKillCount,
					deaths: activeUsers[i].roundUserDeathCount
				})
			}
		}

		//second, sort by points desc, then deaths asc
		userCandidates.sort((a, b) => {return b.points - a.points || a.deaths - b.deaths});

		//third concatenate the top user ids for the event
		var finalNumUsers = userCandidates.length < mvpNumberUsers ? userCandidates.length : mvpNumberUsers;
		var finalMvpBestIds = [];
		for(var i = 0; i < finalNumUsers; i++) {
			finalMvpBestIds.push(userCandidates[i].id)
		}

		mvpBestCsv = finalMvpBestIds.join(",");
		////////////////////////////////////////


		////////////////////////////////////////
		// find the worst MVPs in the round - for now, people with the least points, then most deaths
		var worstUserCandidates = [];

		//first filter the users out to not include spectators AND if they are not included already in the best mvp list
		for(var i = 0; i < activeUsers.length; i++) {
			if(activeUsers[i].teamId !== spectatorTeamId) {
				var existingMvpIndex = finalMvpBestIds.findIndex((x) => {return x === activeUsers[i].id});
				if(existingMvpIndex < 0) {
					worstUserCandidates.push({
						id: activeUsers[i].id,
						points: activeUsers[i].roundUserKillCount,
						deaths: activeUsers[i].roundUserDeathCount
					})
				}
			}
		}

		//second, sort by points asc, then deaths desc
		worstUserCandidates.sort((a, b) => {return a.points - b.points || b.deaths - a.deaths});

		//third concatenate the top user ids for the event
		finalNumUsers = worstUserCandidates.length < mvpNumberUsers ? worstUserCandidates.length : mvpNumberUsers;
		var finalMvpWrostIds = [];
		for(var i = 0; i < finalNumUsers; i++) {
			finalMvpWrostIds.push(worstUserCandidates[i].id)
		}

		mvpWorstCsv = finalMvpWrostIds.join(",");
		////////////////////////////////////////



		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertServerToClientEvent({
				"eventName": "roundResults",
				"winningTeamCsv": winningTeamCsv,
				"mvpBestCsv": mvpBestCsv,
				"mvpWorstCsv": mvpWorstCsv
			});
		}
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer)
		{
			this.round.nextState = new RoundStarting.RoundStarting(this.gs, this.round);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		//tell all active users the round is restarting. Let them sort themselves out.
		this.round.em.emitEvent("round-restarting");
		
	}
}



exports.RoundOver = RoundOver;
