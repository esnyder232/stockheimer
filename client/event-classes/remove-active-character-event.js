import $ from "jquery"
import ClientConstants from "../client-constants.js"

export default class RemoveActiveCharacterEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		this.gc.gom.destroyGameObjectServerId(e.id);

		//check if this is your character. If it is, then remove relationships and switch pointer modes(this may be moved later)
		if(this.gc.foundMyUser && this.gc.foundMyCharacter)
		{
			var c = this.gc.gom.getGameObjectByServerID(e.id);
			if(c !== null && c.ownerType === "user" && c.serverId === this.gc.myCharacter.serverId)
			{
				this.gc.foundMyCharacter = false;
				this.gc.myCharacter = null;

				//check if this is your character your controlling. If it is, then switch pointer modes
				this.gc.mainScene.switchCameraMode(ClientConstants.CameraModes["CAMERA_MODE_DEATH_CAM"]);

				this.gc.mainScene.isSniperClass = false;

				//also destroy the target line
				this.gc.mainScene.targetLineGraphic.clear();
			}
		}
	}
}