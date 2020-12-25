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
	
}


exports.GlobalFuncs = GlobalFuncs;