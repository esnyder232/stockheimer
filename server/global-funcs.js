const GameConstants = require('../shared_files/game-constants.json');
const {AiConnectingState} = require("./user/ai-connecting-state.js")
const logger = require("../logger.js");

const aiNames = require("../data/names/ai-names.json");

class GlobalFuncs {
	constructor() {
	}

	//a quick function to add some structure to the messages going across websockets
	sendJsonEvent(socket, event, msg) {
		if (!event) {
			event = "unknown"
		}
		if (!msg) {
			msg = ""
		}

		var data = {
			event: event,
			msg: msg
		}
		socket.send(JSON.stringify(data));
	}

	getJsonEvent(msg) {
		var j = {};
		if (!msg) {
			return j;
		}

		j = JSON.parse(msg);
		return j;
	}

	parseCookies(request) {
		var list = {},
			rc = request.headers.cookie;

		rc && rc.split(';').forEach(function (cookie) {
			var parts = cookie.split('=');
			var key = parts.shift().trim();
			var val = parts.join('=')

			list[key] = decodeURIComponent(val);
		});

		return list;
	}


	findNextAvailableId(idArr, startingIndex, maxAllowed) {
		if (startingIndex < 0)
			startingIndex = 0;
		else if (startingIndex >= maxAllowed)
			startingIndex = maxAllowed - 1;

		var i = startingIndex;
		var result = -1;

		if (i >= 0) {
			do {
				if (idArr[i] === false) {
					result = i;
					break;
				}

				i++;
				i = i % maxAllowed;
			}
			while (i != startingIndex)
		}

		return result;
	}

	//helper function for finding an owner to a character (either user or ai)
	getOwner(gameServer, ownerId, ownerType) {
		var owner = null;
		if (ownerType === "user") {
			owner = gameServer.um.getUserByID(ownerId);
		} else if (ownerType === "ai") {
			owner = gameServer.aim.getAIAgentByID(ownerId);
		}

		return owner;
	}

	spawnCharacterForUser(gs, user) {
		var bFail = false;
		var userMessage = "";
		var broadcastMessage = "";
		var logEventMessage = "";
		var tm = null;
		var spectatorTeam = gs.tm.getSpectatorTeam();
		var userTeam = null;
		var userTeamSlot = null;
		var arrSpawnZones = [];

		logEventMessage = "Player: " + user.username + ", event: fromClientSpawnCharacter: ";


		if (user.teamId !== spectatorTeam.id) {
			//as long as they don't already have a character controlled, create one for the user.
			if (user.characterId !== null) {
				bFail = true;
			}

			//get the team the user's on
			if (!bFail) {
				userTeam = gs.tm.getTeamByID(user.teamId);
				if (userTeam === null) {
					bFail = true;
					userMessage = "Player spawn failed. Could not get the user's team.";
				} else {
					userTeamSlot = userTeam.slotNum;
				}
			}

			//get the tilemap
			if (!bFail) {
				tm = gs.activeTilemap;
				if (tm === null) {
					bFail = true;
					userMessage = "Player spawn failed. Could not get the tilemap.";
				}
			}

			//quick check if any spawn zones even exist
			if (!bFail) {
				arrSpawnZones = tm.getSpawnZonesBySlotnum(userTeamSlot);

				if (arrSpawnZones.length === 0) {
					bFail = true;
					userMessage = "Player spawn failed. There are no spawn zones set for that team on this map.";
				}
			}


			//at this point, i believe its safe to spawn the player
			if (!bFail) {
				//pick a random spawn zone with the appropriate slotnum
				var zIndex = 0;
				zIndex = Math.floor(Math.random() * arrSpawnZones.length);
				if (zIndex === arrSpawnZones.length) {
					zIndex = arrSpawnZones.length - 1
				}

				var z = arrSpawnZones[zIndex];

				var c = gs.gom.createGameObject('character');
				c.characterInit(gs);

				c.teamId = user.teamId;
				c.ownerId = user.id;
				c.ownerType = "user";
				user.characterId = c.id;

				var xStarting = z.xPlanck + (z.widthPlanck * Math.random());
				var yStarting = z.yPlanck - (z.heightPlanck * Math.random());

				c.xStarting = xStarting;
				c.yStarting = yStarting;

				broadcastMessage = "Player '" + user.username + "' has spawned.";
			}

			//send out usermessage and/or broadcast message
			if (userMessage !== "") {
				gs.userResponseMessage(user, userMessage, logEventMessage);
			}
			if (broadcastMessage !== "") {
				gs.broadcastResponseMessage(broadcastMessage, logEventMessage);
			}
		}

		return bFail;

	}

