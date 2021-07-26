export default class CharacterClassState {
	constructor(gameClient, character, characterClassStateResource, timeAcc) {
		this.gc = gameClient;
		this.character = character;
		this.characterClassStateResource = characterClassStateResource;
		this.timeAcc = timeAcc;
		this.timeLength = 1000;

		this.animationSetKey = "";
	}

	enter(dt) {
		// console.log("===== ENTERED " + this.characterClassStateResource.data.name + " STATE");
		//get data from resource
		this.animationSetKey = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.animationSet, this.animationSetKey);
		this.timeLength = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.timeLength, this.timeLength);
		this.character.changeAnimationSetKey(this.animationSetKey, this.timeLength, 0, true);
	}

	update(dt) {
		
	}

	exit(dt) {
		this.character.changeAnimationSetKey("idle", null, -1, false, 0);
	}
}
