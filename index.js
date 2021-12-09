var fs = require('fs');
var rp = require('request-promise-native');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');

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

  var mainImage = row.mainprojectimage;

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

  // start of body
  var body = row.fullprojectdescription;
  console.log(row.yourprojecttitle);
  var images = body.match(/http[^\s]*imgur[^\s]*/ig);

  // download images
  if (!images) images = [];
  images.push(mainImage);
  images.forEach(function (image) {
    var fileName = extractFileName(image);

    if (image && fileName) {
      downloadImage(image, projectFolder + '\/' + fileName)
        .then(function () {
          console.log('Downloaded ' + fileName);
        })
        .catch(function (error) {
          console.warn(row.yourprojecttitle + ': ' + error.message);
        });
      var mdImg = '![]({{ page.img-folder }}' + fileName + ')';
      body = body.replace(image, mdImg); // replace url in body for md link to downloaded file
    }
  });

  md += "\n" + body;

  // write project md file
  fs.writeFile('responses/' + projectSlug + '.md', md, function (err) {
    if (err) throw err;
    console.log('Saved ' + projectSlug + ' project.');
  });
}

function downloadImage(uri, filename) {
  return rp.head(uri)
    .then((res) => {
      if (!res || res['content-type'].search('image') < 0) {
        throw new Error('Failed to download image:' + uri);
      }
      return rp(uri)
        .pipe(fs.createWriteStream(filename));
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
