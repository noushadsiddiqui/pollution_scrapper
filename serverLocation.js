var request = require('request');
var cheerio = require('cheerio');
var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    MongoService = require('./mongoServices').MongoService;


var config = require('./config.json');

var locationService = {
	getlatestStations : function(mongoService, callBackFn) {
		var latestStations = [];
		var count = 0;
		console.log("		called getlatestStations ");
		request(config.indiaurl,{timeout: 55000}, function(error, response, html){
			if(!error){
				console.log("		country called : ");
				var $ = cheerio.load(html);
				$('div').each(function(){
					// console.log('this element : '+$(this).attr('id') + ", "+$(this).attr('onclick'));
					var data = $(this);
					var onclickData = data.attr('onclick');
					if(onclickData) {
						var stateName = data.attr('id').substring(3);
						var stateId = onclickData.substring(22, onclickData.indexOf(','));
						request(config.stateurlPrefix+data.attr('id')+config.stateurlPostfix+stateId,{timeout: 55000}, function(error, response, html){
							console.log("		state called : ");
							if(!error){
								var $ = cheerio.load(html);
								$('div').each(function(){
									var cityDivData = $(this);
									var cityOnclickData = cityDivData.attr('onclick');
									if(cityOnclickData){
										// console.log('	state element for '+ stateName +" : "+cityId + "..." + cityOnclickData);
										// call City here
										if(stateId.toString() === config.delhiStateId) {
											// In cityDivData all spaces are coming with 5,e.g. "R K Puram" is coming as R5K5Puram.
											// Though URL call is working for both the strings (i.e. R K.. & R5K5P.. ), still using string with space for readibility.
											var stationName = cityDivData.attr('id').replace(/5/g, ' ');
											
											console.log("Info : "+stateName+ ", "+ config.delhiCityId +", "+ stationName);
											var currentStation = {};
											currentStation['stateName'] = stateName;
											currentStation['stateId'] = stateId;
											currentStation['cityId'] = config.delhiCityId;
											currentStation['cityName'] = config.delhiCityName;
											currentStation['stationName'] = stationName;
											currentStation['fullStationName'] = stationName;
											currentStation['url'] = config.stationurlMiddle +stationName+ config.stationurlPostfixDelhi;
											latestStations.push( currentStation);
											count++;
											mongoService.insertStationIfNotExist(currentStation, function(err, records) {
												console.log("		station insert done");
												if (err){
													console.log("		Exception occured while inserting into DB : " + err);
													throw err;
												}
											});		
										} else {
											var cityId = cityOnclickData.substring(22, cityOnclickData.indexOf(','));
											var cityName = config.cityNames[cityId];
											request(config.cityurlPrefix+cityId,{timeout: 55000}, function(error, response, html){
												console.log("		city called : ");
												if(!error){
													var $ = cheerio.load(html);
													$('#gvLstStation').filter(function(){
														var data = $(this);
														var tempData = data.children().first().siblings();
														// json.length = tempData.length;
														tempData.each(function(i, elem) {
															var tempdata = $(this).children(); 
															// var keyinfo = tempdata.first().text();
															var stationName = tempdata.eq(0).text().trim();
															var fullStationName = tempdata.eq(1).text().trim();
															var url = tempdata.eq(2).children().attr('href').trim();
															console.log("		Info : "+stateName+ ", "+ cityId+", "+cityName +", "+ stationName +", "+ fullStationName +", "+ url );
															// json[keyinfo] = tempdata.eq(3).text().trim();
															var currentStation = {};
															currentStation['stateName'] = stateName;
															currentStation['stateId'] = stateId;
															currentStation['cityId'] = cityId;
															currentStation['cityName'] = cityName;
															currentStation['stationName'] = stationName;
															currentStation['fullStationName'] = fullStationName;
															currentStation['url'] = url;
															latestStations.push( currentStation);
															count++;
															mongoService.insertStationIfNotExist(currentStation, function(err, records) {
																console.log("		station insert done");
																if (err){
																	console.log("		Exception occured while inserting into DB : " + err);
																	throw err;
																}
															});
														});
																			
													})
												} else {
													console.log("		timeout ? : " + error.code === 'ETIMEDOUT' + ", connection time out ? : " + error.connect === true);
													console.log("		error while loading page : " + error);
												}
											}) 
										}
									}
								})
							} else {
								console.log("		timeout ? : " + error.code === 'ETIMEDOUT' + ", connection time out ? : " + error.connect === true);
								console.log("		error while loading page : " + error);
							}
						})
					}
				})
			} else {
				console.log("		timeout ? : " + error.code === 'ETIMEDOUT' + ", connection time out ? : " + error.connect === true);
				console.log("		error while loading page : " + error);
			}
		})
		console.log("		returning getlatestStations " + latestStations);
		callBackFn(latestStations);
	}
};
exports.locationService = locationService;
// console.info('cron job completed');
// console.info(new Date() + 'starting cron job');
// console.log('Cron job started');
