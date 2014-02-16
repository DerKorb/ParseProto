/**
 * Created by ksollner on 15.02.14.
 */
/*
 * This is the javascript file that pulls the transaction data from protosharesd via rpc
 * and fills the sql database with it. You need this thread permanently to keep the database
 * up to date. I recomment pm2(https://github.com/Unitech/pm2)
 * You also need to setup the mysql server, database and tables and change the login data accordingly
 */
async = require("async");

mysql = require("mysql");
connection = mysql.createConnection({
    host: "localhost",
    user: "parse_user",
    password: "mQhURtm4qaLbsxl",
    database: "parse_db",
    multipleStatements: true
});
connection.connect();

function err(err) {
    if (err)
        throw(err);
}

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
    host: 'localhost',
    port: 3838,
    user: 'mytestuser',
    pass: 'alibabatrinktmeinenkaba!'
});

var addresses = {};
var addresscount = 0;

var currentBlockCount = 0;
var parsedBlocks = 1;
var currentBlockTime = 0;

var transactions = {};

var coin = function (val) {
    return Math.round(val * 100000000);
}

var query1Values = [];
var query2Values = [];
var query3Values = [];


currentDay = 0;

addressId = function (address) {
    if (!addresses[address]) {
        addresses[address] = ++addresscount;
        query3Values.push([address, addresscount]);
        return addresscount;
    }
    return addresses[address];
}

function getNextBlock() {
    // get number of blocks
    var block = {};
    client.cmd('getblockcount', function (err, block_count) {
        if (err)
            return console.log(err);

        // if we already parsed all blocks try again in 10 seconds
        if (parsedBlocks >= block_count) {
            return setTimeout(getNextBlock, 10000);
        }

        block.height = parsedBlocks;
        currentBlockCount = block_count;

        // get the block hash
        client.cmd('getblockhash', parsedBlocks, function (err, block_hash) {
            if (err)
                return console.log(err);
            // get the block
            block.hash = block_hash;
            client.cmd('getblock', block_hash, function (err, block_info) {
                if (err)
                    return console.log(err);

                // update current block time
                currentBlockTime = block_info.time;
                block.time = block_info.time;
                if (Math.ceil(block_info.time / 86400 - 16015) > currentDay) {
                    currentDay++;
                    // Do "daily" bulk inserts for better performance
                    if (query1Values.length > 0) {
                        connection.query("INSERT INTO transactions2 (id_address, block, time, day, `change`) VALUES ?", [query1Values], function (err, result) {
                            if (err)
                                console.log("q1", err);
                        });
                        query1Values = [];
                    }
                    if (query3Values.length > 0) {
                        connection.query("INSERT INTO addresses (address, id) VALUES ?", [query3Values], function (err, result) {
                            if (err)
                                console.log("q2", err);
                        });
                        query3Values = [];
                    }
                    if (query2Values.length > 0) {
                        connection.query("INSERT INTO donations (address, block, time, day, amount) VALUES ?", [query2Values], function (err, result) {
                            if (err)
                                console.log("q3", err);
                        });
                        query2Values = [];
                    }
                    console.log("Day:", currentDay);
                }

                // get all transactions
                block.rawtransactions = [];
                block.transactions = [];
                // Query this block's transaction infos before processing them
                async.mapSeries(block_info.tx, function (txid, txInfoCallback) {

                    client.cmd('getrawtransaction', txid, function (err, rawtransaction) {
                        if (err)
                            console.log(err, txid);
                        client.cmd('decoderawtransaction', rawtransaction, txInfoCallback);
                    });
                    // process them
                }, function (err, block_transactions) {
                    if (err)
                        console.log(err);

                    block_transactions.forEach(function (transaction_info) {
                        var outputs = [];
                        var inputs = [];
                        transaction_info.vin.forEach(function (input) {
                            // ignore mined coins as inputs
                            if (!input.txid)
                                return;

                            var input_address = transactions[input.txid].outputs[input.vout].address;
                            var input_value = transactions[input.txid].outputs[input.vout].value;
                            inputs.push({address: input_address});
                            query1Values.push([addressId(input_address), parsedBlocks, block_info.time, currentDay, coin(-input_value)]);
                        });
                        transaction_info.vout.forEach(function (output) {
                            var output_address = output.scriptPubKey.addresses[0];
                            outputs.push({address: output_address, value: output.value});

                            query1Values.push([addressId(output_address), parsedBlocks, block_info.time, currentDay, coin(output.value)]);
                            if (output_address == "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw") {
                                var donation_address = inputs[0].address;
                                query2Values.push([addressId(donation_address), parsedBlocks, block_info.time, Math.ceil(block_info.time / 86400 - 16015), coin(output.value)]);
                            }
                        });
                        transactions[transaction_info.txid] = {outputs: outputs};
                    });
                    parsedBlocks++;
                    setImmediate(getNextBlock);
                });
            });
        });
    });
}

// on startup: empty database and start over filling the database
connection.query("DELETE FROM transactions2; DELETE FROM donations; DELETE FROM addresses", function (err, reuslt) {
    if (err)
        throw(err);
    getNextBlock();
});

