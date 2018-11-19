const fs = require('fs');
const http2 = require('http2');

const options = {
    key  : fs.readFileSync('rsa/rsa_private.key'),
    cert : fs.readFileSync('rsa/cert.crt')
};

const serv = http2.createSecureServer(options);

serv.on('stream', (stream, headers) => {
    console.log(headers);
    console.log(stream);

    stream.respond({
        'content-type' : 'text/html',
        'status' : 200
    });
    
    stream.end('<h3>Hello world</h3>');
});

serv.listen(3456, '127.0.0.1');

