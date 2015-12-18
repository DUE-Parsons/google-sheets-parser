var fs = require('fs');
var request = require('request');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');

var sheetId = fs.readFileSync('sheet_id.txt', 'utf8');

console.log('Accessing google sheet id ' + sheetId);

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
  // begin front matter
  var md = "---";
  md += "\n" + "layout: project-page";
  md += "\n" + "title: " + row.yourprojecttitle;
  var projectSlug = cleanupDash(row.yourprojecttitle);
  md += "\n" + "linkname: " + projectSlug; //this will be the project permalink
  md += "\n" + "author: " + row.projectauthor;
  md += "\n" + "tagline: " + row.shortdescriptionofyourproject;
  md += "\n" + "location: " + row.projectlocations;
  md += "\n" + "project-link:";
  var links = row.alinktoyourproject.split(';');
  for (var i = 0; i < links.length; i++) {
    md += "\n" + "    - href: " + links[i];
  }
  md += "\n" + "tags: " + row.projecttags;
  var mainImage = parseImgLink(row.mainprojectimage);
  md += "\n" + "thumbnail-path: ../../img/" + projectSlug + '/' + extractFileName(mainImage);
  md += "\n" + "img-folder: ../../img/" + projectSlug + '/';
  md += "\n" + "timestamp: " + row.timestamp;
  md += "\n" + "---";
  // end of front matter

  // create folders for project images
  var projectFolder = 'responses/img/' + projectSlug;
  if (!fs.existsSync('responses/img/')){
    fs.mkdirSync('responses/img/')
  }
  if (!fs.existsSync(projectFolder)){
    fs.mkdirSync(projectFolder)
  }

  // download main image
  download(mainImage, projectFolder + '\/' + extractFileName(mainImage), function(){
      console.log('downloaded main image ' + extractFileName(mainImage));
  });

  // start of body
  var body = row.fullprojectdescription
  var images = body.match(/[^\s]*imgur[^\s]*/ig);

  // download images
  if (images != undefined) {
    async.each(images, function(image) {
      var imageUrl = parseImgLink(image);
      var fileName = extractFileName(imageUrl);
      download(imageUrl, projectFolder + '\/' + fileName, function(){
          console.log('downloaded ' + fileName);
      });
      var mdImg = '![]({{ page.img-folder }}' + fileName + ')';
      body = body.replace(image, mdImg); // replace url in body for md link to downloaded file
    }, function(err){
        // if any of the file processing produced an error, err would equal that error
        if( err ) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('A file failed to process');
        } else {
          console.log('All files have been processed successfully');
        }
    });
  }

  md += "\n" + body;
  // end of body

  // write project md file
  fs.writeFile('responses/' + projectSlug + '.md', md, function (err) {
    if (err) throw err;
    console.log('Saved ' + projectSlug + ' project.');
  });
}

function parseImgLink(link) {
  if (link.search('.png') > -1 ||
      link.search('.jpg') > -1 ||
      link.search('.jpeg') > -1 ||
      link.search('.gif') > -1) {
    return link;
  } else if (link.search('imgur.com') >  -1) {
    return link.replace('imgur.com', 'i.imgur.com') + '.jpg';
  } else {
    return link;
  }
}

// http://stackoverflow.com/questions/12740659/downloading-images-with-node-js
var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    if (res.headers['content-type'].search('image') > -1) {
      // var ext = '.' + res.headers['content-type'].split('/')[1];
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    }
  });
};

function extractFileName(url) {
  var lastSlash = url.lastIndexOf('\/');
  var fileName = url.substring(lastSlash + 1, url.length);
  return fileName;
}

function cleanupDash(string) {
  return string.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-");
}
