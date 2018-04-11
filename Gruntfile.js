'use strict';

module.exports = function(grunt) {

	// Import the dependencies
	var url = require('url');
	
	// Transform a require-uri into a canonical uri
	function resolveModuleUri(baseUri, relativeModuleUri) {
		
		// determine the url kind
		var indexOfSeparator = -1;
		if ((indexOfSeparator=relativeModuleUri.indexOf(':')) != -1) {
			var moduleUri = 'src/'+relativeModuleUri.substr(0,indexOfSeparator)+'/'+relativeModuleUri.substr(indexOfSeparator+1);
		} else {
			var moduleUri = url.resolve(baseUri, relativeModuleUri); 
		}
		
		// potentially append .js
		if(!grunt.file.exists(moduleUri)) { moduleUri = moduleUri + '.js'; }
		
		// return the final value
		return moduleUri;
	}
	
	// Data storage
	var pkg = grunt.file.readJSON('package.json');
	
	var code_wrapper_start = (
		"\n"+
		"!(function() { 'use strict';"+"\n"+
		"    var module = { exports:{} };"+"\n"+
		"    var require = (function() { var modules = {}; var require = function(m) { return modules[m]; }; require.define = function(m) { modules[m]=module.exports; module.exports={}; }; return require; })();"
	);
	
	var code_wrapper_separator = "\n\n////////////////////////////////////////\n\n";
	code_wrapper_start += code_wrapper_separator;
	
	var code_wrapper_end = (
		"\n\n" + "var cssPolyfills = { require: require };" + "\n\n" + "})();"
	);
	
	
	// Project configuration.
	grunt.initConfig({
		
		//
		// Metadata:
		//
		
		pkg: pkg,
		
		banner: 
		    '/*! <%= pkg.name.toUpperCase() %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %>' + '<%= pkg.homepage ? " - " + pkg.homepage : "" %>' + ' - Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +' <%= _.pluck(pkg.licenses, "type").join("- and ")  %>-Licensed !*/\n',
		code_wrapper_start:
			code_wrapper_start,
		code_wrapper_end:
			code_wrapper_end,
		code_wrapper_separator:
			code_wrapper_separator,
		
		//
		// Task configuration:
		//
		
		findreq: {
			root: '<%= pkg.main =>'
		},
		
		concat: {
			bin: {
				src: ['<%= pkg.main %>'],
				dest: 'bin/<%= pkg.name %>.js',
				options: {
					banner: '<%= banner %><%= code_wrapper_start %>',
					footer: '<%= code_wrapper_end %>',
					separator: '<%= code_wrapper_separator %>',
					stripBanners: true,
					sourceMap: true,
					process: function(src, filepath) {
						
						return src.replace(/(?:(?:\/\/|\/\*)[-_=a-zA-Z0-9 ]*)?require\((\'.*?\'|\"".*?\"")\)/g, function(str, match) {
							if(str.indexOf('require')==0) {
								var relativeModuleUri = match.substr(1, match.length-2);
								var moduleUri = resolveModuleUri(filepath, relativeModuleUri);
								return "require('"+moduleUri+"')";
							} else {
								return str;
							}
						})+"\nrequire.define('" + filepath + "');";
						
					}
				}
			},
			doc: {
				src: ['doc/**/*.ts'],
				dest: 'doc/README.md',
				options: {
					old_banner: '<%= ""+(function() { var source = grunt.file.read("doc/README.md"), reg = /(\\r?\\n){3}/; reg=reg.exec(source)[0]; return source.substr(0, reg.lastIndex); })() %>',
					banner: '<%= grunt.file.read("doc/README[header].md") %>',
					separator: '',
					stripBanners: false,
					sourceMap: false,
					process: function(src, filepath) {
						if(filepath == "doc/requirements.ts") { return; }
						try {
							var fileurl = filepath.replace(/^(\.\/)?doc\/?/,'./'); grunt.log.writeln(fileurl);
							var filename = /\/([^\/]+)\.ts/i.exec(filepath)[1]; grunt.log.writeln(filename);
							
							var firstComment = /(?:    |\t)\*(?:   |\t)(.*?)(\r?\n)/.exec(src)[1].trimRight(); grunt.log.writeln(firstComment);
							src = src.replace(/^(?:.|\r|\n)*?\/\/\/\/ EXAMPLES [\/\r\n ]+/,'/');
							var extractExamples = /\/\*+ (.*?)(?:\*+\/)[\r\n]+function ?[a-zA-Z0-9_]*\([a-zA-Z0-9_, ]*\) *\{[\r\n\t ]*\r?\n((.|\r|\n)*?)([\r\n]+\})/g;
							var example, examples=''; while(example = extractExamples.exec(src)) {
								examples = examples + '\r\n### '+example[1].trim() + '\r\n\r\n```javascript\r\n\t'+example[2].trim()+'\r\n```\r\n';
							}
							
							return (
								"\r\n\r\n"+
								"["+filename.toUpperCase()+"]("+fileurl+")\r\n"+
								"===================================\r\n"+
								firstComment+"\r\n"+
								examples
							);
							
						} catch (ex) {
							
							grunt.log.writeln('[ERROR] Generating doc for ' + filepath + ' failled with message: ' + ex.message);
							return '';
							
						}
					}
				}
			}
		},
		
		uglify: {
			options: {
				banner: '<%= banner %>',
				sourceMap: true
			},
			bin: {
				src: '<%= concat.bin.dest %>',
				dest: 'bin/<%= pkg.name %>.min.js'
			},
		},
		
		nodeunit: {
			files: ['test/**/*_test.js']
		},
		
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			gruntfile: {
				src: 'Gruntfile.js'
			},
			src: {
				options: {
					jshintrc: '.jshintrc'
				},
				src: ['src/**/*.js']
			},
			test: {
				src: ['test/**/*.js']
			},
		},
		
		watch: {
			gruntfile: {
				files: '<%= jshint.gruntfile.src %>',
				tasks: ['jshint:gruntfile']
			},
			src: {
				files: '<%= jshint.src.src %>',
				tasks: ['jshint:src', 'nodeunit']
			},
			test: {
				files: '<%= jshint.test.src %>',
				tasks: ['jshint:test', 'nodeunit']
			},
		},
		
	});

	
	// These plugins provide some necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-concat-sourcemaps'); //grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	// Define the special 'findreq' task
	grunt.registerTask('findreq', 'Automatically determines the order in which the source files have to be concatened', function() {
		
		var modules = [];
		var importModule = function(rootUri, baseUri, relativeModuleUri) {
			
			// find out the canonical name of the module
			var moduleUri = resolveModuleUri(baseUri, relativeModuleUri); 
			if(!grunt.file.exists(moduleUri)) { moduleUri += '.js'; }
			grunt.log.writeln('importing: '+moduleUri);
			
			// check that the module hasn't already been loaded before
			if(modules.indexOf(moduleUri) >= 0) { return; }
			
			// load the file content from the disk
			var fileContent = grunt.file.read(moduleUri);
			
			// find all dependencies
			var dependencyPattern = /(?:(?:\/\/|\/\*)[-_=a-zA-Z0-9 ]*)?require\((\'.*?\'|\"".*?\"")\)/g;
			var match; while(match = dependencyPattern.exec(fileContent)) {
				
				// check we are not in a comment
				if(match[0].indexOf('require') == 0) {
					
					// get the relative uri
					match = match[1]; match = match.substr(1, match.length-2);
					grunt.log.writeln('depencendy: '+match);
					
					// import the module
					importModule(rootUri, moduleUri, match);
					
				}
				
			}
			
			// mark the module as ready
			modules.push(moduleUri);
			
		}
		
		importModule(pkg.main, '.', pkg.main);
		
		grunt.config.merge({
			concat: {
				bin: {
					src: modules
				}
			}
		});
	});

	// Default task.
	grunt.registerTask('default', [ /*'jshint', 'nodeunit', */'findreq', 'concat', /*'uglify'*/]);

};