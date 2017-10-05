const MongoClient = require('mongodb').MongoClient;
//const assert      = require('assert');
//const path        = require('path');

const express     = require('express');
//const bodyParser  = require('body-parser');

const app         = express();
const url         = 'mongodb://localhost:27017/parts'; // Mongo Parts DB
const port        = process.env.port || 3000;
const topRouter   = require("./controllers/topRouter");
//var db;

MongoClient.connect(url, (err, database) => {
  if (err) return console.log("Mongo Error: " + err);
  
  const db = database;
  topRouter(__dirname, app, db); // loads routers, and provides access there to these variables
  
  app.listen(port, () => {
    console.log('Ott App listening on ' + port +'. Mongo "parts" is connected');
  });
  
});






