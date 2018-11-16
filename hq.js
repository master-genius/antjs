const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const urlparse = require('url');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var hq = function() {
    

    this.config = {
        
        protocol    : 'https',

        //请求结束自动清理options和headers
        autoreset   : false,
    };

    this.headers = {
    
    };

    this.mime_map = {
        'css'   : 'text/css',
        'der'   : 'application/x-x509-ca-cert',
        'gif'   : 'image/gif',
        'gz'    : 'application/x-gzip',
        'h'     : 'text/plain',
        'htm'   : 'text/html',
        'html'  : 'text/html',


    };

    this.args   = {
        query   :   '',
    };

    this.get = function() {
    };


    this.post = function(data, callback, options={}) {
        
    };

    /*
        options = {
            
        }
    */
    this.upload = function(url, f, callback) {
        //var h = (this.config.protocol === 'https') ? https : http;

        var u = new urlparse.URL(url);

        var h = (url.protocol === 'https') ? https : http ;

        var opts = {
            host        : u.host,
            hostname    : u.hostname,
            port        : u.port,
            path        : u.pathname,
            method      : 'POST',
            requestCert : false,
            rejectUnauthorized : false,
            headers     : {
                'Content-Type'  : 'multipart/form-data; ',
            }
        };
       

        return new Promise((rv, rj) => {
            if (f.file === undefined) {
                rj(new Error('file not found'));
            } else {
                try {
                    fs.accessSync(f.file, fs.constants.F_OK|fs.constants.R_OK);
                    fs.readFile(f.file, (err, data) => {
                        if (err) {
                            rj(err);
                        } else {
                            rv({
                                data    : data.toString('binary'),
                                options : opts,
                                filename: f.file,
                                name    : f.upload_name,
                                httpr   : h
                            });
                        }
                    });
                } catch (err) {
                    rj(err);
                }
            }

        }).then((r) => {
            var mime_type = '';
            var header_data = `Content-Disposition: form-data; name=${'"'}${r.name}${'"'}; filename=${'"'}${r.filename}${'"'}\r\nContent-Type: ${mime_type}`;
            //header_data = Buffer.from(header_data, 'utf8').toString('binary');
            console.log(header_data);
            var bdy = hq.boundary();
            var payload = `\r\n--${bdy}\r\n${header_data}\r\n\r\n`;
            var end_data = `\r\n--${bdy}--\r\n`;
            r.options.headers['Content-Type'] += `boundary=${bdy}`;
            var http_request = r.httpr.request(r.options, (res) => {
                var ret_data = '';
                res.setEncoding('utf8');

                res.on('data', (data) => {
                    ret_data += data;
                });

                res.on('end', () => {
                    return callback(ret_data);
                });
            });

            http_request.on('error', (err) => {
                callback(err);
            });

            http_request.write(payload);

            var fstream = fs.createReadStream(r.filename, {bufferSize : 4096});
            fstream.pipe(http_request, {end :false});
            fstream.on('end', () => {
                http_request.end(end_data);
            });
            

            //http_request.write(post_data);
            //http_request.end();
            //return callback(post_data);
        }, (err) => {
            callback(err);
        });/*
        .then((ret) => {
        
        });
        */
    };

    this.fmtudat = function(data) {
        var bdy = this.boundary();
        var end_bdy = `${bdy}--\r\n`;
    };

    this.boundary = function() {
        var hash = crypto.createHash('md5');
        hash.update(`${Date.now()}-${Math.random()}`);
        var bdy = hash.digest('hex');

        return `---------------${bdy}`;
    };

    return {

        config  : this.config,
        headers : this.headers,
        args    : this.args,

        get     : this.get,
        post    : this.post,
        upload  : this.upload,

        fmtudat : this.fmtudat,

        boundary: this.boundary
    };

}();

module.exports = hq;

