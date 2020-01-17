"use strict";

require('../blockSchema');

var Web3                = require('web3');
var web3                = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
var utils               = require('../util')
var mongoose            = require('mongoose');
var bigNumber           = require('bignumber.js');
var blockSchema         = mongoose.model('Block');
var transactionSchema   = mongoose.model('Transaction');

module.exports = function(app, fs)
{
    app.get('/getBlockDB', async (req, res) => {
        try {
            var _newDBblocks  = await initBlock();
            res.json(_newDBblocks);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getTxDB', async (req, res) => {
        try {
            var _newDBtransactions = await initTransaction();
            res.json(_newDBtransactions);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getDBblocksInfo', async (req, res) => {
        try {
            var _DBblocksInfo  = await fn_mfBlock();
            res.json(_DBblocksInfo);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getDBtxsInfo', async (req, res) => {
        try {
            var _DBtxsInfo  = await fn_mfTx();
            res.json(_DBtxsInfo);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/latest/:select', async (req, res) => {
        try {
            var block   = {};
            var _select = req.params.select;
            var _latest = await fn_latest(_select);

            if(_select == 'latest') {
                block = await getBlock(_latest);
            } else {
                block = await getTransaction(_latest);
            }
            res.end(block);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/latestTransactions', async (req, res) => {
        try {
            var block = await fn_latest();
            res.end(block);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/newBlockHeaders/:select', async (req, res) => {
        try {
            var _select = req.params.select;
            console.log(_select);
            var result  = await subscribe(_select);
            res.end(result);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getBlock/:blockNumber', async (req, res) => {
        try {
            var _blockNumber = req.params.blockNumber;
            var result  = await getBlock(_blockNumber);
            res.end(result);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getTransaction/:transactionHash', async (req, res) => {
        try {
            var _transactionHash = req.params.transactionHash;
            var result  = await getTransaction(_transactionHash);
            res.end(result);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/newAccount/:passwd', async (req, res) => {
        try {
            var _passwd = req.params.passwd;
            var result  = await newAccount(_passwd);
            res.end(result);
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getBalance/:address', async (req, res) => {
        try {
            var _address = req.params.address;
            var result  = await getBalance(_address);
            res.end(result);
        } catch (error) {
            res.end(error);
        }
    });
}

var initBlock = async () => {
    var resultList =[];
    var block = await blockSchema.find({}, 'number')
                                 .sort('-number')
                                 .limit(10);
    for(var i = 0; i < block.length; i++) {
        var DBblocks = {};
        DBblocks.block = block[i];
        var xHash = DBblocks.block.number;
        resultList.push(xHash);
    };
    return resultList;
}

var initTransaction = async () => {
    var resultList =[];
    var dbTxNm = await transactionSchema.find({}, 'hash')
                                        .sort('-blockNumber')
                                        .limit(10);
    for(var i = 0; i < dbTxNm.length; i++) {
        var dbTxs = {};
        dbTxs.hash = dbTxNm[i];
        var xHash = dbTxs.hash.hash;
        resultList.push(xHash);
    };
    return resultList;
}

var fn_mfBlock = async () => {
    try {
        var block = await blockSchema.find({},{number : 1, gasLimit : 1, gasUsed : 1, uncles : 1, transactions : 1, _id : 0})
                                     .sort('-number')
                                     .limit(20);
        return block;
    } catch (error) {
        console.log(error);
    }
}

var fn_mfTx = async () => {
    try {
        var tx = await transactionSchema.find({}).select('-_id hash blockNumber from to usedGas value').sort('-blockNumber').limit(20);
        return tx;
    } catch (error) {
        console.log(error);
    }
}

var initializeBlock = async () => {
    var dbBlock     =  0;
    var newBlock    = await web3.eth.blockNumber;
    console.log('web3.eth.blockNumber :' + newBlock);
    var dbBlockNm   = await blockSchema.find({}, 'number')
                                       .sort('-number')
                                       .limit(1);
    if(dbBlockNm == ''){
        dbBlock  = newBlock - 1;
        newBlock = newBlock + 1;
        console.log('dbBlock :' + 0);
    } else {
        newBlock    = newBlock - 5;
        dbBlock     = dbBlockNm[0].number;
        console.log('dbBlock :' + dbBlock);
    }

    if(newBlock > dbBlock) {
        var inDBBlock    = dbBlock + 1;
        var newBlockData = await getBlock(inDBBlock);

        var jsonHash = JSON.parse(newBlockData);
        var txHash = jsonHash.transactions;

        if(txHash != '' || txHash != undefined) {
            console.log('\t transactions DB INSERT START');
            await insertTransactionsToDB(newBlockData);
        }
        console.log('\t block DB INSERT START');
        await insertBlockToDB(newBlockData);
        console.log('RESTART INSERT DB after 10sec');
        fn_countdown();
    } else {
        console.log('RESTART INSERT DB after 10sec');
        fn_countdown();
    }
}

var insertBlockToDB = async (newBlockData) => {
    var newBlock = JSON.parse(newBlockData)
    blockSchema.collection.insertOne(newBlock, function(err, result) {
        if ( typeof err !== 'undefined' && err ) {
            console.log('Error: Aborted due to error on DB: ' + err);
            process.exit(9);
        }else{
            console.log('* ' + result.insertedCount + ' blocks successfully written.');
        }
    });
}

var insertTransactionsToDB = async (newBlockData) => {
    var jsonHash = JSON.parse(newBlockData);
    var txHash = jsonHash.transactions;
    console.log('* ' + txHash.length + ' 개의 transactions');
    txHash.forEach(async (item) => {
        var transactionsHash = await getTransaction(item);
        var Hash = JSON.parse(transactionsHash);

        transactionSchema.collection.insertOne(Hash, function( err, tx ){
            if ( typeof err !== 'undefined' && err ) {
                console.log('\t Error: Aborted due to error on Transaction: ' + err);
                process.exit(9);
            }
        });
    })
    console.log('* ' + txHash.length + ' transactions successfully recorded.');
}

var fn_latest = async (_select)=> {
    return new Promise(function (resolve, reject) {
        try{
            var filter = web3.eth.filter(_select);
            filter.watch(function (error, result) {
                if(error){
                    resolve(error);
                } else {
                    resolve(result);
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => console.log(e));
}

var getBlock = async function(_blockNumber) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getBlock(_blockNumber, function(error, result) {
                if(error) {
                    resolve('msg :' + err);
                } else {
                    resolve(JSON.stringify(result));
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => console.log(e));
};

var getTransaction = async function(_transactionHash) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getTransaction(_transactionHash, function(error, result){
                if(error) {
                    var msg = {};
                    resolve(msg);
                } else {
                    var usedGas     = new bigNumber(Number(result.gas) * Number(result.gasPrice) * 1000000000000000000);
                    result.usedGas  = usedGas;
                    resolve(JSON.stringify(result))
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => console.log(e));
};

var newAccount = async function(_passwd) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.personal.newAccount(_passwd, function(error, result) {
                if(error){
                    var msg = {};
                    resolve(msg);
                } else {
                    resolve(JSON.stringify(result))
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => console.log(e));
};

var getBalance = async function(_address) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getBalance(_address, function (error, result) {
                if(error){
                    var msg = {};
                    resolve(msg);
                } else {
                    var ethBalance = utils.toEther(String(result));
                    resolve(ethBalance);
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => console.log(e));
};

function fn_countdown() {
    var checkFlag = false;
    var count     = 10;
    var countdown = setInterval(function(){
        if(checkFlag = false){
            console.log('\t' + count + '초후 시작');
        }
        if (count == 0) {
            checkFlag = true;
            clearInterval(countdown);
            initializeBlock();
        }
        count--;
    }, 600);
}

fn_countdown();
console.log('START DB INSERT after 10sec');
                                               