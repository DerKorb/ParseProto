/**
 * Created by ksollner on 15.02.14.
 */
/*
 * GET home page.
 */
async = require("async");
mongoose = require("mongoose");
mongoose.connect('mongodb://feinarbyte.de/protoparse');

mysql = require("mysql");
connection = mysql.createConnection({
    host: "feinarbyte.de",
    user: "parse_user",
    password: "mQhURtm4qaLbsxl",
    database: "parse_db"
});
connection.connect();

function err(err) {
    if (err)
        throw(err);
}

var Transaction = mongoose.model('Transaction', {
    address: {type: String, index: true},
    change: Number,
    block: Number,
    time: Number,
    day: {type: Number, index: true}
});

var Donation = mongoose.model('Donation', {
    address: {type: String, index: true},
    amount: Number,
    block: Number,
    time: Number,
    day: {type: Number, index: true}
});

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
    host: 'localhost',
    port: 3838,
    user: 'protosharespc',
    pass: 'alibabatrinktmeinenkaba!'
});

var currentBlockCount = 0;
var parsedBlocks = 1;
var currentBlockTime = 0;

var transactions = {};
var pts_addresses = {};
var ags_addresses = {};

var coin = function(val)
{
    return Math.round(val*100000000);
}

currentDay = 0;
function getNextBlock()
{
    // get number of blocks
    var block = {};
    client.cmd('getblockcount', function (err, block_count)
    {
        if (err)
            return console.log(err);

        // if we already parsed all blocks try again in 10 seconds
        if (parsedBlocks >= block_count)
            return setTimeout(getNextBlock, 10000);


        block.height = parsedBlocks;
        currentBlockCount = block_count;

        // get the block hash
        client.cmd('getblockhash', parsedBlocks, function(err, block_hash)
        {
            if (err)
                return console.log(err);
            // get the block
            block.hash = block_hash;
            client.cmd('getblock', block_hash , function(err, block_info)
            {
                if (err)
                    return console.log(err);

                // update current block time
                currentBlockTime = block_info.time;
                block.time = block_info.time;
                if (Math.ceil(block_info.time/86400-16015) > currentDay)
                {
                    currentDay++;
                    console.log("Day:",currentDay);
                }

                // get all transactions
                block.rawtransactions = [];
                block.transactions = [];
                // Query this block's transaction infos before processing them
                async.mapSeries(block_info.tx, function(txid, txInfoCallback)
                {

                    client.cmd('getrawtransaction', txid, function(err, rawtransaction)
                    {
                        if (err)
                            console.log(err, txid);
                        client.cmd('decoderawtransaction', rawtransaction, txInfoCallback);
                    });
                    // process them
                }, function(err, block_transactions)
                {
                    if (err)
                        console.log(err);
                    async.eachSeries(block_transactions, function(transaction_info, transactionCallback)
                    {
                        var outputs = [];
                        var inputs = [];
                        async.eachSeries(transaction_info.vin, function(input, eachInputCallback)
                        {
                            // ignore mined coins as inputs
                            if (!input.txid)
                                return eachInputCallback(null);

                            var input_address = transactions[input.txid].outputs[input.vout].address;
                            inputs.push({address: input_address});

                            // update protoshares
                            var pts_address = pts_addresses[input_address];
                            pts_address.transactions.push({change: -pts_address.balance, time: block_info.time});

                            // update database:
                            if (pts_address.balance!=0)
                            {
                                pts_address.balance = 0;
                                connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?)", [input_address, parsedBlocks, block_info.time, currentDay, coin(-pts_address.balance)], eachInputCallback);
                            }
                            else
                                eachInputCallback(null);

                        }, function(err)
                        {
                            async.eachSeries(transaction_info.vout, function(output, eachOutputCallback)
                            {
                                var output_address = output.scriptPubKey.addresses[0];
                                outputs.push({address: output_address, value: output.value});

                                // update protoshares
                                if (!pts_addresses[output_address])
                                    pts_addresses[output_address] = {transactions: [], ags_donations: [], balance: 0};

                                pts_addresses[output_address].balance+=output.value;
                                pts_addresses[output_address].transactions.push({change: output.value, time: block_info.time});

                                // update database:
                                if (output_address == "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
                                {
                                    var donation_address = inputs[0].address;
                                    connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?); " +
                                        "INSERT INTO donations (address, block, time, day, 'amount') VALUES (?, ?, ?, ?, ?)", [output_address, parsedBlocks, block_info.time, currentDay, coin(output.value), donation_address, parsedBlocks, block_info.time, currentDay, coin(output.value)], eachOutputCallback);
                                }
                                else
                                {
                                    connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?)", [output_address, parsedBlocks, block_info.time, currentDay, coin(output.value)], eachOutputCallback);
                                }

                            }, function(err)
                            {
                                transactions[transaction_info.txid] = {outputs: outputs};
                                transactionCallback(err);
                            });
                        });

                    }, function(err)
                        {
                            if(err)
                                console.log(err);
                            getNextBlock(++parsedBlocks);
                        }
                    );
                });
            });
        });
    });
}

getNextBlock();

/*Transaction.remove({}, function(err, result)
{
    Donation.remove({}, function(err, result)
    {
    });
});*/

