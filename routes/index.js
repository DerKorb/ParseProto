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

exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

exports.ptsJson = function(req, res){


    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014);
    Transaction.aggregate([
        {
            $match: {
                'day': {$lt: day}
            }
        },
        {
            $group: {
                _id: '$address',
                block: {$max: '$block'},
                time: {$max: '$time'},
                balance: { $sum: '$change' }
            }
        },
        {
            $sort: {
                _id: 1
            }
        }
    ], function(err, results)
    {
        if(err)
            throw(err);
        var supply = 0;
        var blocktime = 0;
        var blockheight = 0;
        var balances = [];
        console.log(day);
        console.log(results.length);
        results.forEach(function(result){
            console.log(result);
            if (blocktime<result.time)
                blocktime = result.time;
            if (blockheight<result.block)
                blockheight = result.block;
            supply+=result.balance;
            var addr = {};
            addr[result._id] = result.balance;
            if (result.balance>0)
                balances.push(addr);
        });
        res.send({supply: supply, blocktime: blocktime, blockheight: blockheight, balances: balances});
    });
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

exports.genesisBlock = function(req, res)
{

}
