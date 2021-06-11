//a wrapper class for reasources. Resources are built from combining file-resources into 1 resource in the resource-manager.
//These are selectively built (like character-classes and projectiles), and they are build from file-resources
class Resource {
	constructor() {
		this.id = null;
		this.status = "";
		this.key = "";
		this.data = null;
		this.resourceType = "";
	}



	// serializeAddRoundEvent() {
	// 	return {
	// 		"eventName": "addRound",
	// 		"id": this.id,
	// 		"roundState": this.stateEnum,
	// 		"roundTime": this.roundTimer,
	// 		"roundTimeAcc": this.roundTimeAcc
	// 	};
	// }
	
	// serializeUpdateRoundStateEvent() {
	// 	return {
	// 		"eventName": "updateRoundState",
	// 		"id": this.id,
	// 		"roundState": this.stateEnum,
	// 		"roundTime": this.roundTimer,
	// 		"roundTimeAcc": this.roundTimeAcc
	// 	};
	// }
}

exports.Resource = Resource;