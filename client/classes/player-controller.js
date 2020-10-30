import GlobalFuncs from "../global-funcs.js"

//the player class
export default class PlayerController {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new GlobalFuncs();
		this.inputKeyboardMap = {};
		this.isDirty = false;
		this.keyCodeIndex = {};
	}
	
	init(inputKeyboardMap) {
		this.inputKeyboardMap = inputKeyboardMap;
		for(var key in this.inputKeyboardMap)
		{
			var virtualButton = {
					keyCode: 0,
					phaserKeyCode: "",
					state: false,
					prevState: false,
					phaserKeyObj: {}
			};

			//find the phaserKeyCode (its innefficent I know. I don't care)
			for(var phaserKeyCode in Phaser.Input.Keyboard.KeyCodes)
			{
				if(Phaser.Input.Keyboard.KeyCodes[phaserKeyCode] == this.inputKeyboardMap[key])
				{
					virtualButton.phaserKeyCode = phaserKeyCode;
					break;
				}
			}

			virtualButton.keyCode = this.inputKeyboardMap[key];
			virtualButton.phaserKeyObj = this.scene.input.keyboard.addKey(this.inputKeyboardMap[key]);

			this[key] = virtualButton;
		}

		this.createKeyCodeIndex();

		//for each virtual button, create a listener to change the virutal button's state
		for(var key in this.inputKeyboardMap)
		{
			this.scene.input.keyboard.on("keydown-"+this[key].phaserKeyCode, this.downFunc.bind(this));
			this.scene.input.keyboard.on("keyup-"+this[key].phaserKeyCode, this.upFunc.bind(this));
		}
	}

	//create keyCode index for fast lookups. This needs to be recreated everytime a new mapping occurs
	createKeyCodeIndex() {
		for(var key in this.inputKeyboardMap)
		{
			var val = this.inputKeyboardMap[key];
			this.keyCodeIndex[val] = key;
		}
	}

	
	downFunc(e) {
		var vb = this.keyCodeIndex[e.keyCode];
		if(vb)
		{
			this[vb].state = true;
			this.isDirty = true;
		}
	}

	upFunc(e) {
		var vb = this.keyCodeIndex[e.keyCode];
		if(vb)
		{
			this[vb].state = false;
			this.isDirty = true;
		}
	}
	

	update(timeElapsed, dt) {
		//update the prevState on the virtual controller for the player
		if(this.isDirty)
		{
			for(var key in this.inputKeyboardMap)
			{
				this[key].prevState = this[key].state;
			}
			this.isDirty = false;
		}
	}
}

