
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const writeFile = (filename, content) => new Promise( (resolve, reject) =>
	fs.writeFile( filename, content, 'utf-8', err => err ? reject(err) : resolve() )
);

(async () => {

	const browser = await puppeteer.launch();
	const dirpath = path.resolve('..');

	await Promise.all(
		fs.readdirSync(dirpath).map( async filename => {

			if( filename.endsWith('.html') ) {

				const page = await browser.newPage();
				await page.goto(`file:///${ dirpath }/${ filename }`);
				
				const selectorStyleMap = await page.evaluate(getStyles);
				
				if( Object.keys(selectorStyleMap).length ) {
					await writeFile(filename + '.test.js', createSnapshotTest(selectorStyleMap), 'utf-8');
				}

				await page.close();
			}
		})
	).catch(console.error);

	await browser.close();
})();

function getStyles() {
	
	const selectorStyleMap = {};

	for( let wrapper of document.body.querySelectorAll('.wrapper') ) {
		
		const wrapperSelector = '.' + Array.from(wrapper.classList).join('.');
		const { top: wTop, left: wLeft } = wrapper.getBoundingClientRect();

		for( let el of wrapper.children ) {
			if( el.classList.length === 0 ) continue;
			
			const selector = wrapperSelector + ' .' + Array.from(el.classList).join('.');
			const { top: elTop, left: elLeft, width, height } = el.getBoundingClientRect();
			const top = elTop - wTop;
			const left = elLeft - wLeft;

			selectorStyleMap[selector] = { top, left, width, height };
		}
	}

	return selectorStyleMap;
}

function createSnapshotTest( selectorStyleMap ) {

	return `
var selectorStyleMap = ${ JSON.stringify(selectorStyleMap,null,2) };

function compare() {

	Object.keys( selectorStyleMap ).forEach( function(selector) {
  
    var expectedStyles = selectorStyleMap[selector];
		var el = document.body.querySelector(selector);
		var styles = getComputedStyle(el);

    var matchOrThrow = function(prop) {

      var actual = parseInt( styles[prop] );
			var expected = expectedStyles[prop];
			var min_expected = expected - actual * 0.05;
			var max_expected = expected + actual * 0.05;

      if( actual < min_expected || actual > max_expected ) {
        throw new Error(
          '"$selector" "$prop" ($actual) did not match expected value ($expected)'
            .replace('$selector', selector)
            .replace('$prop', prop)
            .replace('$actual', actual)
            .replace('$expected', expected)
        );
      }
    }

    matchOrThrow('top');
    matchOrThrow('left');
    matchOrThrow('width');
    matchOrThrow('height');
	});
}

function test() {
	try {
		compare();
		console.log('Passed');
		window.postMessage( JSON.stringify({ error: false }), '*' );
	}
	catch( err ) {
		console.log('Failed:', err.message);
		window.postMessage( JSON.stringify({ error: true, message: err.message }), '*' );
		throw err;
	}
}

window.addEventListener( 'load', function() {
	setTimeout( test, 1000 ); // TODO: find better way to hook into polyfill
});
`;
}

