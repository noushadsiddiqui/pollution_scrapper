var request = require('request');
var cheerio = require('cheerio');
var cron = require('cron');
var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    MongoService = require('./mongoServices').MongoService;
	
var db;
var collection;
var mongoService;
var locationService = require('./serverLocation').locationService;

var config = require('./config.json');
var count = 0;
var stationList = [];
var cronJob = cron.job(config.cron_setting, function(){
	count++;
	console.log("count is : " + count);
	if(count%24 == 0) {
		count = 0;
		locationService.getlatestStations (mongoService, function(latestLocations) {
			if(latestLocations.length > 0) {	
				latestLocations.forEach(function(entry) {
					console.log("current data : "+JSON.stingify(entry));
				});
			} else {
				console.log(" failed Data  : " + latestLocations);
			}	
		});
	}
	
	console.log("going to check URLs : ");
	
	if(stationList.length < 1) {
		var findQuery = {};
		var columnList = {};
		columnList['_id'] = 0;
		columnList['created_at'] = 0;
		mongoService.findAllStations(config.stationsCollection, findQuery, columnList, function(error, objs) {
			  // if (error) { res.send(400, error); } 
			  if (error) { console.log('Exception occured : ' + error); } 
			  else { 
					console.log('total stations : ' + objs.length);
					stationList = objs;
				  /* objs.forEach(function(singleObj){
					  console.log("Current station : " + JSON.stringify(singleObj));
				  });*/
			 }
		});
	}
	
	stationList.forEach(function(stationInfo) {
		console.log(new Date() + ' : fetching data for : '+stationInfo.stationName);
		request(config.stationurlPrefix + stationInfo.url,{timeout: 30000}, function(error, response, html){
			
			if(!error){
				var $ = cheerio.load(html);
				var json = {};
				
				json.stateId = stationInfo.stateId;
				json.cityId = stationInfo.cityId;
				$('#lblStationValue').filter(function(){
					// picking station name from config file and not the current page
					// json.station = $(this).text();
					json.station = stationInfo.stationName;
					json.stationDisplayName = stationInfo.fullStationName;
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
					
					tempData.each(function(i, elem) {
						var tempdata = $(this).first().children(); 
						var keyinfo = tempdata.first().text().replace('.','').replace(' ','');
						
						json[keyinfo] = tempdata.eq(3).text().trim();
					});
										
				})
				console.log('going to Insert to DB'); 
				// insertIfNotExist
				// collection.insertOne(json, function(err, records) {
				mongoService.insertIfNotExist(json, function(err, records) {
					if (err){
						console.log("Exception occured while inserting into DB : " + err);
						throw err;
					}
				});
				
				mongoService.insertIfNotExisttoShadow(json, function(err, records) {
					if (err){
						console.log("Exception occured while inserting into DB : " + err);
						throw err;
					}
				});
				
				console.log(new Date() + ' DB done for '+stationInfo.stationName); 
			
			} else {
				console.log("error while loading page : " + error);
			}
			
		})
	})		
    console.info('cron job completed');
}); 

MongoClient.connect(config.MONGODB_URI, function(err, database) {
	if(err) {
		console.log("Error connecting to DB : " + err);
		throw err;
	}
 
	db = database;
	mongoService = new MongoService(db); 
	collection = db.collection(config.pollutionCollection);

	console.info(new Date() + 'starting cron job');
	cronJob.start();
	console.log('Cron job started');
});