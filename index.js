var fs = require('fs');
var request = require('request');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var impurge = require('impurge');

var sheetId = fs.readFileSync('sheet_id.txt', 'utf8').trim();

console.log('Accessing google sheet id ' + sheetId);

// spreadsheet key is the long id in the sheets URL
var my_sheet = new GoogleSpreadsheet(sheetId);

// Without auth -- read only
// IMPORTANT: See note below on how to make a sheet public-readable!
// # is worksheet id - IDs start at 1
my_sheet.getRows(1, function(err, rows) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('pulled in ' + rows.length + ' rows');
  rows.forEach(writeMd);
});

function writeMd(element, index, array) {
  var row = element;
  var projectSlug = cleanupDash(row.yourprojecttitle);

  // create folders for project images
  var projectFolder = 'responses/img/' + projectSlug;
  if (!fs.existsSync('responses/')){
    fs.mkdirSync('responses/');
  }
  if (!fs.existsSync('responses/img/')){
    fs.mkdirSync('responses/img/')
  }
  if (!fs.existsSync(projectFolder)){
    fs.mkdirSync(projectFolder)
  }

  impurge.purge(row.mainprojectimage, function (error, urls) {
    if (!urls) {
      console.warn('Cannot load image at url: ' + row.mainprojectimage + ', skipping');
      return;
    }
    var mainImage = urls[0];

    // begin front matter
    var md = "---";
    md += "\n" + "layout: project-page";
    md += "\n" + "title: " + '"' + row.yourprojecttitle.replace(/"/g, '\\"') + '"';
    md += "\n" + "linkname: " + projectSlug; //this will be the project permalink
    md += "\n" + "author: " + '"' + row.projectauthor.replace(/"/g, '\\"') + '"';
    md += "\n" + "tagline: " + '"' + row.shortdescriptionofyourproject.replace(/"/g, '\\"') + '"';
    md += "\n" + "location:";
    var places = row.projectlocations.split(';');
    for (var i = 0; i < places.length; i++) {
      md += "\n" + "    - place: " + places[i];
    }
    md += "\n" + "project-link:";
    var links = row.alinktoyourproject.split(';');
    for (var i = 0; i < links.length; i++) {
      md += "\n" + "    - href: " + links[i];
    }
    md += "\n" + "tags:";
    var tags = row.projecttags.split(';');
    for (var i = 0; i < tags.length; i++) {
      md += "\n" + "    - tag: " + tags[i];
    }
    md += "\n" + "thumbnail-path: img/" + projectSlug + '/' + extractFileName(mainImage);
    md += "\n" + "img-folder: ../../img/" + projectSlug + '/';
    md += "\n" + "timestamp: " + row.timestamp;
    md += "\n" + "---";
    // end of front matter

    // download main image
    download(mainImage, projectFolder + '\/' + extractFileName(mainImage), function(){
        console.log('downloaded main image ' + extractFileName(mainImage));
    });

    // start of body
    var body = row.fullprojectdescription;
    var images = body.match(/http[^\s]*imgur[^\s]*/ig);

    // download images
    if (!images) images = [];
    async.map(images,
      function (image, callback) {
        impurge.purge(image, function (error, urls) {
          if (!urls) return callback('no imgur urls');
          callback(error, [image, urls[0]]);
        });
      },
      function (err, results) {
        if (!err && results) {
          results.forEach(function (result) {
            var originalImageUrl = result[0];
            var fixedImageUrl = result[1];
            var fileName = extractFileName(fixedImageUrl);

            if (fileName) {
              download(fixedImageUrl, projectFolder + '\/' + fileName, function(err, result) {
                console.log('downloaded ' + fileName);
              });
              var mdImg = '![]({{ page.img-folder }}' + fileName + ')';
              body = body.replace(originalImageUrl, mdImg); // replace url in body for md link to downloaded file
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
    );
  });
}

// http://stackoverflow.com/questions/12740659/downloading-images-with-node-js
var download = function(uri, filename, callback){
  if (!uri) return callback('no url to download');
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    if (!res) return callback('no response');
    if (res.headers['content-type'].search('image') > -1) {
      // var ext = '.' + res.headers['content-type'].split('/')[1];
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    }
  });
};

function extractFileName(url) {
  if (!url) return null;
  var lastSlash = url.lastIndexOf('\/');
  var fileName = url.substring(lastSlash + 1, url.length);
  return fileName;
}

function cleanupDash(string) {
  return string.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-");
}