	//NEW - attempt 2
	balanceAiUsersOnTeams(gs) {
		if (gs.minimumUsersPlaying > 0 && gs.maxPlayers > 0) {
			var usersSummary = gs.um.getActiveUsersSummary();
			var bError = false;

			//There are no human players. Add ais until it meets the minimum users playing
			if (usersSummary.totalHumans === 0) {
				if (usersSummary.totalAis < gs.minimumUsersPlaying) {
					for (var i = 0; i < gs.minimumUsersPlaying - usersSummary.totalAis; i++) {
						this.addAiUser(gs);
					}
				}
			}
			//There more than enough human players to play the game. Kick all existing ai if there is any
			else if (usersSummary.totalHumans >= gs.minimumUsersPlaying) {
				if (usersSummary.totalAis > 0) {
					for (var i = 0; i < usersSummary.teams.length; i++) {
						for (var j = 0; j < usersSummary.teams[i].aiUserIds.length; j++) {
							//console.log('Attempting to kick an ai');
							var aiToKick = gs.um.getUserByID(usersSummary.teams[i].aiUserIds[j]);

							if (aiToKick !== null) {
								logger.log("info", 'Inside balanceAiUsersOnTeams, kicking ai ' + aiToKick.id + " off team " + usersSummary.teams[i].teamId);
								aiToKick.bDisconnected = true;
							}
						}
					}
				}
			}
			//There are some human players, but not enough to reach the minimum. Ais either need to be created or kicked to reach the minimum again.
			else if (usersSummary.totalHumans > 0 && usersSummary.totalHumans < gs.minimumUsersPlaying) {
				var totalAiThatShouldBeInGame = gs.minimumUsersPlaying - usersSummary.totalHumans;

				//some ai need to be kicked. Start kicking from the largest team, and work your way down to the smallest
				if (totalAiThatShouldBeInGame < usersSummary.totalAis) {
					var aiLeftToKick = usersSummary.totalAis - totalAiThatShouldBeInGame;

					var whileLoopCounter = 0;
					while (aiLeftToKick > 0) {
						//sort existing teams by totalUsers desc
						usersSummary.teams.sort((a, b) => {
							return b.totalUsers - a.totalUsers;
						});

						//start with the team that has the most users, try to find an ai on the team and kick. If there isn't an ai on the team, move onto the next team.
						for (var i = 0; i < usersSummary.teams.length; i++) {
							if (usersSummary.teams[i].aiUserIds.length > 0) {
								//console.log('Attempting to kick an ai');
								var aiToKick = gs.um.getUserByID(usersSummary.teams[i].aiUserIds[0]);

								if (aiToKick !== null) {
									logger.log("info", 'Inside balanceAiUsersOnTeams, kicking ai ' + aiToKick.id + " off team " + usersSummary.teams[i].teamId);
									aiToKick.bDisconnected = true;
									aiLeftToKick--;

									//update the team summary for sorting for the next loop
									usersSummary.teams[i].aiUserIds.splice(0, 1);
									usersSummary.teams[i].totalUsers--;
									break;
								}
							}
						}

						//just in case the while loop gets caught in an infinite loop
						whileLoopCounter++;
						if (whileLoopCounter > 50) {
							logger.log("info", "Inside balanceAiUsersOnTeams: Warning: while-loop to kick ai users reached 50 iterations. Breaking out of loop.")
							break;
						}
					}
				}
				//some ai need to be added. Just create them, and they will pick a team later when they get activated.
				else if (totalAiThatShouldBeInGame > usersSummary.totalAis) {
					for (var i = 0; i < totalAiThatShouldBeInGame - usersSummary.totalAis; i++) {
						this.addAiUser(gs);
					}
				}
			}
		}
	}


	addAiUser(gs) {
		//create the user to be controlled by the ai
		var aiUser = gs.um.createUser();

		//create an ai agent to control the user
		var aiAgent = gs.aim.createAIAgent();

		//setup user
		aiUser.userInit(gs);
		aiUser.username = "AI " + aiNames[aiUser.id % aiNames.length].name;
		aiUser.stateName = "user-disconnected-state";
		aiUser.userType = "ai";
		aiUser.aiAgentId = aiAgent.id;

		//setup the user's nextState
		aiUser.nextState = new AiConnectingState(aiUser);

		//setup aiAgent
		aiAgent.aiAgentInit(gs, aiUser.id);

		//activate the user
		gs.um.activateUserId(aiUser.id);
	}

