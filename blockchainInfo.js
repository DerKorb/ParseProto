
var http = require("http");
var offset = 0;
var donations = [];

var mysql = require("mysql");
connection = mysql.createConnection({
	host: process.env.dbhost ? process.env.dbhost : "localhost",
	user: "parse_user",
	password: "mQhURtm4qaLbsxl",
	database: "parse_db",
	multipleStatements: true
});
connection.connect();
var btc_addresses = [];
var addresses = {};
var addresscount = 0;

var coin = function (val) {
    return Math.round(val * 100000000);
}

addressId = function (address) {
	if (!addresses[address]) {
		addresses[address] = ++addresscount;
		btc_addresses.push([address, addresscount]);
		return addresscount;
	}
	return addresses[address];
}

cheerio = require("cheerio");
getBtsDonations = function()
{
    console.log("getting donations");
	var req = http.get('http://blockexplorer.com/address/1ANGELwQwWxMmbdaSWhWLqBEtPTkWb8uDc', function(res)
	{
		var info = "";
		res.on("data", function(chunk) {
			info += chunk;
		});
		res.on("end", function()
        {
            $ = cheerio.load(info);
            var donations = [];
            $(".txtable tr").each(function(i, v){

                if ($($(v).find("td")[3]).text().trim() != "Received: Address")
                    return;
                var donation_amount = coin($($(v).find("td")[2]).text());
                var donor_address = $($(v).find("td")[4]).text().split("\n").filter(function(a) {return a.length>30})[0];
                var time = new Date($($(v).find("td")[1]).text().match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/));
                var day = time/1000/86400-16016;
                if (donor_address)
                {
                    donations.push([addressId(donor_address), donation_amount, time, day]);
                }
            });
            console.log(donations.length);
            if (donations.length > 0) {
                connection.query("TRUNCATE TABLE donations_btc; INSERT INTO donations_btc (address, amount, time, day) VALUES ?", [donations], function (err, result) {
                    if (err)
                        console.log("q3", err);
                    console.log(result);
                    console.log("insert finished");
                });
                donations = [];
            }
            if (btc_addresses.length > 0) {
                connection.query("TRUNCATE TABLE addresses_btc; INSERT INTO addresses_btc (address, id) VALUES ?", [btc_addresses], function (err, result) {
                    if (err)
                        console.log("q2", err);
                });
                btc_addresses = [];
            }
            setTimeout(getBtsDonations, 60*60*10000);
		});
    });
}

getBtsDonations();
