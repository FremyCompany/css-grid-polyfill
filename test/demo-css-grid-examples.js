var fs = require('fs');
var basename = require("path").basename;
var compare = require("./helpers/compare.js");
var test = require("tape");
var resolve = require("path").resolve;
var dirname = require("path").dirname;
var basename = require("path").basename;
var extname = require("path").extname;

var list = [
	{relativePath: "demo/css-grid/example2.html"}
];

var root = resolve(__dirname, "..");
var tmp = resolve(__dirname, "tmp");

list.forEach(function(o) {
	var baseFilename = basename(o.relativePath);
	var extension = extname(o.relativePath);
	var filename = baseFilename.slice(0, -extension.length);
	
	o.filePath = resolve(root, o.relativePath);
	o.screenshotPath = resolve(tmp, o.filePath.slice(root.length + 1).replace(/[\.\W+]/ig, "-") + ".png");
	o.expectedImagePath = resolve(dirname(o.filePath), filename + ".png");
	o.binfile = resolve(root, "bin/css-polyfills.js");

	test(baseFilename, function(t) {
		compare(o, function onComplete(data) {
			var misMatchPercentage = data.misMatchPercentage;
			var match = (100 - misMatchPercentage).toFixed(1);
			var isOK = misMatchPercentage <= 2.0;
			if (isOK) fs.unlink(o.screenshotPath);
			t.ok(isOK, "match percentage " + match);
			t.end();
		});
	});
});