const RoundBaseState = require('./round-base-state.js');
const RoundStarting = require('./round-starting.js');

const RoundMapEnd = require('./round-map-end.js');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundOverElimination extends RoundBaseState.RoundBaseState {
	constructor(gs, round) {
		super(gs, round);
		this.stateName = "OVER";
		this.roundTimerDefault = 90000;
		this.matchWon = false;
	}
	
	enter(dt) {
		logger.log("info", 'Round over.');
		super.enter(dt);

		var winningTeamCsv = "";
		var mvpBestCsv = "";
		var mvpWorstCsv = "";
		var matchWinnerTeamId = "";
		var bestMvpsHealsCsv = "";
		var worstMvpsHealsCsv = "";

		/////////////////////////////////////////////////////////////
		// find winners
		var winningTeamIds = [];
		var userAliveSummary = this.gs.um.getUserAliveSummary();

		//sort by users alive desc, hpAverage desc
		userAliveSummary.teamArray.sort((a, b) => {return b.usersAlive - a.usersAlive || b.hpAverage - a.hpAverage});

		var teamsAlive = 0;
		for(var i = 0; i < userAliveSummary.teamArray.length; i++) {
			if(userAliveSummary.teamArray[i].usersAlive > 0) {
				teamsAlive++;
			}
		}

		//if only team is left alive, they are the winnner
		if(teamsAlive === 1) {
			winningTeamIds.push(userAliveSummary.teamArray[0].teamId);
		}
		//if more than one team is alive, find the teams with the highest hpAverage
		else if(teamsAlive > 1) {
			//the first team in the list has the highest hpAverage (sorted previously)
			winningTeamIds.push(userAliveSummary.teamArray[0].teamId);
			
			var highestHpAverage = userAliveSummary.teamArray[0].hpAverage;
			var smallestDelta = 0.000001;

			//find if any subsequent teams in the list have the same hpAverage
			//i=1 to skip the first team
			for(var i = 1; i < userAliveSummary.teamArray.length; i++) {
				if(Math.abs(userAliveSummary.teamArray[i].hpAverage - highestHpAverage) < smallestDelta) {
					winningTeamIds.push(userAliveSummary.teamArray[i].teamId);
				} else {
					break;
				}
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
		var teams = this.gs.tm.getTeams();
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
			//reset the round num and team wins
			if(this.matchWon && !this.gs.rotateMapAfterCurrentRound) {
				this.round.roundNum = 0;
				var teams = this.gs.tm.getTeams();
				for(var i = 0; i < teams.length; i++) {
					if(!teams[i].isSpectatorTeam) {
						teams[i].setRoundWins(0)
					}
				}
			}
			
			//see if a map rotation needs to occur
			if(this.matchWon && this.gs.rotateMapAfterCurrentRound) {
				this.round.nextState = new RoundMapEnd.RoundMapEnd(this.gs, this.round);
			} else {
				//increase the round count
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



exports.RoundOverElimination = RoundOverElimination;
