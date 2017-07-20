var fs = require('fs');
var basename = require("path").basename;
var compare = require("./helpers/compare.js");
var test = require("tape");
var resolve = require("path").resolve;
var dirname = require("path").dirname;
var basename = require("path").basename;
var extname = require("path").extname;

// file path to the root directories
var root = resolve(__dirname, "..");
var tmp = resolve(__dirname, "tmp");

// some other constants
var ACCEPTABLE_TOLERANCE = 2.0/*percents*/;

// pages which should be compared to a png
var testsToRun = 
[
	{relativePath: "demo/css-grid/layout4.html", viewportWidth: 1024, viewportHeight: 320},
	{relativePath: "demo/css-grid/layout5.html", viewportWidth: 1024, viewportHeight: 320},
	{relativePath: "demo/css-grid/example2.html"},
	{relativePath: "demo/css-grid/example3.html"},
	{relativePath: "demo/css-grid/example4.html"},
	{relativePath: "demo/css-grid/example5.html"},
	{relativePath: "demo/css-grid/example6.html"},
	{relativePath: "demo/css-grid/example7.html"},
	{relativePath: "demo/css-grid/example8.html"},
	{relativePath: "demo/css-grid/example9.html"},
	{relativePath: "demo/css-grid/example10.html"},
	{relativePath: "demo/css-grid/example11.html"},
	{relativePath: "demo/css-grid/example12.html"},
	{relativePath: "demo/css-grid/example13.html"},
	{relativePath: "demo/css-grid/example14.html"},
	{relativePath: "demo/css-grid/example15.html"},
	{relativePath: "demo/css-grid/example16.html"},
	{relativePath: "demo/css-grid/example19.html"},
	{relativePath: "demo/css-grid/example17.html"},
	{relativePath: "demo/css-grid/example18.html"},
];

// execute all the tests in sequence
testsToRun.forEach(function(o) {

	// extract data about the page to test	
	var baseFilename = basename(o.relativePath);
	var extension = extname(o.relativePath);
	var filename = baseFilename.slice(0, -extension.length);
	
	// configure the test
	o.filePath = resolve(root, o.relativePath);
	o.screenshotPath = resolve(tmp, o.filePath.slice(root.length + 1).slice(0, -extension.length) + ".png");
	o.expectedImagePath = resolve(dirname(o.filePath), filename + ".png");
	o.binfile = resolve(root, "bin/css-polyfills.js");

	// execute the test
	test(baseFilename, function(t) {
		compare(o, function onComplete(data) {
			
			// check whether the test passed
			var misMatchPercentage = data.misMatchPercentage;
			var isOK = misMatchPercentage <= ACCEPTABLE_TOLERANCE;
			
			// remove valid screenshots from the file system
			if (isOK) fs.unlink(o.screenshotPath);

			// report the test result
			var match = (100 - misMatchPercentage).toFixed(1);
			t.ok(isOK, "match percentage: " + match + "%");
			t.end();
			
		});
	});
});
