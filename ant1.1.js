
const fs = require('fs');
const qs = require('querystring');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const cluster = require('cluster');
const os = require('os');

var ant = function(){
    this.config = {
        //max upload size in bytes
        upload_max_size : 5000000,

        post_max_size   : 9000000,

        //静态文件根目录
        static_path     : '',

        //开启静态文件支持
        static_on       : false,

        /*
            mem, path
            暂时只是实现了mem模式，文件会被放在内存里。

        */
        upload_mode     : 'mem',

    };

    /*
        'API NAME'  => {
            method : GET | POST,
            callback : function(req, res) {
            
            }
        }
    */

    this.api_table = {
    };
    
    this.get = function(api_path, callback) {
        this.addPath(api_path, 'GET', callback);
    };

    this.post = function(api_path, callback) {
        this.addPath(api_path, 'POST', callback);
    };

    this.addPath = function(api_path, method, callback) {
        this.api_table[api_path] = {
            method      : method,
            callback    : callback
        };
    };

    this.staticReq = function(path, req, res) {
        var pfile = this.config.static_path + '/' + path;
        new Promise(function(resolve, reject){
            fs.access(pfile, fs.constants.F_OK | fs.constants.R_OK, (err)=>{
                if (err) {
                    res.statusCode = 404;
                    resolve('');
                } else {
                    resolve(pfile);
                }
            });
        }).then(function(pfile){
            if (pfile === '') {
                res.end('');
                return ;
            }

            fs.readFile(pfile, (err, data) => {
                if (err) {
                    res.statusCode = 404;
                    res.end('');
                } else {
                    res.end(data);
                }
            });
        });

        /* fs.access(pfile, fs.constants.F_OK | fs.constants.R_OK, (err)=>{
            if (err) {
                res.statusCode = 404;
                res.end('');
            } else {
                fs.readFile(pfile, (err, data) => {
                    if (err) {
                        res.statusCode = 404;
                        res.end('');
                    } else {
                        res.end(data);
                    }
                });
            }
        }); */
    };

    this.execreq = function (path, req, res) {

        if (this.api_table[path] === undefined) {
            
            if (this.config.static_on) {
                return this.staticReq(path, req, res);
            }

            res.statusCode = 404;
            res.end("request not found");
            return ;
        }

        var R = this.api_table[path];

        if (req.method != R.method) {
            res.end(`Error: method not be allowed : ${req.method}`);
            return ;
        }

        if (req.method === 'POST' && req.is_upload === true) {
            //console.log(req.upload_data);
            this.parseUploadData(req, res);
        }

        R.callback(req, res);
    };

    /* upload single file, not in ranges */
    this.parseUploadData = function(req, res) {
        var bdy = req.headers['content-type'].split('=')[1];
        bdy = bdy.trim(' ');
        bdy = `--${bdy}`;
        end_bdy = bdy + '--';

        req.upload_files = {};
        //file end flag
        var end_index = req.upload_data.search(end_bdy);
        var bdy_crlf = `${bdy}\r\n`;

        var file_end = 0;
        var data_buf = '';

        while(1) {
            file_end = req.upload_data.substring(bdy_crlf.length).search(bdy);
            if ((file_end + bdy_crlf.length) >= end_index) {
                data_buf = req.upload_data.substring(bdy_crlf.length, end_index);
                this.parseSingleFile(data_buf, req);
                data_buf = '';
                break;
            }

            data_buf = req.upload_data.substring(bdy_crlf.length, file_end+bdy_crlf.length);
            this.parseSingleFile(data_buf, req);
            data_buf = '';

            req.upload_data = req.upload_data.substring(file_end+bdy_crlf.length);
            end_index = req.upload_data.search(end_bdy);
            if (end_index < 0) {
                break;
            }
        }
        
    };

    this.parseSingleFile = function(data, req) {
        var file_start = 0;
        var last_index = 0;
        last_index = data.search("\r\n\r\n");

        var header_data = data.substring(0, last_index);
        file_start = last_index + 4;

        var file_data = data.substring(file_start).trim();
        
        //parse header
        if (header_data.search("Content-Type") < 0) {
            //post form data, not file data
            var form_list = header_data.split(";");
            var tmp;
            for(var i=0; i<form_list.length; i++) {
                tmp = form_list[i].trim();
                if (tmp.search("name=") > -1) {
                    var name = tmp.split("=")[1].trim();
                    name = name.substring(0, name.length-1);
                    req.post_data[name] = file_data;
                    break;
                }
            }
        } else {
            //file data
            var form_list = header_data.split("\r\n");
            
            var tmp_name = form_list[0].split(";");
            var file_post = {
                filename        : '',
                'content-type'  : '',
                data            : '',
            };

            var name = '';
            for (var i=0; i<tmp_name.length; i++) {
                if (tmp_name[i].search("filename=") > -1) {
                    file_post.filename = tmp_name[i].split("=")[1].trim();
                    file_post.filename = file_post.filename.substring(1, file_post.filename.length-1);
                } else if (tmp_name[i].search("name=") > -1) {
                    name = tmp_name[i].split("=")[1].trim();
                    name = name.substring(1, name.length-1);
                }
            }

            file_post['content-type'] = form_list[1].split(":")[1].trim();
            file_post.data = file_data;
            if (req.upload_files[name] === undefined) {
                req.upload_files[name] = [file_post];
            } else {
                req.upload_files[name].push(file_post);
            }
        }

    };

    /*
        尽管可以使用content-type解析具体的文件类型，
        但是使用二进制写入，仅仅实现解析扩展名并重命名即可。
        解析content-type的功能交给一个独立的模块执行，
        用于控制上传文件的类型。
    */
    this.parseExtName = function(filename) {
        if (filename.search(".") < 0) {
            return '';
        }
        name_slice = filename.split('.');
        if (name_slice.length <= 0) {
            return '';
        }
        return name_slice[name_slice.length-1];
    };

    this.genUploadName = function(filename, pre_str='') {
        
        var org_name = `${pre_str}${Date.now()}`;
        var hash = crypto.createHash('sha1');
        hash.update(org_name);
        return hash.digest('hex') + '.' + this.parseExtName(filename);
    };

    this.moveUploadFile = function (file, target_file, callback) {
        var buffer_data = Buffer.from(file.data, 'binary');
        
        fs.writeFile(target_file, buffer_data, (err) => {
            if (err) throw err;
            callback();
        });
    };

    /*
        multipart/form-data
        multipart/byteranges
    */
    this.checkUploadHeader = function(headerstr) {
        var preg = /multipart.* boundary.*=/i;
        if (preg.test(headerstr)) {
            return true;
        }
        return false;
    };

    this.run = function(host='localhost', port = 8008) {

        http.createServer((req,res)=>{
            var body_data = '';
            var out_limit = false;
            var get_params = url.parse(req.url,true);
            
            req.query_params = get_params.query;
            req.pathinfo = get_params.pathname;

            var is_upload = false;

            if (req.method=='GET'){
                ant.execreq(get_params.pathname, req, res);
            } else if (req.method=='POST') {
                
                is_upload = ant.checkUploadHeader(req.headers['content-type']);
                
                req.on('data',(data)=>{
                    body_data += data.toString('binary');
                    if (body_data.length > ant.config.post_max_size || out_limit === true) {
                        body_data = '';
                        out_limit = true;
                    }
                });
            
                req.on('end',()=>{

                    //request too large
                    if (out_limit) {
                        res.statusCode = 413;
                        res.end('Request data too large');
                        return ;
                    }
                    
                    if (! is_upload) {
                        req.post_data = qs.parse(body_data);
                        req.is_upload = false;
                    } else {
                        req.is_upload = true;
                        req.post_data = {};
                        req.upload_data = body_data;
                    }

                    ant.execreq(get_params.pathname, req, res);
                });
            } else {
                res.statusCode = 405;
                res.end('Method not allowed');
            }

        }).listen(port, host);
    };

    this.ants = function(host, port, num = 0) {
        
        if (cluster.isMaster) {
            if (num <= 0) {
                num = os.cpus().length;
            }
            for(var i=0; i<num; i++) {
                cluster.fork();
            }
        } else if (cluster.isWorker){
            this.run(host, port);
            console.log(`listening ${host}:${port}`);
        }
    };
    
    return {
        config      : this.config,
        get         : this.get,
        post        : this.post,
        addPath     : this.addPath,
        api_table   : this.api_table,
        run         : this.run,
        ants        : this.ants,

        parseExtName : this.parseExtName,
        genUploadName : this.genUploadName,

        execreq     : this.execreq,
        staticReq   : this.staticReq,
        parseSingleFile   : this.parseSingleFile,
        parseUploadData   : this.parseUploadData,
        checkUploadHeader : this.checkUploadHeader,
        moveUploadFile    : this.moveUploadFile
    };

}();

module.exports = ant;
