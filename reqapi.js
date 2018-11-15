const https = require('https');
const http = require('http');
const qs = require('querystring');
const urlparse = require('url');

var _req = function () {

    this.pget = function(url, protocol = 'https') {
        var h = (protocol == 'https') ? https : http;
        return new Promise((resolve, reject) => {
            h.get(url, (res) => {
                resolve(res);
            }).on('error', (e) => {
                return reject(e);
            });
        });
    };

    this.get = function(url, handler, protocol='https') {

        var h = (protocol=='https') ? https : http;

        h.get(url, (res)=>{

            let error;
            if (res.statusCode !== 200) {
                error = new Error(`request failed, status code:
                                    ${res.statusCode}`
                                );
            }

            if (error) {
                console.error(error.message);
                res.resume();
                return ;
            }

            res.setEncoding('utf8');

            if (typeof handler.onbefore === 'function') {
                handler.onbefore(res);
            }

            res.on('data', (d)=>{
                var ty = typeof handler.ondata;
                if (ty === 'function') {
                    return handler.ondata(res, d);
                } else if (ty === 'object') {
                    if (handler.ondata.data!==undefined) {
                        handler.ondata.data += d.toString();
                    }
                }
            });

            res.on('end', () => {
                if (typeof handler.onend === 'function') {
                    handler.onend(res);
                }
            });
        }).on('error', (e) => {
            if (typeof handler.errcall === 'function') {
                handler.errcall(e);
            }
        });
    };

    /*
        mixd : {
            url : [URL],
            data : [POST_DATA],
            type:[json|form|text]
        }
    */
    this.post = function(mixd, handler, protocol='https') {
        var content_type_dict = {
            'form' : 'application/x-www-form-urlencoded',
            'json' : 'application/json',
            'text' : 'application/plain'
        };

        var h = (protocol=='https') ? https : http;
        var ubj = new urlparse.URL(mixd.url);

        var post_data = qs.stringify(mixd.data);

        var opts = {
            host:ubj.host,
            hostname:ubj.hostname,
            path:ubj.pathname,
            method:'POST',
            headers:{
                'Content-Type' : content_type_dict['form'],
                'Content-Length' : Buffer.byteLength(post_data)
            }
        };
        if (ubj.port !== '') {
            opts.port = ubj.port;
        }
        if (mixd.type !== undefined 
            && content_type_dict[mixd.type] !== undefined
        ) {
            opts.headers["Content-Type"] = content_type_dict[mixd.type];
        }

        var r = h.request(opts, (res)=>{
            res.setEncoding('utf8');
            res.on('data', (d) => {
                if (typeof handler.ondata === 'function') {
                    handler.ondata(res, d);
                }
                //console.log(d);
            });
            res.on('end', () => {
                if (typeof handler.onend === 'function') {
                    handler.onend(res);
                }
            });
        }).on('error', (e)=>{
            if (typeof handler.errcall === 'function') {
                handler.errcall(e);
            }
        });

        r.write(post_data);
        r.end();
    };

    return {
        pget:this.pget,
        get:this.get,
        post:this.post
    };

}();

module.exports = {
    pget:_req.pget,
    get:_req.get,
    post:_req.post
};
