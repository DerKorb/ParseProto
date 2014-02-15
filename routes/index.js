/*
 * GET home page.
 */
async = require("async");
mysql = require("mysql");
connection = mysql.createConnection({
    host: "feinarbyte.de",
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
        res.send(result);
    });
};

exports.agsJson = function(req, res){
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014);
    connection.query(
        "CREATE TEMPORARY TABLE IF NOT EXISTS ags_rates AS (SELECT SUM(`amount`/100000000) ags_rate, day as day2 FROM donations GROUP BY day); " +
        "SELECT address, MAX(block) blockheight, MAX(time) time, SUM(`amount`)/ags_rate/20000 balance FROM donations JOIN ags_rates ON day = day2 WHERE day <= ? GROUP BY address;" +
            "DROP TEMPORARY TABLE ags_rates", [day], function(err, block)
    {
        console.log(err);
        var result = {blockheight: 0, time: 0, balances: [], supply: 0};
        block[1].forEach(function(balance)
        {
            var addr = {};
            addr[balance.address] = balance.balance;
            if (balance.blockheight > result.blockheight)
                result.blockheight = balance.blockheight;
            if (balance.time > result.time)
                result.time = balance.time;
            result.supply += balance.balance;
            result.balances.push(addr);
        });
        res.send(result);
    });
}

exports.genesisBlock = function(req, res)
{

}
