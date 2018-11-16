const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const urlparse = require('url');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var hq = function() {
    

    this.config = {
        
        //protocol    : 'https',

        //请求结束自动清理options和headers
        autoreset   : false,
    };
    
    //设置此消息头，可以覆盖掉默认选项，可以添加
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
        'jpg'   : 'image/jpeg',
        'jpeg'  : 'image/jpeg',
        'png'   : 'image/png',
        'js'    : 'application/x-javascript',
        'mp3'   : 'audio/mpeg',
        'mp4'   : 'video/mp4',
        'c'     : 'text/plain',
        'exe'   : 'application/octet-stream',
        'txt'   : 'text/plain',
        'wav'   : 'audio/x-wav',
        'svg'   : 'image/svg+xml',
        'tar'   : 'application/x-tar',
    };

    this.default_mime   = 'application/octet-stream';

    this.args   = {
        query   :   '',
    };

    this.extName = function(filename) {
        var name_split = filename.split('.').filter(p => p.length > 0);
        if (name_split.length < 2) {
            return '';
        }

        return name_split[name_split.length - 1];
    };

    this.mimeType = function(filename) {
        var extname = this.extName(filename);
        if (extname !== '' && this.mime_map[extname] !== undefined) {
            return this.mime_type[extname];
        }
        return this.default_mime;
    };

    this.parseUrl = function(url) {
        var u = new urlparse.URL(url);

        var opts = {
            protocol    : u.protocol,
            host        : u.host,
            hostname    : u.hostname,
            port        : u.port,
            path        : u.pathname,
            method      : '',
            headers     : {
            
            }
        };
        if (u.search.length > 0) {
            opts.path += `?${u.search}`;
        }
        if (u.protocol === 'https') {
            opts.requestCert = false;
            opts.rejectUnauthorized = false;
        }

        return opts;
    };

    this.get = function() {
    };


    this.post = function(url, data, callback) {
        var opts = this.parseUrl(url);
        var h = (opts.protocol === 'https') ? https : http;
        opts.method = 'POST';
        opts.headers = {
            'Content-Type'  : 'application/x-www-form-urlencoded',
        };

    };

    /*
        options = {
            
        }
    */
    this.upload = function(url, f, callback) {
        //var h = (this.config.protocol === 'https') ? https : http;

        var opts = this.parseUrl(url);

        var h = (opts.protocol === 'https') ? https : http ;

        opts.method = 'POST';
        opts.headers = {
            'Content-Type'  : 'multipart/form-data; '
        };
       
        return new Promise((rv, rj) => {
            if (f.file === undefined) {
                rj(new Error('file not found'));
            } else {
                try {
                    fs.accessSync(f.file, fs.constants.F_OK|fs.constants.R_OK);
                    
                    var name_split = f.file.split('/').filter(p => p.length > 0);
                    var filename   = name_split[name_split.length - 1];
                    var mime_type  = hq.mimeType(filename);

                    fs.readFile(f.file, (err, data) => {
                        if (err) {
                            rj(err);
                        } else {
                            rv({
                                data        : data.toString('binary'),
                                options     : opts,
                                filename    : filename,
                                pathname    : f.file,
                                name        : f.upload_name,
                                httpr       : h,
                                mime_type   : mime_type
                            });
                        }
                    });
                } catch (err) {
                    rj(err);
                }
            }

        }).then((r) => {
            var header_data = `Content-Disposition: form-data; name=${'"'}${r.name}${'"'}; filename=${'"'}${r.filename}${'"'}\r\nContent-Type: ${r.mime_type}`;
            //header_data = Buffer.from(header_data, 'utf8').toString('binary');
            console.log(header_data);
            var bdy = hq.boundary();
            var payload = `\r\n--${bdy}\r\n${header_data}\r\n\r\n`;
            var end_data = `\r\n--${bdy}--\r\n`;
            r.options.headers['Content-Type'] += `boundary=${bdy}`;
            r.options.headers['Content-Length'] = Buffer.byteLength(payload) + Buffer.byteLength(end_data) + fs.statSync(r.pathname).size;

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
            
        }, (err) => {
            callback(err);
        });
        
        /*
        .then((ret) => {
        
        });
        */
    };

    this.boundary = function() {
        var hash = crypto.createHash('md5');
        hash.update(`${Date.now()}-${Math.random()}`);
        var bdy = hash.digest('hex');

        return `---------------${bdy}`;
    };

    return {

        config    : this.config,
        headers   : this.headers,
        args      : this.args,
        mime_map  : this.mime_map,

        default_mime : this.default_mime,

        get       : this.get,
        post      : this.post,
        upload    : this.upload,

        parseUrl  : this.parseUrl,
        extName   : this.extName,
        mimeType  : this.mimeType,

        boundary  : this.boundary
    };

};

module.exports = hq;

