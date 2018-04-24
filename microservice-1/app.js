var express = require('express');
var app = express();

// Routes
app.get('/', function(req, res) {
  res.send('Hello! This is microservice-1 v' + process.env.npm_package_version + '.');
});

// Listen
var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on localhost:'+ port);
