
function compare( document, selectorStyleMap, errorPrefix ) {
	
	var selectorDiffStyleMap = {};

	Object.keys( selectorStyleMap ).forEach( function(selector) {
		
		var el = document.body.querySelector(selector);
		var wrapper = el.parentElement;
		var { top: elTop, left: elLeft, width, height } = el.getBoundingClientRect();
		var { top: wTop, left: wLeft } = wrapper.getBoundingClientRect();
		var top = elTop - wTop;
		var left = elLeft - wLeft;

		var expectedStyles = selectorStyleMap[selector];
		var actualStyles = { top, left, width, height };
		var diffStyles = selectorDiffStyleMap[selector] = {};

		matchOrStoreDiff('top');
		matchOrStoreDiff('left');
		matchOrStoreDiff('width');
		matchOrStoreDiff('height');
		
		function matchOrStoreDiff(prop) {

			var actual = actualStyles[prop];
			var expected = expectedStyles[prop];
			var min_expected = expected - actual * 0.05;
			var max_expected = expected + actual * 0.05;

			if( actual < min_expected || actual > max_expected ) {
				diffStyles[prop] = { actual, expected };
			}
		}
	});

	deleteEmptyObjectProps(selectorDiffStyleMap, 2);
	
	return selectorDiffStyleMap;
}

function deleteEmptyObjectProps( obj, depth) {
	depth = depth || 1;

	Object.keys( obj ).forEach( function(key) {
		if( Object.keys(obj[key]).length === 0 )
			delete obj[key];
		else if( depth > 1 )
			deleteEmptyObjectProps(obj[key], depth - 1);
	});

	return obj;
}

function test( iframeDoc, selectorStyleMap, filename, width ) {
	var result = document.createElement('div');
	result.innerText = 'Pending... ($filename x$width)'.replace('$filename', filename).replace('$width', width);
	document.body.appendChild(result);

	var selectorDiffStyleMap = compare( iframeDoc, selectorStyleMap, [filename, width].join(' ') );
	
	if( Object.keys(selectorDiffStyleMap).length === 0 ) {
		result.innerText = 'Passed ($filename x$width)'.replace('$filename', filename).replace('$width', width);
		result.style.color = 'green';
	}
	else {
		result.innerText = 'Failed ($filename x$width)'.replace('$filename', filename).replace('$width', width);
		result.style.color = 'red';

		var diff = document.createElement('pre');
		diff.innerText = JSON.stringify(selectorDiffStyleMap, null, 2);
		diff.style.color = 'red';
		diff.style.marginLeft = '2em';
		document.body.appendChild(diff);
	}
}

function testAll() {

	const container = document.querySelector('#iframes');

	Object.keys( snapshots ).forEach( function(filename) {

		Object.keys( snapshots[filename] ).forEach( function(width) {

			var iframe = document.createElement('iframe');
			iframe.width = width;
			iframe.height = width;
			iframe.src = '../' + filename;

			iframe.addEventListener('load', function() {
				var window = iframe.contentWindow;
				var document = iframe.contentDocument;

				test( document, snapshots[filename][width], filename, width );
			});
			
			container.appendChild(iframe);
		});
	});
}

testAll();
