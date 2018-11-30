"use strict";
const MongoClient = require('mongodb').MongoClient;
//const assert      = require('assert');
const path        = require('path');

const express = require('express');
const bodyParser  = require('body-parser');
const cookieParser = require('cookie-parser');


const app = express();
var myArgs = process.argv.slice(2);
var url;


switch (myArgs[0]) {
  case 'remote':
    url = 'mongodb://rabarbanel:#17Mongo17@ottcluster0-shard-00-00-dor0p.mongodb.net:27017,ottcluster0-shard-00-01-dor0p.mongodb.net:27017,ottcluster0-shard-00-02-dor0p.mongodb.net:27017/parts?ssl=true&replicaSet=OttCluster0-shard-0&authSource=admin';
    console.log("Remote Mongo on Atlas");
    break;

  default:
    url = 'mongodb://localhost:27017'; // Mongo Parts DB
    console.log('Local Mongo URL');
}


const port = process.env.port || 3100;
const topRouter = require("./controllers/topRouter");
// const fs = require('fs-extra');

MongoClient.connect(url, {useNewUrlParser: true}, 
  (err, database) => {
    if (err) { return console.log("Mongo Error: " + err); }
    let dir = __dirname;

    const db = database.db('parts');
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'ejs');

    app.use(express.static(path.join(dir, '/public')));
    app.use('/img', express.static(path.join(dir, 'public/img')));
    app.use('/js', express.static(path.join(dir, 'public/js')));
    app.use('/css', express.static(path.join(dir, 'public/css')));
    app.set('views', path.join(dir, 'public/tabs'));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    

    // loads routers, and provides access there to these variables
    topRouter(dir, app, db);

    /////////////DEBUG
    // const today = new Date();
    // fs.writeFileSync('undoLog.txt', '---------' + today.toString() + "\n");
    /////////////DEBUG

    app.listen(port, () => {
      console.log('Ott App listening on ' + port + '. Mongo "parts" is connected');
    });

  });
