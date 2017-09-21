
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const screen_sizes = [320, 720, 1480];

const writeFile = (filename, content) => new Promise( (resolve, reject) =>
	fs.writeFile( filename, content, 'utf-8', err => err ? reject(err) : resolve() )
);

(async () => {

	const browser = await puppeteer.launch({ headless: false, slowMo: 1000 }); console.log('launched');
	
	const dirpath = path.resolve('..');
	const snapshots = {};

	await Promise.all(
		fs.readdirSync(dirpath).map( async filename => {

			if( filename.endsWith('.html') ) {
				
				snapshots[filename] = {};

				await Promise.all(
					screen_sizes.map( async width => {
						
						const page = await browser.newPage();
						await page.setViewport({ width, height: width });
						await page.goto(`file:///${ dirpath }/${ filename }`);
						await new Promise(resolve => setTimeout(resolve, 100));

						snapshots[filename][width] = await page.evaluate(getStyles);

						await page.close();
					})
				);
			}
		})
	).catch(console.error);

	deleteEmptyObjectProps(snapshots, 2);

	await writeFile( './snapshots.js', 'var snapshots = ' + JSON.stringify(snapshots, null, 2) );

	console.log('Updated snapshots.js')
	console.log('Review the changes and commit them to the repo');

	await browser.close();
})();

function deleteEmptyObjectProps( obj, depth = 1) {

    Object.keys( obj ).forEach( function(key) {
        if( Object.keys(obj[key]).length === 0 )
            delete obj[key];
        else if( depth > 1 )
            deleteEmptyObjectProps(obj[key], depth - 1);
    });

    return obj;
}

function getStyles() {
	
	const selectorStyleMap = {};

	for( let wrapper of document.body.querySelectorAll('.wrapper') ) {
		
		const wrapperSelector = '.' + Array.from(wrapper.classList).join('.');
		const { top: wTop, left: wLeft } = wrapper.getBoundingClientRect();

		Array.from( wrapper.children ).forEach( (el, i) => {
			if( el.classList.length === 0 ) return;
			
			const selector = wrapperSelector + ' .' + Array.from(el.classList).join('.') + ':nth-child(' + (i+1) + ')';
			const { top: elTop, left: elLeft, width, height } = el.getBoundingClientRect();
			const top = elTop - wTop;
			const left = elLeft - wLeft;

			selectorStyleMap[selector] = { top, left, width, height };
		});
	}

	return selectorStyleMap;
}
