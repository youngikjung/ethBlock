"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Block = new Schema({
    number              : {type: Number, index: {unique: true}},
    hash                : String,
    parentHash          : String,
    nonce               : String,
    sha3Uncles          : String,
    logsBloom           : String,
    transactionsRoot    : String,
    stateRoot           : String,
    receiptRoot         : String,
    miner               : String,
    difficulty          : String,
    totalDifficulty     : String,
    size                : Number,
    extraData           : String,
    gasLimit            : Number,
    gasUsed             : Number,
    timestamp           : Number,
    blockTime           : Number,
    transaction         : [String],
    uncles              : [String]
});

var Transaction = new Schema({
    hash                : {type: String, index: {unique: true}},
    nonce               : Number,
    blockHash           : String,
    blockNumber         : Number,
    transactionIndex    : Number,
    from                : String,
    to                  : String,
    value               : String,
    gas                 : Number,
    gasPrice            : String,
    timestamp           : Number,
    input               : String,
    usedGas             : String
    }, {collection: "Transaction"}
);

mongoose.model('Block', Block);
mongoose.model('Transaction', Transaction);

module.exports.Block = mongoose.model('Block');
module.exports.Transaction = mongoose.model('Transaction');


