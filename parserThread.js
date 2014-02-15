/**
 * Created by ksollner on 15.02.14.
 */
/*
 * GET home page.
 */
async = require("async");

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

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
    host: 'localhost',
    port: 3838,
    user: 'mytestuser',
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

var query1Values = [];
var query2Values = [];

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
        {
            if (query1Values.length > 0)
            {
                connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES ?", [query1Values], function(err, result)
                {
                    if (query2Values.length > 0)
                    {
                        connection.query("INSERT INTO donations (address, block, time, day, 'amount') VALUES ?",[query2Values], function(err, result)
                        {
                            return setTimeout(getNextBlock, 10000);
                        });
                        query2Values = [];
                    }
                    else
                        return setTimeout(getNextBlock, 10000);
                });
                query1Values = [];
            }
            else
                return setTimeout(getNextBlock, 10000);
        }

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
                            var input_value = transactions[input.txid].outputs[input.vout].value;
                            inputs.push({address: input_address});

                            // update protoshares
                            //var pts_address = pts_addresses[input_address];
                            //pts_address.transactions.push({change: -pts_address.balance, time: block_info.time});

                            // update database:
//                            if (pts_address.balance!=0)
 //                           {
                                //connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?)", , eachInputCallback);
                                query1Values.push([input_address, parsedBlocks, block_info.time, currentDay, coin(-input_value)]);
                                eachInputCallback();
                                //pts_address.balance -= input_value;
   //                         }
     //                       else
       //                         eachInputCallback(null);

                        }, function(err)
                        {
                            async.eachSeries(transaction_info.vout, function(output, eachOutputCallback)
                            {
                                var output_address = output.scriptPubKey.addresses[0];
                                outputs.push({address: output_address, value: output.value});

                                // update protoshares
                                /*if (!pts_addresses[output_address])
                                    pts_addresses[output_address] = {transactions: [], ags_donations: [], balance: 0};

                                pts_addresses[output_address].balance+=output.value;
                                pts_addresses[output_address].transactions.push({change: output.value, time: block_info.time});*/

                                query1Values.push([output_address, parsedBlocks, block_info.time, currentDay, coin(output.value)]);
                                // update database:
                                if (output_address == "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
                                {
                                    var donation_address = inputs[0].address;
                                    query2Values.push([donation_address, parsedBlocks, block_info.time, currentDay, coin(output.value)]);
                                    //connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?); " +
                                     //   "INSERT INTO donations (address, block, time, day, 'amount') VALUES (?, ?, ?, ?, ?)", [output_address, parsedBlocks, block_info.time, currentDay, coin(output.value), donation_address, parsedBlocks, block_info.time, currentDay, coin(output.value)], eachOutputCallback);
                                }
                                else
                                {
                                    //connection.query("INSERT INTO transactions (address, block, time, day, `change`) VALUES (?, ?, ?, ?, ?)", , eachOutputCallback);
                                }
                                eachOutputCallback();

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

