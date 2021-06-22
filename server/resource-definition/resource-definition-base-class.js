//base class for resource definitions. Not sure if there is going to be anything on here or not...but it atleast defines the interface.
class ResourceDefinitionBaseClass {
	constructor() {
		this.id = null;
		this.status = "";
		this.resourceType = "";
		this.callbackList = [];
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	//mmmmm, love me some sloppy speghetti
	startLoadingResource(resource, cbComplete) {
		var callbackObj = this.callbackList.find((x) => {return x.resource.id === resource.id;});

		if(callbackObj === undefined) {
			callbackObj = {
				resource: resource, 
				cbCompleteArray: []
			}
			this.callbackList.push(callbackObj);
		}

		callbackObj.cbCompleteArray.push(cbComplete);
	}

	callCompleteCallbacks(resource) {
		var callbackObjIndex = this.callbackList.findIndex((x) => {return x.resource.id === resource.id;});

		if(callbackObjIndex >= 0){
			var deleteCallbackIndices = [];
			var callbackObj = this.callbackList[callbackObjIndex];
			for(var i = 0; i < callbackObj.cbCompleteArray.length; i++) {
				if(typeof callbackObj.cbCompleteArray[i] === "function") {
					callbackObj.cbCompleteArray[i](resource);
				}
				deleteCallbackIndices.push(i);
			}

			for(var i = deleteCallbackIndices.length-1; i >= 0; i--) {
				callbackObj.cbCompleteArray.splice(i, 1);
			}

			if(callbackObj.cbCompleteArray.length === 0) {
				this.callbackList.splice(callbackObjIndex, 1);
			}
		}
	}
}

exports.ResourceDefinitionBaseClass = ResourceDefinitionBaseClass;