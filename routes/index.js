/*
 * GET home page.
 */
async = require("async");
mongoose = require("mongoose");
mongoose.connect('mongodb://feinarbyte.de/protoparse');

var Transaction = mongoose.model('Transaction', {
	address: String,
	change: Number,
    block: Number,
	time: Number,
    day: Number,
});

var Donation = mongoose.model('Donation', {
	address: String,
	amount: Number,
    block: Number,
	time: Number,
    day: Number,
});

exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

exports.ptsJson = function(req, res){


    var dateParts = req.query.date.split("-");
    var timestamp = new Date(dateParts[2],dateParts[0],dateParts[1]).getTime()/1000;
	result = {blocknum: parsedBlocks, blocktime: currentBlockTime, balances: [], supply: 0};
	for (address in pts_addresses)
    {
        var sum = 0;
        pts_addresses[address].transactions.forEach(function(transaction)
        {
            if (transaction.time < timestamp)
                sum += transaction.change;
        });
        paddress = {};
        paddress[address] = sum;
        if (sum>0)
        {
            result.balances.push(paddress)
            result.supply += sum;
        }
    }
	res.send(result);
};

exports.agsJson = function(req, res){
    var dateParts = req.query.date.split("-");
    var timestamp = new Date(dateParts[2],dateParts[0],dateParts[1]).getTime()/1000;
    result = {blocknum: parsedBlocks, blocktime: currentBlockTime, balances: [], supply: 0};
    for (address in pts_addresses)
    {
        var sum = 0;
        pts_addresses[address].ags_donations.forEach(function(ags_donation)
        {
            if (ags_donation.time < timestamp)
                sum += ags_donation.amount;
        });
        paddress = {};
        paddress[address] = sum;
        if (sum>0)
        {
            result.balances.push(paddress)
            result.supply += sum;
        }
    }
    res.send(result);
}

exports.genesisBlock = function(req, res){
}