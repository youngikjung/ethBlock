"use strict";

require('../blockSchema');

const Web3                = require('web3');
const web3                = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
const utils               = require('../util')
const mongoose            = require('mongoose');
const bigNumber           = require('bignumber.js');
const blockSchema         = mongoose.model('Block');
const transactionSchema   = mongoose.model('Transaction');
const logger              = require('../utils/logger');

module.exports = function(app, fs)
{
    app.get('/getBlockDB', async (req, res) => {
        try {
            if (res.ok) { // res.status >= 200 && res.status < 300
              let _newDBblocks  = await initBlock();
              res.json(_newDBblocks);
            } else {
              res.end('error :' + res.statustext);
              logger.error(error);  
            }
        } catch (error) {
            res.end(error);
        }
    });

    app.get('/getTxDB', async (req, res) => {
        try {
            let _newDBtransactions = await initTransaction();
            res.json(_newDBtransactions);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/getDBblocksInfo', async (req, res) => {
        try {
            let _DBblocksInfo  = await fn_mfBlock();
            res.json(_DBblocksInfo);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/getDBtxsInfo', async (req, res) => {
        try {
            let _DBtxsInfo  = await fn_mfTx();
            res.json(_DBtxsInfo);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/latest/:select', async (req, res) => {
        try {
            let block   = {};
            let _select = req.params.select;
            let _latest = await fn_latest(_select);

            if(_select == 'latest') {
                block = await getBlock(_latest);
            } else {
                block = await getTransaction(_latest);
            }
            res.end(block);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/latestTransactions', async (req, res) => {
        try {
            let block = await fn_latest();
            res.end(block);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/newBlockHeaders/:select', async (req, res) => {
        try {
            let _select = req.params.select;
            logger.info(_select);
            let result  = await subscribe(_select);
            res.end(result);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/getBlock/:blockNumber', async (req, res) => {
        try {
            let _blockNumber = req.params.blockNumber;
            let result  = await getBlock(_blockNumber);
            res.end(result);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/getTransaction/:transactionHash', async (req, res) => {
        try {
            let _transactionHash = req.params.transactionHash;
            let result  = await getTransaction(_transactionHash);
            res.end(result);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/newAccount/:passwd', async (req, res) => {
        try {
            let _passwd = req.params.passwd;
            let result  = await newAccount(_passwd);
            res.end(result);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });

    app.get('/getBalance/:address', async (req, res) => {
        try {
            let _address = req.params.address;
            let result  = await getBalance(_address);
            res.end(result);
        } catch (error) {
            res.end(error);
            logger.error(error);
        }
    });
}

var initBlock = async () => {
    let resultList =[];
    let block = await blockSchema.find({}, 'number')
                                 .sort('-number')
                                 .limit(10);
    for(let i = 0; i < block.length; i++) {
        let DBblocks = {};
        DBblocks.block = block[i];
        let xHash = DBblocks.block.number;
        resultList.push(xHash);
    };
    return resultList;
}

var initTransaction = async () => {
    let resultList =[];
    let dbTxNm = await transactionSchema.find({}, 'hash')
                                        .sort('-blockNumber')
                                        .limit(10);
    for(let i = 0; i < dbTxNm.length; i++) {
        let dbTxs = {};
        dbTxs.hash = dbTxNm[i];
        let xHash = dbTxs.hash.hash;
        resultList.push(xHash);
    };
    return resultList;
}

var fn_mfBlock = async () => {
    try {
        let block = await blockSchema.find({},{number : 1, gasLimit : 1, gasUsed : 1, uncles : 1, transactions : 1, _id : 0})
                                     .sort('-number')
                                     .limit(20);
        return block;
    } catch (error) {
        logger.error(error);
    }
}

var fn_mfTx = async () => {
    try {
        let tx = await transactionSchema.find({}).select('-_id hash blockNumber from to usedGas value').sort('-blockNumber').limit(20);
        return tx;
    } catch (error) {
        logger.error(error);
    }
}

var initializeBlock = async () => {
    let dbBlock     =  0;
    let newBlock    = await web3.eth.blockNumber;
    logger.info('web3.eth.blockNumber :' + newBlock);
    let dbBlockNm   = await blockSchema.find({}, 'number')
                                       .sort('-number')
                                       .limit(1);
    if(dbBlockNm == ''){
        dbBlock  = newBlock - 1;
        newBlock = newBlock + 1;
        logger.info('dbBlock :' + 0);
    } else {
        newBlock    = newBlock - 5;
        dbBlock     = dbBlockNm[0].number;
        logger.info('dbBlock :' + dbBlock);
    }

    if(newBlock > dbBlock) {
        let inDBBlock    = dbBlock + 1;
        let newBlockData = await getBlock(inDBBlock);

        let jsonHash = JSON.parse(newBlockData);
        let txHash = jsonHash.transactions;

        if(txHash != '' || txHash != undefined) {
            logger.info('\t transactions DB INSERT START');
            await insertTransactionsToDB(newBlockData);
        }
        logger.info('\t block DB INSERT START');
        await insertBlockToDB(newBlockData);
        logger.info('RESTART INSERT DB after 10sec');
        fn_countdown();
    } else {
        logger.info('RESTART INSERT DB after 10sec');
        fn_countdown();
    }
}

var insertBlockToDB = async (newBlockData) => {
    let newBlock = JSON.parse(newBlockData)
    blockSchema.collection.insertOne(newBlock, function(err, result) {
        if ( typeof err !== 'undefined' && err ) {
            logger.error('Error: Aborted due to error on DB: ' + err);
            process.exit(9);
        }else{
            logger.info('* ' + result.insertedCount + ' blocks successfully written.');
        }
    });
}

var insertTransactionsToDB = async (newBlockData) => {
    let jsonHash = JSON.parse(newBlockData);
    let txHash = jsonHash.transactions;
    logger.info('* ' + txHash.length + ' 개의 transactions');
    txHash.forEach(async (item) => {
        let transactionsHash = await getTransaction(item);
        let Hash = JSON.parse(transactionsHash);

        transactionSchema.collection.insertOne(Hash, function( err, tx ){
            if ( typeof err !== 'undefined' && err ) {
                logger.error('\t Error: Aborted due to error on Transaction: ' + err);
                process.exit(9);
            }
        });
    })
    logger.info('* ' + txHash.length + ' transactions successfully recorded.');
}

var fn_latest = async (_select)=> {
    return new Promise(function (resolve, reject) {
        try{
            let filter = web3.eth.filter(_select);
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
    }).catch(e => logger.error(e));
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
    }).catch(e => logger.error(e));
};

var getTransaction = async function(_transactionHash) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getTransaction(_transactionHash, function(error, result){
                if(error) {
                    let msg = {};
                    resolve(msg);
                } else {
                    let usedGas     = new bigNumber(Number(result.gas) * Number(result.gasPrice) * 1000000000000000000);
                    result.usedGas  = usedGas;
                    resolve(JSON.stringify(result))
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => logger.error(e));
};

var newAccount = async function(_passwd) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.personal.newAccount(_passwd, function(error, result) {
                if(error){
                    let msg = {};
                    resolve(msg);
                } else {
                    resolve(JSON.stringify(result))
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => logger.error(e));
};

var getBalance = async function(_address) {
    return new Promise(function (resolve, reject) {
        try {
            web3.eth.getBalance(_address, function (error, result) {
                if(error){
                    let msg = {};
                    resolve(msg);
                } else {
                    let ethBalance = utils.toEther(String(result));
                    resolve(ethBalance);
                }
            });
        } catch (error) {
            reject(error);
        }
    }).catch(e => logger.error(e));
};

function fn_countdown() {
    let checkFlag = false;
    let count     = 10;
    let countdown = setInterval(function(){
        if(checkFlag = false){
            logger.info('\t' + count + '초후 시작');
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
logger.info('START DB INSERT after 10sec');
