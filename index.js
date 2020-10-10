const express = require('express');
const path = require('path');
const websocket = require('ws');
const {GameServer} = require("./server/game-server.js");
const app = express();

const port = 7000;


//create headless websocket server
const wssConfig = {
	noServer: true,
	clientTracking: true
}

const wss = new websocket.Server(wssConfig);

//create http server
const expressServer = app.listen(port, () => {console.log('Webserver listening on port %s', port)});


//adding basic http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});

//static files
app.use('/assets', express.static(path.join(__dirname, "assets")));
app.use('/client-dist', express.static(path.join(__dirname, "client-dist")));

//make the game server
var gs = new GameServer();
gs.init();

//create http upgrade endpoint to do websocket handshake
expressServer.on('upgrade', (req, socket, head) => {
	//let the game server handle the websocket callbacks
	return wss.handleUpgrade(req, socket, head, gs.onopen.bind(gs));
})

