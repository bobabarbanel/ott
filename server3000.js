"use strict";

const MongoClient = require('mongodb').MongoClient;
//const assert      = require('assert');
//const path        = require('path');

const express = require('express');
//const bodyParser  = require('body-parser');

const app = express();
var myArgs = process.argv.slice(2);
var url;
switch (myArgs[0]) {
  case 'remote':
    url = 'mongodb://rabarbanel:#17Mongo17@ottcluster0-shard-00-00-dor0p.mongodb.net:27017,ottcluster0-shard-00-01-dor0p.mongodb.net:27017,ottcluster0-shard-00-02-dor0p.mongodb.net:27017/parts?ssl=true&replicaSet=OttCluster0-shard-0&authSource=admin';
    console.log("Remote Mongo on Atlas");
    break;

  default:
    url = 'mongodb://localhost:27017/parts'; // Mongo Parts DB
    console.log('Local Mongo URL');
}


const port = process.env.port || 3000;
const topRouter = require("./controllers/topRouter");
//var db;

MongoClient.connect(url, (err, database) => {
  if (err) { return console.log("Mongo Error: " + err); }

  const db = database;
  topRouter(__dirname, app, db); // loads routers, and provides access there to these variables

  app.listen(port, () => {
    console.log('Ott App listening on ' + port + '. Mongo "parts" is connected');
  });

});






