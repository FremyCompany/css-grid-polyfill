# CSS-Polyfills-Framework (Parallia)

The goal of this project is to create a central repository and a background framework for css polyfills. 

By using a modular approach, the Grunt setup associated to this project allows you to create customized builds by disabling the features you don't need, as we will explain later.

## Getting Started

### Including Parallia on your website
If you want all features to be enabled:

1. Simply download the [production version][min] or the [development version][max].

2. You can then reference it in your web page from your server, just before either the ```</head>``` or the ```</body>``` tag:

```html
<script async defer src="bin/css-parallia.min.js"></script>
```

[min]: https://raw.github.com/FremyCompany/css-polyfills/master/bin/css-polyfills.min.js
[max]: https://raw.github.com/FremyCompany/css-polyfills/master/bin/css-polyfills.js

If you only want some features to be enabled:

1. Clone this repository on your device.

2. Modify the ```src/requirements.js``` file to fit your needs (see next chapter)

3. Run Grunt to generate the new build.

4. You can then reference it in your web page from your server, just before either the ```</head>``` or the ```</body>``` tag:

```html
<script async defer src="bin/css-polyfills.min.js"></script>
```


### Creating a custom build
If you don't need all the features of this library, which I believe will be the case for most of you, I highly recommend you to modify the ```src/requirements.js``` file to only include the modules you need. 

Then, open your command line and execute the ```grunt``` command on the root directory of this repository (once you have NodeJS and Grunt installed). This will create a custom binary for you. 

Don't forget to enable GZipping on your server to make further savings on javascript transfers.



## Examples

Here's a simple example adding a simple 'hidden' property to CSS:

```javascript
!(function(window, document) {
	
	var cssCascade = require('core:css-cascade'), cssStyle = require('core:css-style');
	var onHiddenChanged = function(element, rule) {
		
		var hiddenValue = cssCascade.getSpecifiedStyle(element, 'hidden').toString().trim();
		if(hiddenValue == 'yes') {
			if(element.cssHiddenBackup == undefined) {
				element.cssHiddenBackup = cssStyle.enforceStyle(element, 'visibility', 'hidden');
			}
		} else {
			if(element.cssHiddenBackup != undefined) {
				cssStyle.restoreStyle(element, element.cssHiddenBackup); 
				element.cssHiddenBackup = undefined;
			}
		}
		
	};
	cssCascade.startMonitoringProperties(['hidden'], { onupdate: onHiddenChanged });
	
})(window, document);
```

Please also have a look at the non-core directories in the src folder for more interesting examples.



## Documentation

### Use the friendly documentation
Please have a look at the [friendly documentation](./doc/README.md). This documentation was specifically created to answer your questions, or point you directly to a more precise documentation of the API.

### Review the API summary
_(Dense format coming soon, without any type annotations)_

### Have a look at the code
Please don't forget that if your questions weren't answered by the previously introduced documents, you may also have a look to the source code. It is usually well-documented from the inside, which may help you grasp implementation details.



## Contributing
Please feel free to contribute to this project, either by fixing bugs in the core libraries or by adding new polyfills. 

If you work on a new polyfill, make sure it lives under its own directory in the ```src``` folder, and has a ```polyfill.js``` file that can be required in the ```src/requirements.js``` file to initialize your polyfill. We recommend putting all other files in a ```lib``` subdirectory. If you use grunt to build the ```polyfill.js``` file, please include your ```gruntfile``` in the repository, but not the downloaded ```node_modules``` (add the folder to ```.gitignore``` if necessary).

In lieu of a formal styleguide, we will simply ask you to take care to maintain the existing coding style. For instance, please:
  * use tabs for indentation at the beginning of lines.
  * put opening braces on the same line as the block definition.
  * avoid if or else statements without braces.

_Also, please don't edit files in the "bin" subdirectory as they are generated via Grunt. You'll find source code in the "src" subdirectory!_



## Release History

The aim of this section is to report the major milestones of the project: 

  * 2014-09-21: First release of the framework, with a rough prototype css-grid polyfill.
  * 2014-10-11: Pushed a nearly-final v1.0 documentation of core components.



## License
Copyright (c) 2014 François REMY  
Licensed under the MIT license. Some sections may have an Apache license applied to them.
