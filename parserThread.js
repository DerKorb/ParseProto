/**
 * Created by ksollner on 15.02.14.
 */
/*
 * GET home page.
 */
async = require("async");
mongoose = require("mongoose");
mongoose.connect('mongodb://feinarbyte.de/protoparse');

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
        if (parsedBlocks%100==0)
            console.log("block", parsedBlocks);

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

                // get all transactions
                block.rawtransactions = [];
                block.transactions = [];
                // Query this block's transaction infos before processing them
                async.mapSeries(block_info.tx, function(txid, cb)
                {
                    client.cmd('getrawtransaction', txid, function(err, rawtransaction)
                    {
                        if (err)
                            console.log(err, txid);
                        client.cmd('decoderawtransaction', rawtransaction, cb);
                    });
                    // process them
                }, function(err, block_transactions)
                {
                    if (err)
                        console.log(err);
                    block_transactions.forEach(function(transaction_info)
                    {
                        var outputs = [];
                        var inputs = [];
                        var angelOutput = 0;
                        for (var i = 0; i < Math.max(transaction_info.vin.length, transaction_info.vout.length); i++)
                        {
                            var input = transaction_info.vin[i];
                            if (input && input.txid)
                            {
                                var input_address = transactions[input.txid].outputs[input.vout].address;
                                inputs.push({address: input_address});

                                // update protoshares
                                var pts_address = pts_addresses[input_address];
                                pts_address.transactions.push({change: -pts_address.balance, time: block_info.time});

                                // update database:
                                if (pts_address.balance!=0)
                                {
                                    var trans = new Transaction({address: input_address, change: -pts_address.balance, block: parsedBlocks, time: block_info.time, day: Math.ceil(block_info.time/86400-16015)});
                                    trans.save();
                                    pts_address.balance = 0;
                                }
                            }
                        }
                        for (var i = 0; i < Math.max(transaction_info.vin.length, transaction_info.vout.length); i++)
                        {
                            var output = transaction_info.vout[i];
                            if (output)
                            {
                                var output_address = output.scriptPubKey.addresses[0];
                                outputs.push({address: output_address, value: output.value});

                                // update protoshares
                                if (!pts_addresses[output_address])
                                    pts_addresses[output_address] = {transactions: [], ags_donations: [], balance: 0};

                                pts_addresses[output_address].balance+=output.value;
                                pts_addresses[output_address].transactions.push({change: output.value, time: block_info.time});
                                // update database:
                                var trans = new Transaction({address: output_address, change: output.value, block: parsedBlocks, time: block_info.time, day: Math.ceil(block_info.time/86400-16015)});
                                trans.save();

                                // update ags
                                if (output_address == "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
                                {
                                    var donation_address = inputs[0].address;
                                    var donation = new Donation({address: donation_address, amount: output.value, block: parsedBlocks, time: block_info.time, day: Math.ceil(block_info.time/86400-16015)});
                                    donation.save();

                                }
                            }
                        }
                        transactions[transaction_info.txid] = {inputs: inputs, outputs: outputs};

                        if (angelOutput>0)
                            console.log(inputs[0].addresses[0], "=>", angelOutput);

                    });
                    getNextBlock(++parsedBlocks);
                });
            });
        });
    });
}

Transaction.remove({}, function(err, result)
{
    Donation.remove({}, function(err, result)
    {
        getNextBlock();
    });
});

