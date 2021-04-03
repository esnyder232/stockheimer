const GameConstants = require('../shared_files/game-constants.json');

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

		logEventMessage = "Player: " + user.username + ", event: fromClientSpawnCharacter: ";
		

		if(user.teamId !== spectatorTeam.id)
		{
			//as long as they don't already have a character controlled, create one for the user.
			if(user.characterId !== null)
			{
				bFail = true;
			}

			//check if the round is currently starting
			if(!bFail && gs.theRound.stateEnum !== GameConstants.RoundStates["STARTING"])
			{
				bFail = true;
				userMessage = "You can only spawn in when the round is starting.";
			}

			//check if the navgrid exists (to be safe)
			if(!bFail && gs.activeNavGrid === null)
			{
				bFail = true;
				userMessage = "Player spawn failed. No active nav grid.";
			}

			//get the tilemap
			if(!bFail)
			{
				tm = gs.tmm.getTilemapByID(gs.activeNavGrid.tmId);
				if(tm === null)
				{
					bFail = true;
					userMessage = "Player spawn failed. Could not get the tilemap.";
				}
			}
			
			if(!bFail)
			{
				if(tm.playerSpawnZones.length === 0)
				{
					bFail = true;
					userMessage = "Player spawn failed. There are no spawn zones set for players.";
				}
			}

			//spawn the player
			if(!bFail)
			{
				//pick a random spawn zone
				var zIndex = 0;

				zIndex = Math.floor(Math.random() * tm.playerSpawnZones.length);
				if(zIndex === tm.playerSpawnZones.length)
				{
					zIndex = tm.playerSpawnZones.length-1
				}

				var z = tm.playerSpawnZones[zIndex];

				var c = gs.gom.createGameObject('character');
				c.characterInit(gs);
				c.ownerId = user.id;
				c.ownerType = "user";
				user.characterId = c.id;
				c.hpMax = 25;
				c.hpCur = 25;

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

	}
	
}


exports.GlobalFuncs = GlobalFuncs;