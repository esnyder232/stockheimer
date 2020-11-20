const {GlobalFuncs} = require('../global-funcs.js');
const EventSchema = require('../../shared_files/event-schema.json');

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
			var bytesWritten = 0;
	
			view.setUint16(0, wsh.localSequence); //sequence Number
			view.setUint16(2, wsh.remoteSequence); //ack (most recent remote sequence number)
			n += 4;
			bytesWritten += 4;

			n += 1; //skipping 1 byte for the event count
			bytesWritten++;

			wsh.localSequence++;
			wsh.localSequence = wsh.localSequence % wsh.localSequenceMaxValue;

			var bcontinue = true;

			for(var i = user.serverToClientEvents.length - 1; i >= 0; i--)
			{
				if(!bcontinue)
				{
					break;
				}

				var e = user.serverToClientEvents[i];
				var schema = EventNameIndex[e.eventName];

				if(schema)
				{
					var bytesRequired = 0;

					bytesRequired++; //eventId

					//check the length of event to make sure it fits
					//there is a variable sized parameter (most likely a string)
					if(schema.b_size_varies)
					{
						//find the variable length parameters, and determine the bytes required
						for(var p = 0; p < schema.parameters.length; p++)
						{
							if(schema.parameters[p].b_size_varies)
							{
								switch(schema.parameters[p].txt_actual_data_type)
								{
									case "str8": 
										var s = e[schema.parameters[p].txt_param_name];
										if(s)
										{
											bytesRequired += 1 + s.length;
										}
										break;
									case "str16": 
										var s = e[schema.parameters[p].txt_param_name];
										if(s)
										{
											bytesRequired += 2 + s.length;
										}
										break;
									case "str32": 
										var s = e[schema.parameters[p].txt_param_name];
										if(s)
										{
											bytesRequired += 4 + s.length;
										}
										break;
									default:
										//intentionally blank
										break;
								}
							}
							else
							{
								bytesRequired += schema.parameters[p].min_bytes;
							}
						}
					}
					else
					{
						bytesRequired = schema.sum_min_bytes;
					}

					if(bytesRequired <= this.maxPacketSize - bytesWritten)
					{
						view.setUint8(n, schema.event_id);
						n++;
						bytesWritten++;

						//go through the parameters and encode each one
						for(var p = 0; p < schema.parameters.length; p++)
						{
							var value = e[schema.parameters[p].txt_param_name];
							switch(schema.parameters[p].txt_actual_data_type)
							{
								//standard encoding
								case "int8":
									view.setInt8(n, value);
									n++;
									bytesWritten++;
									break;
								case "int16":
									view.setInt16(n, value);
									n += 2;
									bytesWritten += 2;
									break;
								case "int32":
									view.setInt32(n, value);
									n += 4;
									bytesWritten += 4;
									break;
								case "uint8":
									view.setUint8(n, value);
									n++;
									bytesWritten++;
									break;
								case "uint16":
									view.setUint16(n, value);
									n += 2;
									bytesWritten += 2;
									break;
								case "uint32":
									view.setUint32(n, value);
									n += 4;
									bytesWritten += 4;
									break;
								case "str8":
									//string length
									view.setUint8(n, value.length);
									n++;
									bytesWritten++;

									//string value
									for(var j = 0; j < value.length; j++)
									{
										view.setUint16(n, value.charCodeAt(j)); 
										n += 2;
										bytesWritten += 2;
									}
									break;
								case "str16":
									//string length
									view.setUint16(n, value.length);
									n += 2;
									bytesWritten += 2;

									//string value
									for(var j = 0; j < value.length; j++)
									{
										view.setUint16(n, value.charCodeAt(j)); 
										n += 2;
										bytesWritten += 2;
									}
									break;
								case "str32":
									//string length
									view.setUint32(n, value.length);
									n += 4;
									bytesWritten += 4;

									//string value
									for(var j = 0; j < value.length; j++)
									{
										view.setUint16(n, value.charCodeAt(j)); 
										n += 2;
										bytesWritten += 2;
									}
									break;
								case "float32":
									view.setFloat32(n, value);
									n += 4;
									bytesWritten += 4;
									break;

								//Custom encodings
								case "float16p0":
									view.setInt16(n, Math.round(value/1));
									n += 2;
									bytesWritten += 2;
									break;
								case "float16p1":
									view.setInt16(n, Math.round(value/0.1));
									n += 2;
									bytesWritten += 2;
									break;
								case "float16p2":
									view.setInt16(n, Math.round(value/0.01));
									n += 2;
									bytesWritten += 2;
									break;
								case "float16p3":
									view.setInt16(n, Math.round(value/0.001));
									n += 2;
									bytesWritten += 2;
									break;



								case "float8p0":
									view.setInt8(n, Math.round(value/1));
									n++;
									bytesWritten++;
									break;
								case "float8p1":
									view.setInt8(n, Math.round(value/0.1));
									n++;
									bytesWritten++;
									break;
								case "float8p2":
									view.setInt8(n, Math.round(value/0.01));
									n++;
									bytesWritten++;
									break;
								case "float8p3":
									view.setInt8(n, Math.round(value/0.001));
									n++;
									bytesWritten++;
									break;


								case "bool":
									view.setUint8(n, value ? 1 : 0);
									n++;
									bytesWritten++;
									break;
								default:
									//intentionally blank
									break;
							}
						}
					}
					//the packet is full
					else
					{
						bcontinue = false;
					}
				}

				//delete event for now
				user.serverToClientEvents.splice(i, 1);
				m++;
			}
	
			view.setUint8(4, m); //payload event count
			wsh.ws.send(buffer);
		}
	}
}

exports.PacketSystem = PacketSystem;
