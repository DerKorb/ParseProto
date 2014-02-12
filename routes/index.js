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
	user: 'protosharespc',
	pass: 'alibabatrinktmeinenkaba!'
});

var currentBlockCount = 0;
var parsedBlocks = 0;
var currentBlockTime = 0;

var pts_addresses = {};
var ags_addresses = {};

function getNextBlock()
{
    // get number of blocks
	client.cmd('getblockcount', function (err, block_count)
	{
		if (err)
			return console.log(err);

        // if we already parsed all blocks try again in 10 seconds
		if (parsedBlocks >= block_count)
			return setTimeout(getNextBlock, 10000);

		parsedBlocks++;
		currentBlockCount = block_count;
		if (parsedBlocks%100==0)
			console.log("block", parsedBlocks);

		// get the block hash
        client.cmd('getblockhash', parsedBlocks, function(err, block_hash)
        {
            if (err)
                return console.log(err);
            // get the block
            client.cmd('getblock', block_hash , function(err, block_info)
            {
                if (err)
                    return console.log(err);

                // update current block time
                currentBlockTime = block_info.time;

                // get all transactions
                var numTxFinished = 0;
                for (tx in block_info.tx)
                {
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

                        // if the transaction contains unspent outputs parse them
                        client.cmd('decoderawtransaction', rawtransaction , function(err, transaction_info)
                        {
                            if (err)
                                return console.log(err);

                            console.log(transaction_info);

                            // all movements:
                            for (i in transaction_info.vout)
                            {
                                output = transaction_info.vout[i];
                                input = transaction_info.vin[i];
                                // update protoshares
                                console.log(input);
                                if (!pts_addresses[output.scriptPubKey.addresses])
                                    pts_addresses[output.scriptPubKey.addresses] = 0;
                                if (output.value<0)
                                    console.log(output.value);
                                pts_addresses[output.scriptPubKey.addresses]+=output.value;

                                // update angelsshares
                                if (output.scriptPubKey.addresses = "PaNGELmZgzRQCKeEKM6ifgTqNkC4ceiAWw")
                                {

                                }
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
