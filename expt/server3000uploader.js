const express     = require('express');
const upload = require('./controllers/uploadRouter');
const app         = express();
const port        = process.env.port || 3000;

//var db;


  upload(__dirname, app); // loads routers, and provides access there to these variables
  
  app.listen(port, () => {
    console.log('mnode FILEUPLOADER listening on ' + port);
  });
  
  
    
  








