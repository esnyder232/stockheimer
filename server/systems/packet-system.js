// const {GlobalFuncs} = require('../global-funcs.js');
// const EventSchema = require('../../shared_files/event-schema.json');

// //load in the event schema and build indexes. Do it outside the class so it only does this step once.
// //var EventNameIndex = {};

// // for(var i = 0; i < EventSchema.events.length; i++)
// // {
// // 	if(EventSchema.events[i] != null && EventSchema.events[i].txt_event_name)
// // 	{
// // 		EventNameIndex[EventSchema.events[i].txt_event_name] = EventSchema.events[i];
// // 	}
// // }

// class PacketSystem {
// 	constructor() {
// 		this.maxPacketSize = 200; //bytes
// 		this.eventQueues = [];	//2d array (each entry in eventQueues is another array). Each array is a queue for events to be sent to the client.
// 		this.eventQueuesEventIdIndex = {}; //index for the eventQueues
// 	}

// 	init(gs) {
// 		this.gs = gs;

// 		for(var i = 0; i < EventSchema.events.length; i++)
// 		{
// 			this.eventQueues.push([]);
// 			this.eventQueuesEventIdIndex[EventSchema.events[i].event_id] = i;
// 		}
// 	}

// 	//calculates and returns the number of bytes remaining to be written to the current packet
// 	getCurrentBytesRemaining() {

// 	}


// }

// exports.PacketSystem = PacketSystem;
