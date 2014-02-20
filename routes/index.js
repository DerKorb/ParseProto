/*
 * GET home page.
 */
async = require("async");
mysql = require("mysql");
connection = mysql.createConnection({
    host: process.env.dbhost ? process.env.dbhost : "localhost",
    user: "parse_user",
    password: "mQhURtm4qaLbsxl",
    database: "parse_db",
    multipleStatements: true
});
//connection.connect();

exports.index = function (req, res) {
    res.render('index', { title: 'Express' });
};

var AGS = 1, PTS = 0, GENESIS = 2;

var generatePtsJson = function(day, callback)
{
    connection.query("SELECT CAST(SUM(`change`)/100000000 AS DECIMAL(17,8)) supply, MAX(time) time, MAX(block) blockheight FROM transactions2 WHERE day <= ?;" +
        "SELECT address, CAST(sum(`change`)/100000000 AS DECIMAL(17,8)) balance FROM transactions2 JOIN addresses ON id_address = id WHERE day <= ?  GROUP BY id_address HAVING balance>0", [day, day], function (err, block) {
        if (err)
            throw(err);
        var result = block[0][0];
        result.balances = [];
        block[1].forEach(function (balance) {
            result.balances.push([balance.address, balance.balance]);
        });
        callback(result);
    });

}

exports.ptsJson = function (req, res) {
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2], dateParts[0] - 1, dateParts[1]).getTime() / 1000 / 86400 - 16014) + 1;
    console.log(day, cachedDay);
    if (day<=cachedDay)
    {
        res.sendfile("cache/"+day+"_"+"pts.json");
    }
    else
        generatePtsJson(day, function(result) { res.send(result) });
};

queryAgs = function(day, cb)
{
	connection.query(
		"DROP TEMPORARY TABLE IF EXISTS ags_rates;" +
			"CREATE TEMPORARY TABLE IF NOT EXISTS ags_rates AS (SELECT CAST(5000/SUM(`amount`) AS DECIMAL(39,30)) ags_rate, IF(day<57, 57, day) as day2 FROM donations GROUP BY IF(day<57, 57, day));" +
			"SELECT addresses.address, MAX(block) blockheight, MAX(time) time, ROUND(SUM(`amount`*ags_rate), 8) balance FROM donations JOIN ags_rates ON IF(day<57, 57, day) = day2 JOIN addresses ON donations.address = addresses.id WHERE day <= ? GROUP BY addresses.id ORDER BY addresses.address;" +
			"DROP TEMPORARY TABLE IF EXISTS ags_rates_btc;" +
			"CREATE TEMPORARY TABLE IF NOT EXISTS ags_rates_btc AS (SELECT CAST(5000/SUM(`amount`) AS DECIMAL(39,30)) ags_rate, IF(day<57, 57, day) as day2 FROM donations_btc GROUP BY IF(day<57, 57, day));" +
			"SELECT addresses_btc.address, MAX(block) blockheight, MAX(time) time, ROUND(SUM(`amount`*ags_rate), 8) balance FROM donations_btc JOIN ags_rates_btc ON IF(day<57, 57, day) = day2 JOIN addresses_btc ON donations_btc.address = addresses_btc.id WHERE day <= ? GROUP BY addresses_btc.id ORDER BY addresses_btc.address;", [day, day],cb);
}

var generateAgsJson = function(day, callback)
{
    queryAgs(day, function (err, block) {
        var result = {supply: 10000, balances: []};
        result.balances.push(["FOUNDER", "10000"]);
        block[2].forEach(function (balance) {
            result.supply += balance.balance;
            result.balances.push([balance.address, balance.balance]);
        });
        block[5].forEach(function (balance) {
            result.supply += balance.balance;
            result.balances.push([balance.address, balance.balance]);
        });
        callback(result);
    });
}


exports.agsJson = function (req, res) {
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2], dateParts[0] - 1, dateParts[1]).getTime() / 1000 / 86400 - 16014) + 1;
    if (day<=cachedDay)
    {
        res.sendfile("cache/"+day+"_"+"ags.json");
    }
    else
        generateAgsJson(day, function(result) { res.send(result) });
}

