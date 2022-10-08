var PhaserDrawLayers = {
	tilemapBaseLayer: 0,
	gravestoneLayer: 100,
	glowLayer: 200,
	textLayer: 300,
	spriteLayer: 400,
	hpBarLayer: 500,
	projectileLayer: 600,
	hitboxLayer: 700,
	serverHitboxLayer: 800,
	mouseOverLayer: 900,
	myTextLayer: 1000,
	tilemapTopLayer: 1100,
	UILayer: 2000
};

var CameraModes = {
	CAMERA_MODE_SPECTATOR: 0,
	CAMERA_MODE_FOLLOW_CHARACTER: 1,
	CAMERA_MODE_DEATH_CAM: 2,
	CAMERA_MODE_SNIPER_ENTER: 3,
	CAMERA_MODE_SNIPER_AIMING: 4,
	CAMERA_MODE_SNIPER_EXIT: 5
}

export default {
	PhaserDrawLayers: PhaserDrawLayers,
	CameraModes: CameraModes
};
