import Phaser from 'phaser';
import GameManagerScene from './scenes/game-manager-scene.js'

export default class Client {
	constructor() {
		this.game = {};
		this.config = {};

		this.config = {
			type: Phaser.AUTO,
			backgroundColor: '#333333',
			width: 256,
			height:256,
			parent: 'game-div',
			pixelArt: true,
			physics: {
				default: 'arcade',				
				arcade: {
					debug: true,
					debugShowBody: true,
					debugShowStaticBody: true,
					debugShowVelocity: true,
					gravity: {
						y: 300
					}
				}
			},
			scale: {
				zoom:3
			}
		}

		this.game = new Phaser.Game(this.config);
		this.game.scene.add('game-manager-scene', GameManagerScene, true);
	}
}





//feels like a hacky way to start...oh well. Its simple atleast.
var app = new Client();


