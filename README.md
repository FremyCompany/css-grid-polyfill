# CSS-Grid-Polyfill

> <strong>IMPORTANT NOTE:</strong> The Grid specification has undergone several major changes since this polyfill was written, and I have not had time to work on keeping the polyfill up to date. I welcome contributions and am ready to help, but I do not have time to commit on fixing issues myself at this time.

Welcome to this first version of the CSS-Grid-Polyfill. The goal of this project is to provide a working implementation of css grids for current browsers, for prototyping purposes.



## What’s in for you?
You are now ready to try out css grids in IE 9+ and probably most other recent browsers, with the simple addition of a script on your page – and to the condition your style sheets are located on your own server (or accessible via CORS).

The polyfill’s css parser was built by following the CSS Syntax 3 specification, the polyfill should be able to process any css stylesheet. It can react to dynamic pseudo-classes like ‘:hover’, to media queries changes or window resize events. It also detects changes to the DOM that may affect the layout of your grid. 

Most features of the css grid spec are in. For instance, the polyfill support more features than the IE’s implementation, as well as all the features implemented in Chrome Canary under a flag today, and actually renders more accurately than Chrome in most cases. [Edit: As of May 2015, this is no longer true as bugs I reported were fixed, and Chrome added new features]

Use any of the possible ways you can define a grid (rows/columns, grid lines, areas, …) and mix them as you wish, with the caveat that you align items to the right edge of the grid using negative indexes, or with fixed row/column-end and a span value as row/column-start.

Automatic placement is supported with both the ‘normal’ and the ‘dense’ algorithms. Each one comes in both the ‘row’ and ‘column’ flavors (which allow you to choose the direction in which the automatic algorithm progress, from left to right or from top to bottom). 

Fraction sizes (the ‘fr’ unit) are also supported, and are indented to work exactly as the spec says it should.



## Show me some demos!
I guess you should be somewhat impressed at this point, but wonder if things are really as beautiful as painted before, so let’s move to actual demos!

* [Bootstrap 16-columns grid](https://rawgit.com/FremyCompany/css-grid-polyfill/master/demo/css-grid/layout4.html)
* [Responsive blog design](https://rawgit.com/FremyCompany/css-grid-polyfill/master/demo/css-grid/layout3.html)
* [Mixing cell-positioned and non-cell-positioned items](https://rawgit.com/FremyCompany/css-grid-polyfill/master/demo/css-grid/example19.html)
* [Z-Index support](https://rawgit.com/FremyCompany/css-grid-polyfill/master/demo/css-grid/example17.html)
* [Basic Hover Test](https://rawgit.com/FremyCompany/css-grid-polyfill/master/demo/css-grid/basic-hover-test.html)

NOTE: most of those demos are coming from “[Grid By Example](http://gridbyexample.com/)”, a website from Rachel Andrew.



## What’s not working right now?
As always, there has to be gotchas. 

Because the layout is done asynchronously, the polyfill may play badly with other libraries that expect layout to be performed synchronously. This is particularly true if you plan to animate your grid.

The whole polyfill is very sensitive to changes to the “box-sizing” property (and many frameworks like Bootstrap do make use of it); again, this will be ironed out soon but you have to be aware.

The polyfill doesn’t like fixed/absolutely positioned grid items. If you want to use them, just put them in a dummy wrapper, it will work fine.

Like IE and Chrome, the polyfill does not support the “subgrid” feature, and (similarly) doesn’t like when a grid-item is a grid itself. I hope to solve this someday using a CSS Layout Polyfill Infrastructure but this will require some background work I don’t expect to have time to do in the immediate future.

Also, I’m you’ll find other bugs I didn’t mention. Please bear with me ^_^



## Should I use that in production?
Your call. I wouldn’t say this polyfill is slow by any measure, but your mileage may vary on mobile devices. My advice would be to use the polyfill only on tablets and desktops at the moment, after you have tested the compatibility and performance extensively on a representative number of devices. 

To the contrary of my previous CSS Regions Polyfill, I didn’t carry such a broad compatibility and performance testing myself at the moment because I still expect to change the code significantly in the future, so that would be wasted time. That doesn’t mean you can’t do it on your own, and report any issue you did find ;-)




## Can I contribute?
Sure! Please report bugs here, and feel free to make pull requests! 

The code is globally pretty readable, and if it isn’t you can report it as a bug! Maintaining a good code quality is a requirement for this project, and I take this very seriously.



## Contributing
Please feel free to contribute to this project, either by fixing bugs in the core libraries or by fixing the css-grid polyfill. 

In lieu of a formal styleguide, we will simply ask you to take care to maintain the existing coding style. For instance, please:
  * use tabs for indentation at the beginning of lines.
  * put opening braces on the same line as the block definition.
  * avoid if or else statements without braces.

_Also, please don't edit files in the "bin" subdirectory as they are generated via Grunt. You'll find source code in the "src" subdirectory!_

### Testing
Rather than have to test your changes manually, you can add an example page to the `demo/` directory and run `npm run update-snapshots`. Then you can run the test server using `npm run test` and open `localhost:4743` in your browser.

`npm run update-snapshots` - this will 'snapshot' how the newest version of Chromium lays out the elements inside a `.wrapper` element

`npm run test` runs a server which serves a html file on the root path that will open all the html pages in the `demo/` directory in iframes and compare how they are laid out to the snapshots taken from Chromium. You can open this page in any browser to test how your changes work cross-browser.

## Release History

The aim of this section is to report the major milestones of the project: 
  
  * 2015-06-19: Added 'order' property, fixed bugs, and support the updated syntax
  * 2014-11-01: First release of the css-grid-polyfill
  
You can follow the release or install them using bower from there:

https://github.com/FremyCompany/css-grid-polyfill-binaries.


## License
Copyright (c) 2014 François REMY  
Licensed under the MIT license. Some sections may have an Apache license applied to them.
