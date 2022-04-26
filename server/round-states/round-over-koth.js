const RoundBaseState = require('./round-base-state.js');
const RoundStartingKoth = require('./round-starting-koth.js');
const RoundMapEnd = require('./round-map-end.js');
const logger = require('../../logger.js');


//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class RoundOverKoth extends RoundBaseState.RoundBaseState {
	constructor(gs, round, currentlyOwningTeamId, currentlyOwningTeamRef) {
		super(gs, round);
		this.stateName = "OVER";
		this.roundTimerDefault = 90000;
		this.matchWon = false;
		this.currentlyOwningTeamId = currentlyOwningTeamId;
		this.currentlyOwningTeamRef = currentlyOwningTeamRef;
	}
	
	enter(dt) {
		logger.log("info", 'Round over.');
		super.enter(dt);

		//calculate and send the results to the users
		var winningTeamIds = [];
		var matchWinnerTeamId = "";

		/////////////////////////////////////////////////////////////
		// give a point to the winning team
		if(this.currentlyOwningTeamRef !== null) {
			this.currentlyOwningTeamRef.modRoundWins(1);
			winningTeamIds.push(this.currentlyOwningTeamId);
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
		
		//get MVPs
		var mvpResults = this.round.globalfuncs.getRoundMVPs(this.gs);

		//finally send the event
		var userAgents = this.gs.uam.getUserAgents();
		var roundResultsEventData = {
			"eventName": "roundResults",
			"winningTeamCsv": winningTeamIds.join(","),
			"mvpBestCsv": mvpResults.bestMvps.join(","),
			"bestMvpsHealsCsv": mvpResults.bestMvpsHeals.join(","),
			"mvpWorstCsv": mvpResults.worstMvps.join(","),
			"worstMvpsHealsCsv": mvpResults.worstMvpsHeals.join(","),
			"matchWon": this.matchWon,
			"matchWinnerTeamId": matchWinnerTeamId
		};
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertServerToClientEvent(roundResultsEventData);
		}

		//reset the timer
		this.round.roundTimeAcc = 0;
		if(this.matchWon) {
			this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundOverWinTimeLength, this.roundTimerDefault);
		}
		else {
			this.round.roundTimer = this.round.globalfuncs.getValueDefault(this.gs?.currentMapResource?.data?.gameData?.roundOverTimeLength, this.roundTimerDefault);
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
				this.round.nextState = new RoundStartingKoth.RoundStartingKoth(this.gs, this.round);
				
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

		this.currentlyOwningTeamId = 0;
		this.currentlyOwningTeamRef = null;
	}
}



exports.RoundOverKoth = RoundOverKoth;
