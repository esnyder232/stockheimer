const RoundBaseState = require('./round-base-state.js');
const RoundStarting = require('./round-starting.js');
const RoundMapEnd = require('./round-map-end.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundOver extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "OVER";
		this.roundTimerDefault = 90000;
		this.matchWon = false;
	}
	
	enter(dt) {
		logger.log("info", 'Round over.');
		super.enter(dt);
		
		

		//calculate and send the results to the users
		var winningTeamCsv = "";
		var mvpBestCsv = "";
		var mvpWorstCsv = "";
		var bestMvpsHealsCsv = "";
		var worstMvpsHealsCsv = "";

		var matchWinnerTeamId = "";

		var teams = this.gs.tm.getTeams();
		var spectatorTeamId = this.gs.tm.getSpectatorTeam().id;

		/////////////////////////////////////////////////////////////
		// find the winning team(s)
		//find the team with the highest number of points

		var highestPointTeam = teams.reduce((acc, cur) => {return  acc.roundPoints > cur.roundPoints ? acc : cur})

		//check if there are any other teams that tied with the highest points
		var finalTeamWinnersArray = teams.filter((x) => {return x.roundPoints === highestPointTeam.roundPoints});
		var winningTeamIds = [];

		//get all the winning team's ids (except the spectator team)
		for(var i = 0; i < finalTeamWinnersArray.length; i++) {
			if(finalTeamWinnersArray[i].id !== spectatorTeamId) {
				winningTeamIds.push(finalTeamWinnersArray[i].id);
			}
		}

		//if there is only 1 team, give them a round win
		if(winningTeamIds.length === 1) {
			var team = this.gs.tm.getTeamByID(winningTeamIds[0]);
			if(team !== null) {
				team.modRoundWins(1);
			}
		}
		/////////////////////////////////////////////////////////////

		//check to see if the match was won
		for(var i = 0; i < teams.length; i++) {
			if(!teams[i].isSpectatorTeam) {
				if(teams[i].roundWins >= this.round.gs.matchWinCondition) {
					this.matchWon = true;
					matchWinnerTeamId = teams[i].id;
				}
			}
		}
		
		//reset the timer
		this.round.roundTimeAcc = 0;
		if(this.matchWon) {
			this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundOverWinTimeLength, this.roundTimerDefault);
		}
		else {
			this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundOverTimeLength, this.roundTimerDefault);
		}

		//get MVPs
		var mvpResults = this.round.globalfuncs.getRoundMVPs(this.gs);

		//prepare results for event
		winningTeamCsv = winningTeamIds.join(",");
		mvpBestCsv = mvpResults.bestMvps.join(",");
		mvpWorstCsv = mvpResults.worstMvps.join(",");
		bestMvpsHealsCsv = mvpResults.bestMvpsHeals.join(",");
		worstMvpsHealsCsv = mvpResults.worstMvpsHeals.join(",");

		//finally send the event
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertServerToClientEvent({
				"eventName": "roundResults",
				"winningTeamCsv": winningTeamCsv,
				"mvpBestCsv": mvpBestCsv,
				"bestMvpsHealsCsv": bestMvpsHealsCsv,
				"mvpWorstCsv": mvpWorstCsv,
				"worstMvpsHealsCsv": worstMvpsHealsCsv,
				"matchWon": this.matchWon,
				"matchWinnerTeamId": matchWinnerTeamId
			});
		}
	}

	update(dt) {
		this.round.roundTimeAcc += dt;

		if(this.round.roundTimeAcc >= this.round.roundTimer) {
			var rotateMaps = false;

			if(this.matchWon) {
				this.gs.currentMatch++;
			}

			if(this.matchWon && this.gs.mapTimeLengthReached && this.gs.currentMatch >= this.gs.mapMinMatch) {
				rotateMaps = true;
			}

			//reset the rounds scores ONLY if the match is won and the server is NOT going to rotate maps (we want to show the wins/round points in the user list at the end of the map on the client side)
			if(this.matchWon && !rotateMaps) {
				this.round.roundNum = 0;
				var teams = this.gs.tm.getTeams();
				for(var i = 0; i < teams.length; i++) {
					if(!teams[i].isSpectatorTeam) {
						teams[i].setRoundWins(0);
					}
				}
			}

			if(rotateMaps) {
				this.round.nextState = new RoundMapEnd.RoundMapEnd(this.gs, this.round);
			} else {
				this.round.roundNum++;
				this.round.nextState = new RoundStarting.RoundStarting(this.gs, this.round);
			}
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		//reset all users round points and team round points
		var allUsers = this.gs.um.getUsers();
		var teams = this.gs.tm.getTeams();

		for(var i = 0; i < allUsers.length; i++) {
			allUsers[i].resetRoundCounts();
		}

		for(var i = 0; i < teams.length; i++) {
			teams[i].setRoundPoints(0);
		}
	}
}



exports.RoundOver = RoundOver;
