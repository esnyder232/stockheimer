export default class UpdateTeamEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		console.log('UpdateTeamEvent EVENT called!!!!!');
		console.log(e);

		//nothing to do yet
	}
}