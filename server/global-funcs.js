const GameConstants = require('../shared_files/game-constants.json');
const {AiConnectingState} = require("./user/ai-connecting-state.js")

class GlobalFuncs {
	constructor(){}

	//a quick function to add some structure to the messages going across websockets
	sendJsonEvent(socket, event, msg) {
		if(!event)
		{
			event = "unknown"
		}
		if(!msg)
		{
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
		if(!msg)
		{
			return j;
		}

		j = JSON.parse(msg);
		return j;
	}

	parseCookies(request) {
		var list = {},
			rc = request.headers.cookie;
	
		rc && rc.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			var key = parts.shift().trim();
			var val = parts.join('=')
			
			list[key] = decodeURIComponent(val);
		});
	
		return list;
	}


	findNextAvailableId(idArr, startingIndex, maxAllowed) {
		if(startingIndex < 0)
			startingIndex = 0;
		else if(startingIndex >= maxAllowed)
			startingIndex = maxAllowed - 1;

		var i = startingIndex;
		var result = -1;

		if(i >= 0)
		{
			do
			{
				if(idArr[i] === false)
				{
					result = i;
					break;
				}
	
				i++;
				i = i % maxAllowed;
			}
			while(i != startingIndex)
		}
		
		return result;
	}

	//helper function for finding an owner to a character (either user or ai)
	getOwner(gameServer, ownerId, ownerType)
	{
		var owner = null;
		if(ownerType === "user")
		{
			owner = gameServer.um.getUserByID(ownerId);
		}
		else if (ownerType === "ai")
		{
			owner = gameServer.aim.getAIAgentByID(ownerId);
		}

		return owner;
	}

	spawnCharacterForUser(gs, user)
	{
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
		

		if(user.teamId !== spectatorTeam.id)
		{
			//as long as they don't already have a character controlled, create one for the user.
			if(user.characterId !== null) {
				bFail = true;
			}

			//get the team the user's on
			if(!bFail) {
				userTeam = gs.tm.getTeamByID(user.teamId);
				if(userTeam === null) {
					bFail = true;
					userMessage = "Player spawn failed. Could not get the user's team.";
				}
				else {
					userTeamSlot = userTeam.slotNum;
				}
			}

			//get the tilemap
			if(!bFail) {
				tm = gs.activeTilemap;
				if(tm === null) {
					bFail = true;
					userMessage = "Player spawn failed. Could not get the tilemap.";
				}
			}
			
			//quick check if any spawn zones even exist
			if(!bFail) {
				arrSpawnZones = tm.getSpawnZonesBySlotnum(userTeamSlot);

				if(arrSpawnZones.length === 0) {
					bFail = true;
					userMessage = "Player spawn failed. There are no spawn zones set for that team on this map.";
				}
			}


			//at this point, i believe its safe to spawn the player
			if(!bFail) {
				//pick a random spawn zone with the appropriate slotnum
				var zIndex = 0;
				zIndex = Math.floor(Math.random() * arrSpawnZones.length);
				if(zIndex === arrSpawnZones.length) {
					zIndex = arrSpawnZones.length-1
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
			if(userMessage !== "")
			{
				gs.gameState.userResponseMessage(user, userMessage, logEventMessage);
			}
			if(broadcastMessage !== "")
			{
				gs.gameState.broadcastResponseMessage(broadcastMessage, logEventMessage);
			}
		}

		return bFail;

	}

	//this is such a fucking wierd way to do it....but it does work
	balanceAiUsersOnTeams(gs) {
		if(gs.minimumUsersPlaying > 0 && gs.maxPlayers > 0)
		{
			var activeUsersTeams = gs.um.getActiveUsersGroupedByTeams();
			var bError = false;
			
			//create some more property on each team grouping
			activeUsersTeams.map((x) => {x.minimumUsersThisTeamShouldHave = 0;})
			activeUsersTeams.map((x) => {x.maxUsersThisTeamShouldHave = 0;})

			var spectatorHumanUsers = 0;
			for(var i = 0; i < activeUsersTeams.length; i++) {
				if(activeUsersTeams[i].isSpectatorTeam) {
					spectatorHumanUsers = activeUsersTeams[i].humanUserIds.length;
					break;
				}
			}
			
	
			//if there are teams for ai to belong to (minus the spectator team), spawn the ai on each team until it fills up to the minimum players for that team (yeah...)
			if(activeUsersTeams.length > 1) {
	
				//calculate the minimum number of players per team (minus the spectator team)
				var numOfUsers = gs.minimumUsersPlaying - spectatorHumanUsers;

				var teamIndex = 0;
				while(numOfUsers > 0) {
					if(!activeUsersTeams[teamIndex].isSpectatorTeam) {
						activeUsersTeams[teamIndex].minimumUsersThisTeamShouldHave += 1;
						numOfUsers--;
					}
					teamIndex++;
					teamIndex %= activeUsersTeams.length;
				}

				//also calculate the max number of players per team (minus the spectator team)
				teamIndex = 0;
				numOfUsers = gs.maxPlayers;
				while(numOfUsers > 0) {
					if(!activeUsersTeams[teamIndex].isSpectatorTeam) {
						activeUsersTeams[teamIndex].maxUsersThisTeamShouldHave += 1;
						numOfUsers--;
					}
					teamIndex++;
					teamIndex %= activeUsersTeams.length;
				}
			}
			//the only team that is existing is the spectator team....i guess put them on spectator for now
			else if (activeUsersTeams.length === 1) { 
				activeUsersTeams[0].minimumUsersThisTeamShouldHave = gs.minimumUsersPlaying;
				activeUsersTeams[0].maxUsersThisTeamShouldHave = gs.maxPlayers;
			}
			//not sure how it could EVER reach this else statement....there should always be ATLEAST ONE team: spectators
			else {
				
				logger.log("error", "Error when creating ai users for each team. activeUsersTeams came back with 0 teams.");
				bError = true;
			}
	
	
			if(!bError) {
				//finally calculate the number of ai to spawn based on minimum users per tea, maximum players per team, etc
				for(var i = 0; i < activeUsersTeams.length; i++) {
					var currHumanUsers = activeUsersTeams[i].humanUserIds.length;
					var currAiUsers = activeUsersTeams[i].aiUserIds.length;
					var aiToAdd = activeUsersTeams[i].minimumUsersThisTeamShouldHave;

					if(activeUsersTeams[i].minimumUsersThisTeamShouldHave > activeUsersTeams[i].maxUsersThisTeamShouldHave) {
						aiToAdd = activeUsersTeams[i].maxUsersThisTeamShouldHave;
					}

					aiToAdd -= currHumanUsers + currAiUsers;

					//debug
					//console.log('For team ' + activeUsersTeams[i].teamId + ', i should change it by: ' + aiToAdd);

					//kick some ai from this team
					if(aiToAdd < 0 && activeUsersTeams[i].aiUserIds.length > 0) {
						for(var j = 0; j < Math.abs(aiToAdd); j++) {
							//console.log('Attempting to kick an ai');
							var aiToKick = gs.um.getUserByID(activeUsersTeams[i].aiUserIds[j]);

							if(aiToKick !== null) {
								console.log('Inside balanceAiUsersOnTeams, kicking ai ' + aiToKick.id + " off team " + activeUsersTeams[i].teamId);
								aiToKick.bDisconnected = true;
							}
						}
					}
					//add some ai to this team
					else if (aiToAdd > 0) {
						for(var j = 0; j < aiToAdd; j++) {
							//create the user to be controlled by the ai
							var aiUser = gs.um.createUser();

							//create an ai agent to control the user
							var aiAgent = gs.aim.createAIAgent();

							//setup user
							aiUser.userInit(gs);
							aiUser.username = "AI " + aiUser.id;
							aiUser.stateName = "user-disconnected-state";
							aiUser.userType = "ai";
							aiUser.aiAgentId = aiAgent.id;
							aiUser.updateTeamId(activeUsersTeams[i].teamId);

							//setup the user's nextState
							aiUser.nextState = new AiConnectingState(aiUser);

							//setup aiAgent
							aiAgent.aiAgentInit(gs, aiUser.id);

							//activate the user
							gs.um.activateUserId(aiUser.id);
						}
					}
				}
			}	
		}
	}

	//https://stackoverflow.com/questions/511761/js-function-to-get-filename-from-url/48554885
	//sick
	getFilenameFromUrl(url) {
		return url.split('/').pop();
	}

	//Helper function used to check if a nested value in a root object is not undefined or null.
	//The null conditional operator is not yet implemented in Node as of the current version I'm using. So this is a quick hacky function to accomplish the same thing.
	nestedValueCheck(root, strNestedValue) {
		// console.log('inside prop check');
		// console.log(strNestedValue);

		var propsSplit = strNestedValue.split(".");
		var propExists = false;
		
		if(root) {
			propExists = true;
		}

		if(propExists) {
			var context = root;
			for(var i = 0; i < propsSplit.length; i++) {
				var nextContext = context[propsSplit[i]];
				if(nextContext === undefined || nextContext === null) {
					propExists = false;
					break;
				}
				else {
					context = nextContext;
				}
			}
		}
		return propExists;
	}

	//returns a team that has the least amount of players on it. If there is a tie, it picks the one with the lowest id. 
	//It returns the spectator team if there are no teams to join.
	getRandomOpenTeam(gameServer) {
		var finalTeam = null;
		var activeUsersTeams = gameServer.um.getActiveUsersGroupedByTeams();

		if(activeUsersTeams.length === 1) {
			finalTeam = gameServer.tm.getTeamByID(activeUsersTeams[0].teamId);
		}
		else if (activeUsersTeams.length > 1) {
			//sort by totalUsers asc, then teamId asc
			var activeUserTeamsSorted = activeUsersTeams.sort((a, b) => {return a.totalUsers-b.totalUsers || a.teamId-b.teamId;});
			for(var i = 0; i < activeUserTeamsSorted.length; i++) {
				if(!activeUserTeamsSorted[i].isSpectatorTeam) {
					finalTeam = gameServer.tm.getTeamByID(activeUserTeamsSorted[i].teamId);
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
		if(cIndex === availableClasses.length) {
			cIndex = availableClasses.length-1
		}

		if(cIndex >= 0 && cIndex < availableClasses.length) {
			randomClass = availableClasses[cIndex];
		}
		
		return randomClass;
	}
}


exports.GlobalFuncs = GlobalFuncs;