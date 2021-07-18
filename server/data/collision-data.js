//1/24/2021 - the ai_body is for ai characters. Its to prevent the ai_characters from detecting themselves (I think that was a big source of cpu usage on the server)
var CollisionCategories = {
	"user_sensor": 		0b00000000000000000000000000000001,
	"character_body": 	0b00000000000000000000000000000010,
	"ai_sensor": 		0b00000000000000000000000000000100,
	"projectile_body": 	0b00000000000000000000000000001000,
	"wall_body": 		0b00000000000000000000000000010000,
	"castle_body": 		0b00000000000000000000000000100000,
	"ai_body": 			0b00000000000000000000000001000000
};

var CollisionMasks = {
	"user_sensor":		0b00000000000000000000000001101010,
	"character_body":	0b00000000000000000000000001111111,
	"ai_sensor":		0b00000000000000000000000000100010,
	"projectile_body":	0b00000000000000000000000001110011,
	"wall_body":		0b00000000000000000000000001001010,
	"castle_body": 		0b00000000000000000000000001001111,
	"ai_body":			0b00000000000000000000000001111011
}

exports.CollisionCategories = CollisionCategories;
exports.CollisionMasks = CollisionMasks;