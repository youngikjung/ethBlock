"use strict";

// [LOAD PACKAGES]
const mongoose = require("mongoose");

// [DB SETTING]
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// CONNECT TO MONGODB SERVER
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/ethDB', { useUnifiedTopology: true });
const db = mongoose.connection;

db.once("open", function(){
  console.log("DB connected");
});

db.on("error", function(err){
  console.log("DB ERROR : ", err);
});

