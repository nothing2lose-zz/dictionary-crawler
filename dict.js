var cheerio = require("cheerio");
var fs = require('fs');
var url = require('url');

var Crawler = require("crawler");
var url = require('url');

var c = new Crawler({
  maxConnections : 10,
  // This will be called for each crawled page
  callback : function (error, result, $) {
    //// $ is Cheerio by default
    ////a lean implementation of core jQuery designed specifically for the server
    //$('a').each(function(index, a) {
    //  var toQueueUrl = $(a).attr('href');
    //  c.queue(toQueueUrl);
    //});
    parse(result.body);
  }
});

/***
 * BEGIN Trim
 * */
String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
String.prototype.ltrim=function(){return this.replace(/^\s+/,'');};
String.prototype.rtrim=function(){return this.replace(/\s+$/,'');};
String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');};

function strEndsWith(str, suffix) {
  return str.match(suffix+"$")==suffix;
}
/***
 * END Trim
 * */

var removeLineBreaks = function (str) {
  return str.replace(/(\r\n|\n|\r)/gm,"");
};

var generateURL = function(word) {
  var url = "http://dictionary.reference.com/browse/"+word+"?s=t";
  return url;
};

var requestCounter = 0;
var fileName = null;
var urls = [];
var arguments = process.argv.slice(2);

if (arguments.length == 1) {
  var filePath = __dirname + "/" + arguments[0];
  fileName = arguments[0];

  if (fs.existsSync(filePath)) {
    // load word list from file
    var data = fs.readFileSync(filePath, 'utf8');
    var trimmed = data.trim();
    var arr =  trimmed.split("\n");
    for (var i = 0; i < arr.length; i ++ ) {
      urls.push(generateURL(arr[i]));
    }
    requestCounter = arr.length;

  } else {
    console.log("can not read from file");
    return
  }
}

if (undefined == arguments[0]) {
  console.log("dict.js '*.tsv'");
  return
}


var JSON_FILE_DIR = __dirname +"/json_files";

//var dummyUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36';
var chromeUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.155 Safari/537.36";

var json = {}; // final json object

var parse = function(htmlStr) {
  //console.log(" *** ==== will parse");
  var $ = cheerio.load(htmlStr);


  var wordDict = {};

  // `관용`까지만 하고 이하의 영국식 표기 및 자잘한것은 제외시킨다.
  //var excludedSecondSourceBox = $("div.center-well-container > section > div.source-box").first();
  //$(excludedSecondSourceBox).find("div.def-list > section").each(function(i, e) {

  $("div.def-list > section").each(function(i, e) {
    // section loop
    var g = $(e).find("header");

    //console.log(g.text());
    var sectionTitle = g.text().trim();
    if (sectionTitle.length == 0) {
      // 이 경우는 또 뭐지 html dom봐야할듯.
      return;
    }
    var section = [];
    wordDict[sectionTitle] = section;

    var def = $(e).find("section > div.def-set").each(function (bi, be) {
      // section item loop
      var span = $(be).find("div.def-content");
      var eg = $(span).find('span').text();
      var meanAndEG = removeLineBreaks($(span).text());
      var mean = meanAndEG.substr(0, meanAndEG.length - eg.length);
      var meanStr = mean.trim();
      var egStr = eg.trim();

      // 쓰레기 예문 예외처리
      if (egStr.length < 3) {
        /*  아래와 같은 케이스 때문
         *   "mean": "a word formerly used in communications to represent the letter L",
         *   "eg": "L."
         * */
        egStr = "";
      }
      section.push({"mean": meanStr, "eg": egStr});

      //console.log("---------------------------------------------");
      //console.log(mean);
      //console.log(eg);
      //console.log('mean : `' + mean + '`');
      //console.log('example `' + eg + '`');
    });


  });

  var word = $("h1.head-entry > span.me").text().toLowerCase();
  //console.log(htmlStr);
  json[word] = wordDict;

  requestCounter = requestCounter - 1;
  if (0 == requestCounter) {

    var jsonStr = JSON.stringify(json, null, 4);
    //console.log(jsonStr);
    var filePath = JSON_FILE_DIR + "/" + fileName + ".json";
    fs.writeFileSync(filePath, jsonStr, "utf8");
    console.log(" ======= *** ======= done");
    process.exit(0);
  }

}

c.queue(urls);

//request({
//  url: url,
//  headers: {
//    'User-Agent': chromeUA
//  }
//}, function(err, res, html) {
//
//  if (err) {
//    console.log("error");
//    console.log(err);
//    return;
//  }
//  parse(html);
//
//});
