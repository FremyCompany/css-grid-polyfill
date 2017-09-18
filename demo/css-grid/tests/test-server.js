
const http = require('http');
const fs = require('fs');

// rudimentatary server to run tests
// required to allow access into iframes with cross-origin error
// reads files from disk synchronously - sorry, not sorry
const server = http.createServer( (req, res) => {

	const sendFile = filepath => fs.createReadStream(__dirname + '/' + filepath).pipe(res).on('error', console.error);

	switch( req.url ) {
		case '/favicon.ico':					return res.end();
		case '/':								return sendFile('./test-runner.html');
		case '/snapshots.js':					return sendFile('./snapshots.js');
		case '/test-runner.js':					return sendFile('./test-runner.js');
		default:
			if( req.url.startsWith('/bin/') )	return sendFile('../../..' + req.url);
			else								return sendFile('..' + req.url);
	}
}).listen(4743, () => console.log('Listening on port 4743'));
