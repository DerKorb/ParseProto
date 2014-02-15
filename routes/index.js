/*
 * GET home page.
 */

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
                for (tx in block_info.tx)
                {
	                var numTxFinished = 0;
	                client.cmd('getrawtransaction', block_info.tx[tx] , function(err, rawtransaction)
                    {
                        // if the transaction contains no unspent outputs it will give an error
                        if (err)
                        {
                            // if we parsed all transaction continue with next block
                            if (++numTxFinished == block_info.tx.length)
                                getNextBlock(++parsedBlocks);
                            // else wait for other transactions
                            return;
                        }
	                    block.rawtransactions.push(rawtransaction);
						//console.log(block);
                        // if the transaction contains unspent outputs parse them
                        client.cmd('decoderawtransaction', rawtransaction , function(err, transaction_info)
                        {
                            if (err)
                                return console.log(err);

	                        var outputs = [];
	                        var inputs = [];
                            for (i in transaction_info.vout)
                            {
                                var output = transaction_info.vout[i];
	                            outputs.push({addresses: output.scriptPubKey.addresses, value: output.value});
                                // update protoshares
                            }
                            for (i in transaction_info.vin)
                            {
                                var input = transaction_info.vin[i];
	                            if (!input.txid || !transactions[input.txid])
	                                continue;
	                            if (!transactions[input.txid].outputs[input.vout])
	                                console.log(transactions[input.txid].outputs, input.vout);
	                            inputs.push({addresses: transactions[input.txid].outputs[input.vout].addresses});
                            }
	                        transactions[block_info.tx[tx]] = {inputs: inputs, outputs: outputs};

	                        // update protoshares
                            if (!pts_addresses[output.scriptPubKey.addresses])
                                pts_addresses[output.scriptPubKey.addresses] = 0;
                            pts_addresses[output.scriptPubKey.addresses]+=output.value;

                            // update angelsshares
                            if (output.scriptPubKey.addresses = "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
                            {

                            }
                            // if we parsed all transaction continue with next block
                            if (++numTxFinished == block_info.tx.length)
                                getNextBlock(++parsedBlocks);
                            // else wait for other transactions
                        });
                    });
                }
            });
        });
	});
}

getNextBlock();
