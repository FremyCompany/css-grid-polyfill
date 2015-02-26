var fs = require("fs");
var Nightmare = require("nightmare");
var resemble = require("node-resemble-js");

module.exports = function(data, callback) {

	var filePath = data.filePath;
	var screenshotPath = data.screenshotPath;
	var expectedImagePath = data.expectedImagePath;
	var binfile = data.binfile;

	var emitter = new (require("events").EventEmitter);
	var file = {};

	var nightmare = new Nightmare();
	nightmare
		// .viewport(500, 350)
		.goto(filePath)
		.inject("js", binfile)
		.screenshot(screenshotPath)
		.run(function(err, nightmare) {
			if (err) throw err;
			fs.readFile(screenshotPath, function(err, data) {
				emitter.emit("file", "result", data);
			});
		});

	fs.readFile(expectedImagePath, function(err, data) {
		emitter.emit("file", "expected", data);
	});
	emitter.on("file", function(name, data) {
		file[name] = data;
		if (Object.keys(file).length >= 2) {
			emitter.emit("ready", file);
		}
	});

	emitter.on("ready", function(file) {
		resemble(file.expected)
			.compareTo(file.result)
			.onComplete(callback);
	});

}