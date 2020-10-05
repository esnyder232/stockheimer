// const express = require('express');
// const path = require('path');
// const app = express();

// const port = 6000;

// //create http server
// const server = app.listen(port, () => {console.log('Webserver listening on port %s', port)});


// //adding basic http endpoints
// app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
// app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});





const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const {GameWorld} = require("./server/game-world.js");
const app = express();

const port = 8080;


//create headless websocket server
const wssConfig = {
	noServer: true,
	clientTracking: true
}

const wss = new WebSocket.Server(wssConfig);

//create http server
const server = app.listen(port, () => {console.log('Webserver listening on port %s', port)});


//adding basic http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});

//static files
app.use('/assets', express.static(path.join(__dirname, "assets")));
app.use('/client-dist', express.static(path.join(__dirname, "client-dist")));

//create http endpoint to do websocket handshake
server.on('upgrade', (req, socket, head) => {
	console.log('Someone is connectiong with websockets. Handling websocket handshake...');
	return wss.handleUpgrade(req, socket, head, onopen.bind(this));
})

//make a example game world
var gw = new GameWorld();
gw.create();
//gw.startGameLoop();


function onopen(socket) {
	console.log('Websocket connected!');
	socket.on("close", onclose.bind(this, socket));
	socket.on("error", onerror.bind(this, socket));
	socket.on("message", onmessage.bind(this, socket));
	socket.on("pong", onpong.bind(this, socket));
	socket.ping("this is a ping");

	gw.onopen(socket);	
}
function onclose(socket, m) {	
	gw.onclose(socket, m);	
}
function onerror(socket, m) {
	gw.onerror(socket, m);
}
function onmessage(socket, m) {
	gw.onmessage(socket, m);
}
function onpong(socket, m) {
	gw.onpong(socket, m);
}


