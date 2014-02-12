/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

exports.data = function(req, res){
	result = {blocknum: parsedBlocks, blocktime: blockTime, balances: [], supply: 0};
	for(key in addresses)
	{
		result.supply+=addresses[key];
		address = {};
		address[key] = addresses[key];
		result.balances.push(address);
	}
	res.send(result);
};

var bitcoin = require('bitcoin');

var client = new bitcoin.Client({
	host: 'localhost',
	port: 3838,
	user: 'mytestuser',
	pass: 'alibabatrinktmeinenkaba!'
});

var async = require("async");
var maxTx = 0;
var blockCount = 0;
var blocks = [];
var parsedBlocks = -1;
var blockTime = 0;

var addresses = {};

var getDecoded = function(err, result)
{
	if (err) return console.log(err);
	result.vout.forEach(function(output)
	{
		if (!addresses[output.scriptPubKey.addresses])
			addresses[output.scriptPubKey.addresses] = 0;
		addresses[output.scriptPubKey.addresses]+=output.value;
	});
	if (++tx == maxTx)
		return getBlocks();
}

var getRawTransaction = function(err, result)
{
	if (err)
	{
		if (++tx == maxTx)
			return getBlocks();
		return;
	}
	client.cmd('decoderawtransaction', result , getDecoded);
}

var getBlockHash = function(err, result)
{
	if (err)
		return console.log(err);
	client.cmd('getblock', result , getBlock);
}

var getBlock = function(err, result)
{
	//client.cmd('getrawtransaction', result , getBlockHash);
	if (err)
		return console.log(err);
	maxTx = result.tx.length;
	blockTime = result.time;
	for (tx in result.tx)
	{
		client.cmd('getrawtransaction', result.tx[tx] , getRawTransaction);
	}
}

function getBlocks()
{
	client.cmd('getblockcount', function (err, result)
	{
		if (err)
			return console.log(err);

		if (parsedBlocks >= result)
		{
			setTimeout(10000, getBlocks);
			return;
		}
		parsedBlocks++;
		blockCount = result;
		if (parsedBlocks%100==0)
			console.log("block", parsedBlocks);
		client.cmd('getblockhash', parsedBlocks, getBlockHash);
	});
}

getBlocks();
