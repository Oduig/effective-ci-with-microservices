var fs = require('fs')
var express = require('express');
var app = express();
var version = fs.readFileSync('VERSION', 'utf8').trim();

// Routes
app.get('/', function(req, res) {
  res.send('Hello! This is microservice-1 v');
});

// Listen
var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on localhost:'+ port);
