const express = require('express');
const path = require('path');
const app = express();

const port = 6000;

//create http server
const server = app.listen(port, () => {console.log('Webserver listening on port %s', port)});


//adding basic http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});

