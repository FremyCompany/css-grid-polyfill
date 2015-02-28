var fs = require("fs");
var Nightmare = require("nightmare");
var resemble = require("node-resemble-js");
var phantomjs = require("phantomjs-bin");
var dirname = require("path").dirname;

var nightmare = new Nightmare({
	phantomPath: dirname(phantomjs.path) + "/"
});

module.exports = function(data, callback) {

	// gather some info about the compare request
	var filePath = data.filePath;
	var screenshotPath = data.screenshotPath;
	var expectedImagePath = data.expectedImagePath;
	var binfile = data.binfile;

	// create our state machine
	// (we only want to start comparing once the two files are ready)
	var emitter = new(require("events").EventEmitter);
	var files = {
		expected: null,
		result: null
	};
	// set screen width and height
	if (data.viewportWidth && data.viewportHeight) {
		nightmare.viewport(data.viewportWidth, data.viewportHeight);
	}
	// initiate by taking a screenshot
	nightmare
		.goto(filePath)
		.inject("js", binfile) // FIXME: is it actually required? why?
		.screenshot(screenshotPath)
		.run(function(err, nightmare) {

			// continue by reading the taken screenshot
			if (err) throw err;
			fs.readFile(screenshotPath, function(err, data) {
				emitter.emit("fileready", "result", data);
			});

		});

	// then start reading the expected screenshot
	fs.readFile(expectedImagePath, function(err, data) {
		emitter.emit("fileready", "expected", data);
	});

	// save the read screenshots, then trigger comparison
	emitter.on("fileready", function(name, data) {

		// save the received screenshot in the pool
		files[name] = data;

		// once both files are there, start to compare
		if (files.result && files.expected) {
			emitter.emit("ready", files);
		}
	});

	// once both file are there, compare them + call back
	emitter.on("ready", function(files) {
		resemble(files.expected)
			.compareTo(files.result)
			.onComplete(callback);
	});

}