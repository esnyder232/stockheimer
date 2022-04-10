import ClientConstants from "../client-constants.js"

export default class PersistentProjectileDamageEffectEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var pp = this.gc.gom.getGameObjectByServerID(e.id);

		if(pp !== null) {
			//show enemy damage tint if it was you that hit an enemy
			if(e.srcUserId === this.gc.myUserServerId) {
				pp.showEnemyDamageTint();
			}

			//show self damage tint if it was you that took damage
			if(pp.ownerId === this.gc.myUserServerId) {
				pp.showSelfDamageTint();
			}
		}
	}
}