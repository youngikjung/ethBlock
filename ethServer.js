"use strict";

// [LOAD PACKAGES]
const express     = require('express');
const db          = require('./db.js');
const app         = express();
db;

// [RUN SERVER]
const server = app.listen(3000, function(){
    console.log('server has started on port 3000');
});

// [CONFIGURE ROUTER]
const router = require('./router/main')(app);
