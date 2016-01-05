var request = require('request');
var cheerio = require('cheerio');
var cron = require('cron');

var mongodb = require('mongodb');

var db;
var collection;

var config = require('./config.json');

var cronJob = cron.job(config.cron_setting, function(){
	
	
			
	config.urls.forEach(function(url) {
		console.log(new Date() + ' : fetching data for : '+url[1]);
		request(url[0], function(error, response, html){
			
			if(!error){
				var $ = cheerio.load(html);
				// var length, row2, row3;
				// var json = { length : "", row2 : "", row3 : ""};
				var json = {};
				
				json.stateId = url[2];
				json.cityId = url[3];
				$('#lblStationValue').filter(function(){
					json.station = $(this).text();
					console.log('station : '+ $(this).text() );
				})
				
				$('#lblCurrentDateTime').filter(function(){
					json.timestamp = $(this).text().substring(12);
					console.log("timestamp : " + json.timestamp);
				})
				
				$('#lblReportCurrentData').filter(function(){
					var data = $(this);
					var tempData = data.children().first().children().first().siblings();
					// json.length = tempData.length;
					json.length = tempData.length;
					
					var fruits = [];
					tempData.each(function(i, elem) {
						var tempdata = $(this).first().children(); 
						var keyinfo = tempdata.first().text().replace('.','').replace(' ','');
						
						json[keyinfo] = tempdata.eq(3).text().trim();
					});
										
				})
				
				console.log('going to Insert to DB'); 
				
				/* fs.appendFile(filename, JSON.stringify(json, null, 4), function(err){
					console.log('File successfully written! - Check your project directory for the output.json file');
				}) */
				
				collection.insertOne(json, function(err, records) {
					
					if (err){
						console.log("Exception occured while inserting into DB : " + err);
						throw err;
					}
				});
				
				console.log(new Date() + ' DB done for '+url[1]); 
			
			} else {
				console.log("error while loading page : " + error);
			}
			
		})
	})			
    console.info('cron job completed');
}); 

mongodb.MongoClient.connect(config.MONGODB_URI, function(err, database) {
	if(err) {
		console.log("Error connecting to DB : " + err);
		throw err;
	}
 
	db = database;
	collection = db.collection(config.pollutionCollection);

	console.info(new Date() + 'starting cron job');
	cronJob.start();
	console.log('Cron job started');
});