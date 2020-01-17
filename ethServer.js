"use strict";

// [LOAD PACKAGES]
var express     = require('express');
var db          = require('./db.js');
var app         = express();
db;

// [RUN SERVER]
var server = app.listen(3000, function(){
    console.log('server has started on port 3000');
});

// [CONFIGURE ROUTER]
var router = require('./router/main')(app);
