import GlobalFuncs from "../global-funcs.js"

//the player class
export default class PlayerController {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new GlobalFuncs();
		this.inputKeyboardMap = {};
		this.isDirty = false;
		this.keyCodeIndex = {};
		this.anyInput = false;
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

			//janky...
			//TODO - currently, I have this:
			// this.scene.input.keyboard.on(..) -> allows me to add an actual "on"/"off" event on a key
			// this.scene.input.keyboard.addKey(...) -> turns off repeat keys
			//
			// I need to find a way to use ONE method, not both. Using both is wierd...
			virtualButton.phaserKeyObj = this.scene.input.keyboard.addKey(this.inputKeyboardMap[key]);

			this[key] = virtualButton;
		}

		this.createKeyCodeIndex();

		//for each virtual button, create a listener to change the virutal button's state
		for(var key in this.inputKeyboardMap)
		{
			this.scene.input.keyboard.on("keydown-"+this[key].phaserKeyCode, this.downFunc.bind(this));
			this.scene.input.keyboard.on("keyup-"+this[key].phaserKeyCode, this.upFunc.bind(this));
			this.scene.input.keyboard.addCapture(this[key].phaserKeyCode);
		}
	}

	//should be called when the scene shutsdown	
	shutdown() {
		for(var key in this.inputKeyboardMap)
		{
			this.scene.input.keyboard.off("keydown-"+this[key].phaserKeyCode);
			this.scene.input.keyboard.off("keyup-"+this[key].phaserKeyCode);
			this.scene.input.keyboard.removeCapture(this[key].phaserKeyCode);
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
			this.anyInput = false;
			for(var key in this.inputKeyboardMap)
			{
				if(this[key].state)
				{
					this.anyInput = true;
				}
				this[key].prevState = this[key].state;
				
			}
			this.isDirty = false;
		}
	}
}

