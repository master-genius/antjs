const fs = require('fs');
const qs = require('querystring');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const cluster = require('cluster');
const os = require('os');

var ant = function(){
    this.config = {
        //此配置表示POST提交表单的最大字节数，也是上传文件的最大限制，
        //注意在run函数中设置了上限的最小值，如果用户设置的上限过低则会自动改为最小值。
        post_max_size   : 10000000,

        //静态文件根目录
        static_path     : '',

        //开启静态文件支持
        static_on       : false,

        /*
            mem, path
            暂时只是实现了mem模式，文件会被放在内存里。

        */
        upload_mode     : 'mem',

        upload_tmp_path : '/tmp',

        //默认上传路径，自动上传函数会使用
        upload_path     : './upload',

        //是否根据上传名称自动创建目录，默认为true表示开启，此功能暂时不支持
        upload_name_dir : true,

    };

    /*
        'API NAME'  => {
            method : GET | POST,
            callback : function(req, res) {
            
            }
        }
    */
    this.api_table = {};
    
    this.get = function(api_path, callback) {
        this.addPath(api_path, 'GET', callback);
    };

    this.post = function(api_path, callback) {
        this.addPath(api_path, 'POST', callback);
    };

    this.any = function(api_path, callback) {
        this.addPath(api_path, 'ANY', callback);
    };

    this.addPath = function(api_path, method, callback) {
        var i = api_path.search('@');
        if (i >= 0) {
            var pt = api_path.split('/').filter(p => p.length > 0);
            if (pt[pt.length-1].search('@') < 0) {
                throw new Error('path route illegal : @VAR must at the last');
            }
            if (api_path.substring(0,i).search('@') >= 0) {
                throw new Error('path route illegal : too many @');
            }
        }

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
                    reject(pfile);
                } else {
                    resolve(pfile);
                }
            });
        }).then(function(pfile){
            fs.readFile(pfile, (err, data) => {
                if (err) {
                    res.statusCode = 404;
                    res.end(`file not found : ${pfile}`);
                } else {
                    res.end(data);
                }
            });
        }, function(pfile) {
            res.statusCode = 404;
            res.end(`file not found : ${pfile}`);
        });
    };

    /*
        中间件模式采用Promise链式设计，当一个中间件被调用以后会返回一个Promise对象，
        then方法接收的是req和res以及一个表示下层中间件的next,在中间件函数中，如果
        处理失败则要抛出错误，此时链式最后的catch函数捕获并结束调用。
        中间件的编写一定要是这样的形式：
        function(req, res, next) {
            return new Promise((resolve, reject) => {
                //something code
                resolve({
                    req : req,
                    res : res,
                    next: next
                }); 
            })
            .then((rr) => {
                //code
                return rr.next.method(
                    rr.req,
                    rr.res,
                    rr.next.next);
            });
        }
        rr是一个对象{req : request, res : response};

    */
    this.middleware = [];

    /*
        mid  : 中间件函数
        preg : 正则匹配，匹配成功的路径才会执行
        name : 中间件名称
    */
    this.addmiddle = function(mid, preg = /.*/) {
        if (typeof mid === 'function') {
            var last = this.middleware.length - 1;
            var real_mid = function(req, res, next) {
                var self_preg = preg;
                
                if (typeof self_preg === 'string') {
                    if (!(self_preg == req.pathinfo)) {
                        return next.method(req, res, next.next);
                    }
                } else if (self_preg instanceof RegExp) {
                    if (! self_preg.test(req.pathinfo)) {
                        return next.method(req, res, next.next);
                    }
                } else if (self_preg instanceof Array) {
                    if (self_preg.indexOf(req.pathinfo) < 0) {
                        return next.method(req, res, next.next);
                    }
                }
                
                return mid(req, res, next);
            };

            this.middleware.push({
                method : real_mid,
                preg   : preg,
                next   : {
                    method : function(req, res, next) {
                        return {
                            req : req,
                            res : res,
                            next: next
                        };

                    },
                    next : null
                }
            });
            if (last >= 0) {
                this.middleware[last].next = this.middleware[this.middleware.length-1];
            }
        }
    };

    /*
        此函数主要用于以下场景：实现一个独立的中间件模块，但是
        addmiddle添加中间件的方式比较麻烦，所以一个独立的模块只需要按照
        规则提供一个middleware属性，此函数会自动检测是否具备middleware属性，
        并且middleware是否符合规则：
        {
            mid   : function(req, res){...},
            preg  : [] OR String OR regex,
            name  : NAME_STRING
        }
    */
    this.usemiddle = function(mid) {
        if (typeof mid.middleware === 'object') {
            if (typeof mid.middleware.mid === 'function') {
                var preg = '';
                if (typeof mid.middleware.preg !== undefined) {
                    preg = mid.middleware.preg;
                }

                this.addmiddle(mid.middleware.mid, preg);
            }
        }
    };

    this.runMiddleware = function(req, res, route_key=null, args=null) {
        req.route_key = route_key;
        req.request_args = args;
        var start_chain = new Promise(function(resolve, reject) {
            resolve({
                req : req,
                res : res,
            });
        }).then((rr) => {
            if (ant.middleware.length > 0) {
                var mchain = ant.middleware[0].method(
                    rr.req,
                    rr.res,
                    ant.middleware[0].next
                );
                
                return mchain;
            } else {
                return rr;
            }
        }).then(rr => {
            if (args !== null) {
                ant.api_table[route_key].callback(rr.req, rr.res, args);
            } else {
                ant.api_table[route_key].callback(rr.req, rr.res);
            }
        }).catch(err => {
            if (typeof err === 'string') {
                res.send(err);
            } else if (typeof err === 'object') {
                if (err.fail !== undefined && typeof err.fail === 'function') {
                    err.fail(err);
                } else if (err.errinfo !== undefined) {
                    res.send(err.errinfo);
                } else {
                    res.send(JSON.stringify(err));
                }
            } else if (typeof err === 'function') {
                err();
            } else {
                res.send(JSON.stringify(err));
            }
        });

    };

    /*
        路由匹配最好不要用过于复杂的文本处理，包括字符串解析，分割，正则匹配等，
        这会导致性能损耗，并且对学习，以及维护都是高成本的，实际的场景也不需要十分复杂。
        一个路由可以由/分割成多个路径，就像是文件的路径，但是每部分的名称都需要严格的限定。
        最简单的情况是普通的文本匹配，这种情况在execreq中直接解决，findPath解决的是需要
        动态匹配参数的情况。限制规则十分简单，  
            :表示后面的变量是必需的，@表示后面的变量是可选的。@表示的变量只能出现在最后。
        /content/:id
        /content/@id
        /content/:id/@type
    */

    this.findPath = function(path) {
        var path_split = path.split('/');
        path_split = path_split.filter(p => p.length > 0);

        var ap = [];
        var ind = 0;
        var next = 0;
        var args = {};
        for (var k in this.api_table) {
            if (k.search(':') < 0 && k.search('@') < 0) {
                continue;
            }
            ap = k.split('/').filter(p => p.length > 0);
            if (ap.length !== path_split.length) {
                if (k.search('@') >= 0 && ap.length-1 !== path_split.length) {
                    continue;
                }
                if (path_split.length > ap.length) {
                    continue;
                }
            }
            next = false;
            args = {};
            for(ind=0; ind < ap.length; ind++) {
                if (ind >= path_split.length) {
                    break;
                }
                if (ap[ind].search(':') >= 0 || ap[ind].search('@') >= 0) {
                    args[ap[ind].substring(1)] = path_split[ind];
                } else if (ap[ind] !== path_split[ind]) {
                    next = true;
                    break;
                }
            }

            if (next) {
                continue;
            }
            return {
                key : k,
                args : args
            };
        }

        return null;
    };

    this.execreq = function (path, req, res) {
        var pk = null;
        var route_key = null;
        req.user_real_path = path;
        /*  */
        if (this.api_table[path] === undefined) {
            pk = this.findPath(path);
            if (pk !== null) {
                route_key = pk.key;
            } else if (this.config.static_on) {
                return this.staticReq(path, req, res);
            } else {
                res.statusCode = 404;
                res.end("request not found");
                return ;
            }
        } else {
            route_key = path;
        }

        if (route_key !== null) {
            var R = this.api_table[route_key];

            if (R.method !== 'ANY' && req.method != R.method) {
                res.end(`Error: method not be allowed : ${req.method}`);
                return ;
            }
    
            if (req.method === 'POST' && req.is_upload === true) {
                //console.log(req.upload_data);
                this.parseUploadData(req, res);
            }
        }

        this.runMiddleware(req, res, route_key, pk===null?pk:pk.args);
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
        header_data = Buffer.from(header_data, 'binary').toString('utf8');

        file_start = last_index + 4;

        var file_data = data.substring(file_start, data.length-2);
        data = '';
        
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
                    req.POST[name] = file_data;
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

            if (name == '') {
                file_data = '';
                return ;
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

    this.moveUploadFile = function (file, target_file = '') {
        var buffer_data = Buffer.from(file.data, 'binary');
        var file_name = this.genUploadName(file.filename, 'upload_');
        if (target_file == '') {
            target_file = this.config.upload_path + '/' + file_name;
        }

        return new Promise(function(resolve, reject) {
            fs.writeFile(target_file, buffer_data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        status   : 0,
                        pathname : target_file,
                        filename : file_name
                    });
                }
            });
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

    /*
        解析请求并解析数据，请求的路径会放在req.pathinfo中，GET提交的数据在req.GET获取，
        POST提交的数据在req.POST获取，req.upload_data暂存POST上传的数据，解析后会
        放在req.upload_files中，按照上传的消息头name属性名称进行分组，文件作为列表存储，
        因为多个文件扩展消息头name的值可以相同。
    */
    this.run = function(host='localhost', port = 8008) {

        if (this.config.post_max_size < 1024) {
            this.config.post_max_size = 1024;
        }

        http.createServer((req,res)=>{

            res.send = function(data) {
                if (typeof data === 'object') {
                    res.end(JSON.stringify(data));
                } else if (data instanceof Array) {
                    res.end(JSON.stringify(data));
                } else if (typeof data === 'string'){
                    res.end(data);
                } else {
                    res.end('');
                }
            };

            var body_data = '';
            var out_limit = false;
            var get_params = url.parse(req.url,true);
            
            req.GET = get_params.query;
            req.pathinfo = get_params.pathname;

            if (get_params.pathname == '') {
                get_params.pathname = '/';
            }

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
                        req.POST = qs.parse(body_data);
                        req.is_upload = false;
                    } else {
                        req.is_upload = true;
                        req.POST = {};
                        req.upload_data = body_data;
                    }

                    ant.execreq(get_params.pathname, req, res);
                });
            } else {
                res.statusCode = 405;
                res.setHeader('Allow', 'GET,POST');
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
        api_table   : this.api_table,

        get         : this.get,
        post        : this.post,
        any         : this.any,
        addPath     : this.addPath,
        findPath    : this.findPath,
        
        run         : this.run,
        ants        : this.ants,

        parseExtName : this.parseExtName,
        genUploadName : this.genUploadName,

        middleware      : this.middleware,
        addmiddle       : this.addmiddle,
        usemiddle       : this.usemiddle,
        runMiddleware   : this.runMiddleware,

        execreq     : this.execreq,
        staticReq   : this.staticReq,
        parseSingleFile   : this.parseSingleFile,
        parseUploadData   : this.parseUploadData,
        checkUploadHeader : this.checkUploadHeader,
        moveUploadFile    : this.moveUploadFile
    };

}();

module.exports = ant;
