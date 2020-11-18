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
		this.maxPacketSize = 130; //bytes
	}

	init(gs) {
		this.gs = gs;
	}

	createPacketForUser(user)
	{
		var wsh = this.gs.wsm.getWebsocketByID(user.wsId);

		if(wsh)
		{
			//console.log('creating packet for user: ' + user.username + '    localSequenceNumber: ' + wsh.localSequence);

			var buffer = new ArrayBuffer(this.maxPacketSize);
			var view = new DataView(buffer);
			var n = 0; //current byte within the packet
			var m = 0; //number of events
	
			view.setUint16(0, wsh.localSequence); //sequence Number
			view.setUint16(2, wsh.remoteSequence); //ack (most recent remote sequence number)
			n += 4;

			n += 1; //skipping 1 byte for the event count

			wsh.localSequence++;

			for(var i = user.serverToClientEvents.length - 1; i >= 0; i--)
			{
				//event ID: 1
				// {
				// 	"event": "userConnected",
				// 	"userId": this.user.id,
				// 	"username": this.user.username
				// }


				switch(user.serverToClientEvents[i].event)
				{
					case "userConnected":
						var e = user.serverToClientEvents[i];
						view.setUint8(n, 1); //eventId
						n++;
						view.setUint8(n, e.userId); //user.id
						n++;
						view.setUint8(n, e.username.length); //username length
						n++;

						//username
						for(var j = 0; j < e.username.length; j++)
						{
							view.setUint16(n, e.username.charCodeAt(j)); 
							n += 2;
						}
						break;
					default:
						//intentionally blank
						break;
				}

				//delete event for now
				user.serverToClientEvents.splice(i, 1);
				m++;
			}
	
			view.setUint8(4, m); //payload event count
			wsh.ws.send(buffer);
		}
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
