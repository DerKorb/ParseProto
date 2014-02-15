/*
 * GET home page.
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

exports.index = function(req, res){
	res.render('index', { title: 'Express' });
};

exports.ptsJson = function(req, res){
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014);
    connection.query("SELECT SUM(`change`)/100000000 supply, MAX(time) time, MAX(block) blockheight FROM transactions WHERE day <= ?;" +
        "SELECT address, sum(`change`)/100000000 balance FROM transactions WHERE day <= ? GROUP BY address", [day, day], function(err, block)
    {
        var result = block[0][0];
        result.balances = [];
        block[1].forEach(function(balance)
        {
           var addr = {};
           addr[balance.address] = balance.balance;
           result.balances.push(addr);
        });
        console.log(result);
        res.send(result);
    });
};

exports.agsJson = function(req, res){
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014);
    console.log(day);
    Donation.find({day: {$gt: day-1}}).sort({block: 1}).limit(1).exec(function(err, result)
    {
        if (err)
            console.log(err);
        if(result.length == 0)
            return res.end("date is in the future");
        Donation.aggregate([
            {
                $match: {
                    'block': {$lt: result[0].block}
                }
            },
            {
                $group: {
                    _id: '$address',
                    block: {$max: '$block'},
                    time: {$max: '$time'},
                    balance: { $sum: '$amount' }
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
    });
}

exports.genesisBlock = function(req, res)
{

}
