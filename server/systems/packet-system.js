const {GlobalFuncs} = require('../global-funcs.js');
const EventSchema = require('./event-schema.json');

//load in the event schema and build indexes. Do it outside the class so it only does this step once.
var EventNameIndex = {};

for(var i = 0; i < EventSchema.events.length; i++)
{
	if(EventSchema.events[i] != null && EventSchema.events[i].txt_event_name)
	{
		EventNameIndex[EventSchema.events[i].txt_event_name] = EventSchema.events[i];
	}
}

class PacketSystem {
	constructor() {
		this.user = null;
	}

	init(user) {
		this.user = user;

		//load in the event schema
		// for(var i = 0; EventSchema.)

		//test
		var userJoinedEvent = EventNameIndex["userJoined"];
		
		var stopHere = true;
	}

	writeEventToDataView(dataView, n, eventName, parametersJson)
	{
		var result = {
			bError: false,
			bBufferFull: false,
			iNumBytes: 0,
			iNewN: n
		}

		var e = EventNameIndex[eventName];
		var bytesToWrite = 0;

		//first calculate the size in bytes that will be added to the dataView.
		if(e.b_size_varies_num)
		{
			
			var codePointLength = 0;
			for(var i = 0; i < e.parameters; i++)
			{
				if(e.b_size_varies)
				{
					//

				}
			}
		}
		else
		{
			bytesToWrite = e.sum_min_bytes;
		}
		
	}

	
	
	
}

exports.PacketSystem = PacketSystem;
