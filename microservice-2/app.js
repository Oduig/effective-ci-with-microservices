var express = require('express');
var app = express();

// Routes
app.get('/', function(req, res) {
  res.send('Hello! This is microservice 2 version ' + process.env['VERSION'] + '.');
});

// Listen
var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on localhost:'+ port);