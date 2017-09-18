
const http = require('http');
const fs = require('fs');

// rudimentatary server to run tests
// required to allow access into iframes with cross-origin error
// reads files from disk synchronously - sorry, not sorry
const server = http.createServer( (req, res) => {

	const sendFile = filepath => fs.createReadStream(__dirname + '/' + filepath).pipe(res).on('error', console.error);

	switch( req.url ) {
		case '/favicon.ico': return res.end();
		case '/':
			sendFile('./test-runner.html');
			break;
		case '/snapshots.js':
			sendFile('./snapshots.js');
			break;
		case '/test-runner.js':
			sendFile('./test-runner.js');
			break;
		default:
			if( req.url.startsWith('/bin/') )
				sendFile('../../..' + req.url);
			else
				sendFile('..' + req.url);
			break;
	}
}).listen(4743, () => console.log('Listening on port 4743'));
