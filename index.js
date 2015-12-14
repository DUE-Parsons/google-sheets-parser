var fs = require('fs');
var GoogleSpreadsheet = require('google-spreadsheet');

var sheetId = fs.readFileSync('sheet_id.txt', 'utf8');

console.log(sheetId);

String.prototype.cleanupDash = function() {
  return this.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-");
}

// spreadsheet key is the long id in the sheets URL
var my_sheet = new GoogleSpreadsheet(sheetId);

// Without auth -- read only
// IMPORTANT: See note below on how to make a sheet public-readable!
// # is worksheet id - IDs start at 1
my_sheet.getRows( 1, function(err, rows){
  console.log( 'pulled in ' + rows.length + ' rows');
  rows.forEach(writeMd);
});

function writeMd(element, index, array) {
  var row = element;
  //begin front matter
  var md = "---";
  md += "\n" + "layout: project-page";
  md += "\n" + "title: " + row.yourprojecttitle;
  md += "\n" + "linkname: " + row.yourprojecttitle.cleanupDash(); //this will be the project permalink
  md += "\n" + "author: " + row.yourfirstname + " " + row.yourlastname;
  md += "\n" + "tagline: " + row.shortdescriptionofyourproject;
  md += "\n" + "location: " + row.projectlocations;
  md += "\n" + "project-link:";
  var links = row.alinktoyourproject.split(';');
  for (var i = 0; i < links.length; i++) {
    md += "\n" + "    - href: " + links[i];
  }
  md += "\n" + "embed-link: " + row.wantyourprojectembeddedonthewebsite;
  md += "\n" + "tags: " + row.projecttags;
  md += "\n" + "thumbnail-path: ../../img/" + row.yourfirstname.toLowerCase() + "\/1.jpg";
  md += "\n" + "img-folder: ../../img/" + row.yourfirstname.toLowerCase() +"\/";
  md += "\n" + "timestamp: " + row.timestamp;
  md += "\n" + "---";
  //end of front matter
  var body = row.fullprojectdescription
  var images = body.match(/(\bimg)\d+/ig);
  for (var i = 0; i < images.length; i++) {
    var digits = images[i].match(/\d+/g)[0];
    var path = '![]({{ page.img-folder }}' + digits + '.jpg)';
    body = body.replace(images[i], path);
  }
  // md += "\n" + row.fullprojectdescription;
  md += "\n" + body;
  //end of body
  fs.writeFile('responses/' + row.yourprojecttitle.cleanupDash() + '.md', md, function (err) {
    if (err) throw err;
    console.log('Saved ' + row.yourprojecttitle.cleanupDash() + ' project.');
  });
}



// // With auth -- read + write
// // see below for authentication instructions
// var creds = require('./google-generated-creds.json');
// // OR, if you cannot save the file locally (like on heroku)
// var creds = {
//   client_email: 'yourserviceaccountemailhere@google.com',
//   private_key: 'your long private key stuff here'
// }
//
// my_sheet.useServiceAccountAuth(creds, function(err){
// 	// getInfo returns info about the sheet and an array or "worksheet" objects
// 	my_sheet.getInfo( function( err, sheet_info ){
// 		console.log( sheet_info.title + ' is loaded' );
// 		// use worksheet object if you want to stop using the # in your calls
//
// 		var sheet1 = sheet_info.worksheets[0];
// 		sheet1.getRows( function( err, rows ){
// 			rows[0].colname = 'new val';
// 			rows[0].save();	//async and takes a callback
// 			rows[0].del();  //async and takes a callback
// 		});
// 	});
//
// 	// column names are set by google and are based
//   // on the header row (first row) of your sheet
// 	my_sheet.addRow( 2, { colname: 'col value'} );
//
// 	my_sheet.getRows( 2, {
// 		start: 100,			 // start index
// 		num: 100,			   // number of rows to pull
// 		orderby: 'name'  // column to order results by
// 	}, function(err, row_data){
// 		// do something...
// 	});
// })