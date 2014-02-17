
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
var query3Values = [];
var addresses = {};
var addresscount = 0;


addressId = function (address) {
	if (!addresses[address]) {
		addresses[address] = ++addresscount;
		query3Values.push([address, addresscount]);
		return addresscount;
	}
	return addresses[address];
}

getBtsDonations = function()
{
	console.log(offset);
	var req = http.get('http://blockchain.info/address/1ANGELwQwWxMmbdaSWhWLqBEtPTkWb8uDc?format=json&offset='+offset, function(res)
	{
		var info = "";
		res.on("data", function(chunk) {
			info += chunk;
		});
		res.on("end", function() {
			var txs = JSON.parse(info).txs;
			txs.forEach(function(tx)
			{
				var donor_address = tx.inputs[0].prev_out.addr;
				var i;
				for (i = 0; i < tx.out.length; i++)
				{
					if (tx.out[i].addr == "1ANGELwQwWxMmbdaSWhWLqBEtPTkWb8uDc")
						break;
				}
				if (!tx.out[i] || !typeof(tx.out[i].value) == "number")
					return
				if(!tx.time && tx.block_height == 280709)
				{
					tx.time = 1389828960;
				}
				var donation_amount = tx.out[i].value;
				var time = tx.time;
				var day = tx.time/86400-16015;
				if (typeof(time) != "number" || typeof(day) != "number" || typeof(donation_amount) != "number")
					console.log(tx.out[i], typeof(donation_amount), donation_amount, time, day, tx);
				donations.push([addressId(donor_address), donation_amount, time, day]);

			});
			offset += txs.length;
			if (txs.length==50)
			{
				setTimeout(getBtsDonations,1);
			}
			else
			{
				console.log(donations.length);
				if (donations.length > 0) {
					connection.query("INSERT INTO donations_btc (address, amount, time, day) VALUES ?", [donations], function (err, result) {
						if (err)
							console.log("q3", err);
						console.log(result);
						console.log("insert finished");
					});
					donations = [];
				}
				if (query3Values.length > 0) {
					connection.query("INSERT INTO addresses_btc (address, id) VALUES ?", [query3Values], function (err, result) {
						if (err)
							console.log("q2", err);
					});
					query3Values = [];
				}
				setTimeout(getBtsDonations, 60000);
			}
		});
	});
}

connection.query("TRUNCATE TABLE donations_btc; TRUNCATE TABLE addresses_btc", function (err) {
    if (err)
        throw(err);
	getBtsDonations();
 });

