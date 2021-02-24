export default class TEMPLATEEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		console.log('TEMPLATE EVENT called!!!!!');
		console.log(e);

	}
}