var generateGenesisBlock = function(day, _supply, portionAgs, portionPts, callback)
{
    queryAgs(day, function (err, ags_result) {
        connection.query("SELECT CAST(SUM(`change`)/100000000 AS DECIMAL(17,8)) supply, MAX(time) time, MAX(block) blockheight FROM transactions2 WHERE day <= ?;" +
            "SELECT address, CAST(sum(`change`)/100000000 AS DECIMAL(17,8)) balance FROM transactions2 JOIN addresses ON id_address = id WHERE day <= ?  GROUP BY id_address HAVING balance>0", [day, day], function (err, pts_result) {
            if (err)
                throw(err);
            var result = {};
            var result = {balances: []};
            var balances = [];
            var pts_supply = pts_result[0][0].supply;
            pts_result[1].forEach(function (balance) {
                if (!balances[balance.address])
                    balances[balance.address] = 0;
                balances[balance.address] += _supply * portionPts * balance.balance / pts_supply;
            });

            ags_supply = (day - 55) * 10000;
            ags_result[2].forEach(function (balance) {
                if (!balances[balance.address])
                    balances[balance.address] = 0;
                balances[balance.address] += _supply * portionAgs * balance.balance / ags_supply;
            });
            ags_result[5].forEach(function (balance) {
                if (!balances[balance.address])
                    balances[balance.address] = 0;
                balances[balance.address] += _supply * portionAgs * balance.balance / ags_supply;
            });

            result.balances.push(["FOUNDER", _supply * portionAgs * 10000 / ags_supply]);
            for (address in balances)
                result.balances.push([address, balances[address]]);
            callback(result);

        });
    });
}

exports.genesisBlock = function (req, res) {
    var dateParts = req.query.date.split("-");
    var day = Math.floor(new Date(dateParts[2], dateParts[0] - 1, dateParts[1]).getTime() / 1000 / 86400 - 16014) + 1;
    console.log(day, cachedDay);
    if (day<=cachedDay)
    {
        var _supply = req.query.supply, portionPts = req.query.portionPts, portionAgs = req.query.portionAgs
        connection.query("SELECT data FROM caches WHERE day = ? ORDER BY type", [day], function(err, result)
        {
            var pts_result = JSON.parse(fs.readFileSync("cache/"+day+"_"+"pts.json"));
            var ags_result = JSON.parse(fs.readFileSync("cache/"+day+"_"+"ags.json"));
            ags_supply = (day - 55) * 5000;
            var pts_supply = pts_result.supply;

            var balances = {};
            pts_result.balances.forEach(function (balance) {
                if (!balances[balance[0]])
                    balances[balance[0]] = 0;
                balances[balance[0]] += _supply * portionPts * balance[1] / pts_supply;
            });
            ags_result.balances.forEach(function (balance) {
                if (!balances[balance[0]])
                    balances[balance[0]] = 0;
                balances[balance[0]] += _supply * portionAgs * balance[1] / ags_supply;
            });
            var result = {balances: []};
            for (address in balances)
                result.balances.push([address, balances[address]]);

            res.send(result);
        });
    }
    else
        generateGenesisBlock(day, req.query.supply, req.query.portionPts, req.query.portionAgs, function(result) { res.send(result) });
}
var cachedDay = -1;
fs = require("fs");
cacheADay = function()
{
    connection.query("SELECT MAX(day) cachedDay FROM caches ; SELECT MAX(day) parsedDay FROM donations ", function(err, results)
    {
        var parsedDay = results[1][0].parsedDay;
        cachedDay = results[0][0].cachedDay;
        if (cachedDay == null)
            cachedDay = -1;

        if (cachedDay == parsedDay)
            return setTimeout(cacheADay, 60*60*1000); // hourly recheck
        console.log(cachedDay+1, "of", parsedDay, "cached");
        var day = cachedDay + 1;
        console.log(day);
        generateAgsJson(day, function(ags_result)
        {
            generatePtsJson(day, function(pts_result)
            {
                fs.writeFileSync("cache/"+day+"_"+"pts.json", JSON.stringify(pts_result));
                connection.query("INSERT INTO caches (type, day) VALUES ?", [[[PTS, day]]], function(err, result) {
                    fs.writeFileSync("cache/"+day+"_"+"ags.json", JSON.stringify(ags_result));
                    connection.query("INSERT INTO caches (type, day) VALUES ?", [[[AGS, day]]], function(err, result) {
                        // timeout for keeping callstack clean:
                        setTimeout(cacheADay, 1);
                    });
                });
            });
        });
    });
}
cacheADay();