	//https://stackoverflow.com/questions/511761/js-function-to-get-filename-from-url/48554885
	//sick
	getFilenameFromUrl(url) {
		return url.split('/').pop();
	}


	getValueDefault(value, defaultValue) {
		var retVal = null;
		if (value === undefined || value === null) {
			retVal = (defaultValue === undefined) ? null : defaultValue;
		} else {
			retVal = value;
		}

		return retVal;
	}


	//returns a team that has the least amount of players on it. If there is a tie, it picks the one with the lowest id.
	//It returns the spectator team if there are no teams to join.
	getSmallestTeam(gameServer) {
		var finalTeam = null;
		var usersSummary = gameServer.um.getActiveUsersSummary();

		if (usersSummary.teams.length === 1) {
			finalTeam = gameServer.tm.getTeamByID(usersSummary.teams[0].teamId);
		} else if (usersSummary.teams.length > 1) {
			//sort by totalUsers asc, then teamId asc
			usersSummary.teams.sort((a, b) => {
				return a.totalUsers - b.totalUsers || a.teamId - b.teamId;
			});
			for (var i = 0; i < usersSummary.teams.length; i++) {
				if (!usersSummary.teams[i].isSpectatorTeam) {
					finalTeam = gameServer.tm.getTeamByID(usersSummary.teams[i].teamId);
					break;
				}
			}
		}

		return finalTeam;
	}

	getRandomClass(gameServer) {
		var randomClass = null;
		var availableClasses = gameServer.rm.getResourceByType("character-class");

		var cIndex = Math.floor(Math.random() * availableClasses.length);
		if (cIndex === availableClasses.length) {
			cIndex = availableClasses.length - 1
		}

		if (cIndex >= 0 && cIndex < availableClasses.length) {
			randomClass = availableClasses[cIndex];
		}


		//for testing - always pick the same type
		// randomClass = availableClasses.find((x) => {return x.key === "data/character-classes/slime-healer.json"});


		//for testing - if the ai choose a particular class, default to something else (useful for testing a new class BUT ONLY you want to be the class)
		if (randomClass.key === "data/character-classes/slime-defender.json") {
			//default it to slime-mage
			randomClass = availableClasses.find((x) => {
				return x.key === "data/character-classes/slime-small.json"
			});
		}


		//for testing - only return ONE healing class, for testing ai healing
		// if(!gameServer.healerChosen) {
		// 	gameServer.healerChosen = true;
		// 	randomClass = availableClasses.find((x) => {return x.key === "data/character-classes/slime-healer.json"});
		// }
		// else if (randomClass.key === "data/character-classes/slime-healer.json") {
		// 	//default it to slime-mage
		// 	randomClass = availableClasses.find((x) => {return x.key === "data/character-classes/slime-mage.json"});
		// }

		return randomClass;
	}

	//function that only inserts tracked entities into user agents with users who are "playing" (meaning they are connected and are playing)
	insertTrackedEntityToPlayingUsers(gameServer, entType, entId) {
		var playingUsers = gameServer.um.getPlayingUsers();
		for (var i = 0; i < playingUsers.length; i++) {
			var ua = gameServer.uam.getUserAgentByID(playingUsers[i].userAgentId);
			if (ua !== null) {
				ua.insertTrackedEntity(entType, entId);
			}
		}
	}

	createPlanckShape(gameServer, plShape, shapeData) {
		var shape = null;

		if (plShape === "circle") {
			shape = gameServer.pl.Circle(gameServer.pl.Vec2(0, 0), shapeData.plRadius);
		}
		if (plShape === "rect") {
			shape = gameServer.pl.Box(shapeData.width / 2, shapeData.height / 2, Vec2(0, 0));
		}

		return shape;
	}

	isFloat(n) {
		return n === +n && n !== (n | 0);
	}

	createPlankRect(gameServer, rectData) {
		return gameServer.pl.Box(shapeData.width / 2, shapeData.height / 2, Vec2(0, 0));
	}

	createPlankCircle(gameServer, circleData) {
		return shape = gameServer.pl.Circle(gameServer.pl.Vec2(0, 0), shapeData.plRadius);
	}


