/*
 * GET home page.
 */
async = require("async");
/*mongoose = require("mongoose");
mongoose.connect('mongodb://protoparse');

var transaction = mongoose.model({
	address: String,
	change: Number,
	time: Number,
	toAngel: Boolean
});*/

exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

exports.ptsJson = function(req, res){
    var timestamp = false;
    var dateParts = req.query.date.split("-");
    timestamp = new Date(dateParts[2],dateParts[0],dateParts[1]).getTime()/1000;
	result = {blocknum: parsedBlocks, blocktime: currentBlockTime, balances: [], supply: 0};
	for(key in timestamp ? pts_addresses.filter : pts_addresses)
	{
		result.supply+=pts_addresses[key];
		address = {};
		address[key] = pts_addresses[key];
		result.balances.push(address);
	}
	res.send(result);
};

exports.agsJson = function(req, res){
}

exports.genesisBlock = function(req, res){
}

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
	host: 'localhost',
	port: 3838,
	user: 'mytestuser',
	pass: 'alibabatrinktmeinenkaba!'
});

var currentBlockCount = 0;
var parsedBlocks = 0;
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

		parsedBlocks++;
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
                        client.cmd('decoderawtransaction', rawtransaction, cb);
                    });
	            // process them
                }, function(err, transactions)
                {
	                transactions.forEach(function(transaction_info)
	                {
		                var outputs = [];
		                var inputs = [];
		                var angelOutput = 0;
		                transaction_info.vin.forEach(function(input)
		                {
			                if (!input.txid || !transactions[input.txid])
				                return;
			                if (!transactions[input.txid].outputs[input.vout])
				                console.log(transactions[input.txid].outputs, input.vout);
			                if (transactions[input.txid].outputs[input.vout].addresses.length > 1)
			                    conole.log("more than one adresses in array");
			                inputs.push({addresses: transactions[input.txid].outputs[input.vout].addresses});
			                // update protoshares
			                delete pts_addresses[transactions[input.txid].outputs[input.vout].addresses];
		                });
		                transaction_info.forEach(function(output)
		                {
			                outputs.push({addresses: output.scriptPubKey.addresses, value: output.value});
			                if (output.scriptPubKey.addresses == "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
			                    angelOutput = output.value;
			                // update protoshares
			                if (!pts_addresses[output.scriptPubKey.addresses])
				                pts_addresses[output.scriptPubKey.addresses] = {transactions: [], agsTransactions: [], balance: 0};
			                pts_addresses[output.scriptPubKey.addresses].balance+=output.value;
			                pts_addresses[output.scriptPubKey.addresses].transactions+=output.value;
		                });
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

getNextBlock();
