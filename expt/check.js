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
  
  app.listen(port, () => {
    console.log('App listening on ' + port +'. Mongo "parts" is connected');
  })
  
  db.collection("main").find().toArray(function(err, documents) {
        documents.forEach((item,index) => {
            var id = item._id;
            var attrs = [item.dept,item.machine,item.op,item.pName,item.partId].join("|");
            if(id !== attrs){
                console.log(id);
            }
            //console.log(id);
            //console.log(attrs);
            //console.log("");
        });

        db.close();
      });
});