	getRoundMVPs(gs) {
		var mvpResults = {
			bestMvps: [],
			worstMvps: [],
			bestMvpsHeals: [],
			worstMvpsHeals: []
		};

		var mvpNumberUsers = 3;
		var spectatorTeamId = gs.tm.getSpectatorTeam().id;
		var activeUsers = gs.um.getActiveUsers();
		var bestUserCandidates = [];
		var worstUserCandidates = [];

		/////////////////////////////////////////////////////////////
		// BEST MVPs
		//filter the users out to not include spectators
		for (var i = 0; i < activeUsers.length; i++) {
			if (activeUsers[i].teamId !== spectatorTeamId) {
				var healPoints = this.convertHealingToPoints(activeUsers[i].roundHealCount, gs)
				bestUserCandidates.push({
					id: activeUsers[i].id,
					points: activeUsers[i].roundUserKillCount + healPoints,
					deaths: activeUsers[i].roundUserDeathCount,
					heals: activeUsers[i].roundHealCount
				})
			}
		}

		// console.log("===DEBUG HEALS:");
		// console.log("mid: " + gs.healsToPointsRatio);
		// for(var i = 0; i < bestUserCandidates.length; i++) {
		// 	console.log("id: " + bestUserCandidates[i].id + ", heals: " + bestUserCandidates[i].heals + ", total points: " + bestUserCandidates[i].points);
		// }

		//sort by points desc, then deaths asc
		bestUserCandidates.sort((a, b) => {
			return b.points - a.points || a.deaths - b.deaths
		});

		//top 3 are best MVPs
		var finalNumUsers = bestUserCandidates.length < mvpNumberUsers ? bestUserCandidates.length : mvpNumberUsers;
		for (var i = 0; i < finalNumUsers; i++) {
			mvpResults.bestMvps.push(bestUserCandidates[i].id);
			mvpResults.bestMvpsHeals.push(bestUserCandidates[i].heals);
		}
		/////////////////////////////////////////////////////////////


		/////////////////////////////////////////////////////////////
		// WORST MVPs
		//filter the users out to not include spectators AND if they are not included already in the best mvp list
		for (var i = 0; i < activeUsers.length; i++) {
			if (activeUsers[i].teamId !== spectatorTeamId) {
				var existingMvpIndex = mvpResults.bestMvps.findIndex((x) => {
					return x === activeUsers[i].id
				});
				if (existingMvpIndex < 0) {
					var healPoints = this.convertHealingToPoints(activeUsers[i].roundHealCount, gs)
					worstUserCandidates.push({
						id: activeUsers[i].id,
						points: activeUsers[i].roundUserKillCount + healPoints,
						deaths: activeUsers[i].roundUserDeathCount,
						heals: activeUsers[i].roundHealCount
					})
				}
			}
		}

		//sort by points asc, then deaths desc
		worstUserCandidates.sort((a, b) => {
			return a.points - b.points || b.deaths - a.deaths
		});

		//top 3 are worst MVPs
		finalNumUsers = worstUserCandidates.length < mvpNumberUsers ? worstUserCandidates.length : mvpNumberUsers;
		for (var i = 0; i < finalNumUsers; i++) {
			mvpResults.worstMvps.push(worstUserCandidates[i].id);
			mvpResults.worstMvpsHeals.push(worstUserCandidates[i].heals);
		}
		/////////////////////////////////////////////////////////////

		return mvpResults;
	}

	convertHealingToPoints(roundHealCount, gs) {
		return Math.floor(roundHealCount / gs.healsToPointsRatio);
	}
	
	clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	};

	//this just checks to see if 2 actions are considered "equal" in terms of the type and context
	areAiActionsEqual(actionObject, actionScore) {
		if(actionObject.actionScore.resource.typeEnum === actionScore.resource.typeEnum) {
			switch(actionObject.actionScore.resource.typeEnum) {
				case GameConstants.ActionTypes["MOVE_TO_ENEMY"]:
				case GameConstants.ActionTypes["MOVE_AWAY_ENEMY"]:
				case GameConstants.ActionTypes["SHOOT_ENEMY"]:
				case GameConstants.ActionTypes["SHOOT_ALLY"]:
				case GameConstants.ActionTypes["ALT_SHOOT_ENEMY"]:
				case GameConstants.ActionTypes["ALT_SHOOT_ALLY"]:
				case GameConstants.ActionTypes["ALT_SHOOT_SELF"]:
				case GameConstants.ActionTypes["MOVE_AWAY_ALLY"]:
				case GameConstants.ActionTypes["MOVE_TO_ALLY"]:
					// if(actionObject.actionScore.characterId !== actionScore.characterId) {
					// 	var breakhere = true;
					// }
					return actionObject.actionScore.characterId === actionScore.characterId;
					break;
				case GameConstants.ActionTypes["MOVE_TO_CONTROL_POINT"]:
					return actionObject.actionScore.controlPointId === actionScore.controlPointId;
					break;
				default:
					return true;
			}
		}
		return false;
	}

}


exports.GlobalFuncs = GlobalFuncs;