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
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014)+1;
    connection.query("SELECT SUM(`change`)/100000000 supply, MAX(time) time, MAX(block) blockheight FROM transactions2 WHERE day <= ?;" +
        "SELECT address, sum(`change`)/100000000 balance FROM transactions2 JOIN addresses ON id_address = id WHERE day <= ?  GROUP BY id_address HAVING balance>0", [day, day], function(err, block)
    {
        if(err)
            throw(err);
        var result = block[0][0];
        result.balances = [];
        block[1].forEach(function(balance)
        {
           result.balances.push([balance.address,balance.balance]);
        });
        res.send(result);
    });
};

exports.agsJson = function(req, res){
    var dateParts = req.query.date.split("-");
    console.log(dateParts);
    console.log(new Date(dateParts[2],dateParts[0]-1,dateParts[1]));
    console.log(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000);
    var day = Math.floor(new Date(dateParts[2],dateParts[0]-1,dateParts[1]).getTime()/1000/86400-16014)+1;
    connection.query(
        "DROP TEMPORARY TABLE IF EXISTS ags_rates;" +
    "CREATE TEMPORARY TABLE IF NOT EXISTS ags_rates AS (SELECT CAST(5000/SUM(`amount`) AS DECIMAL(39,30)) ags_rate, IF(day<57, 57, day) as day2 FROM donations GROUP BY IF(day<57, 57, day));" +
    "SELECT addresses.address, MAX(block) blockheight, MAX(time) time, ROUND(SUM(`amount`*ags_rate), 8) balance FROM donations JOIN ags_rates ON IF(day<57, 57, day) = day2 JOIN addresses ON donations.address = addresses.id WHERE day <= ? GROUP BY addresses.id ORDER BY addresses.address;", [day], function(err, block)
    {
        var result = {blockheight: 0, time: 0, supply: 0, balances: []};
        block[2].forEach(function(balance)
        {
            if (balance.blockheight > result.blockheight)
                result.blockheight = balance.blockheight;
            if (balance.time > result.time)
                result.time = balance.time;
            result.supply += balance.balance;
            result.balances.push([balance.address,balance.balance]);
        });
        res.send(result);
    });
}

exports.genesisBlock = function(req, res)
{

}
