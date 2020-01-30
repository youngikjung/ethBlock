"use strict";

const express     = require('express');
const db          = require('./db.js');
const bodyParser  = require('body-parser');
const app         = express();
db;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(3000, function(){
    console.log('server has started on port 3000');
});


const router = require('./router/main')(app);
