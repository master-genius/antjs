/*
    此Session会话的中间件并不能够提供直接的登录支持，实际对接的是一个
    真实的操作过程，而这个过程可以是用户自行定义的。

    会话存储格式：
    {
        is_login    : true | false,
        user        : {
            //user数据是用户自行定义的
        }
    }
*/

const fs = require('fs');
const crypto = require('crypto');

var antsess = function(){

    this.config = {
        pre             : 'antsess_',
        cookie_name     : 'ANTSESSIONID',
        path            : '/tmp',
    };

    this.sess_data = {
        is_login    : false,
        sess_id     : '',
        user        : {}
    };

    this.middleware = {
        method : function(req, res, next) {
            var cookie = {};
            if (req.headers['cookie'] !== undefined) {
                var csp = req.headers['cookie'].split(';').filter(c => c.length > 0);
                var tmp = '';
                var name = '';

                for (var i=0; i<csp.length; i++) {
                    if (csp[i].search('=') < 0) {
                        continue;
                    }

                    tmp = csp[i].split('=').filter(p => p.length > 0);
                    if (tmp.length < 2) {
                        continue;
                    }
                    name = tmp[0].trim();
                    if (name.length > 0) {
                        cookie[name] = tmp[1];
                    }
                    
                }
            }

            if (cookie[antsess.config.cookie_name] === undefined) {
                var sess_id = antsess.sessionId();
                var sess_file = antsess.config.pre + sess_id;
                var sess_cookie = [
                    `${antsess.config.cookie_name}=${sess_id}`,
                    //`Domain=127.0.0.1:2018`,
                    `Path=/`,
                    //`Expires=`
                    'HttpOnly'
                ];

                req.user = antsess.user_data;
                antsess.sess_data.sess_id = sess_id;

                return new Promise(function(resolve, reject){
                    fs.writeFile(antsess.config.path + '/' + sess_file, 
                        JSON.stringify(antsess.sess_data), 
                        function(err){
                            var ret_next = {
                                req : req,
                                res : res,
                                next : next
                            };
                            if (err) {
                                ret_next.err = err;
                            }
                            resolve(ret_next);
                    });
                }).then(function(rr) {
                    if (rr.err !== undefined) {
                        console.log(rr.err);
                    } else {
                        res.setHeader('Set-Cookie', sess_cookie);
                    }
                    return rr.next.method(
                                rr.req,
                                rr.res,
                                rr.next.next
                            );
                });

            } else {
                var sess_id = cookie[antsess.config.cookie_name];
                var sess_file = antsess.config.path + '/' 
                                + antsess.config.pre + sess_id;

                return new Promise((rv, rj) => {
                    fs.readFile(sess_file, (err, data) => {
                        var ret_next = {
                            req : req,
                            res : res,
                            next : next
                        };
                        req.user = antsess.user_data;
                        if (err) {
                            ret_next.err = err;
                        } else {
                            req.user = JSON.parse(data.toString());
                        }
                        rv(ret_next);
                    });
                }).then((rr) => {
                    if (rr.err !== undefined) {
                        console.log(err);
                    }
                    return rr.next.method(rr.req, rr.res, rr.next.next);
                });
            }
            
        },

        preg : /.*/
    };

    this.sessionId = function() {
        var org_name = `sess_${Date.now()}__${Math.random()}`;
        var hash = crypto.createHash('sha1');
        hash.update(org_name);
        return hash.digest('hex');
    };

    /*
        login和logout返回的都是Promise对象，调用者通过then方法可以获取
        成功和失败的状态并作下一步处理。
    */

    this.login = function(req, res, data) {
        req.user.is_login = true;
        req.user.user_data = data;
        return new Promise(function(resolve, reject){
            fs.writeFile(sess_file, JSON.stringify(req.user), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve('ok');
                }
            });
        });
    };

    this.logout = function(req, res) {
        if (req.user.is_login === false) {
            return true;
        }
        var sess_id = req.user.sess_id;
        var sess_file = antsess.config.path + '/' + antsess.config.pre + sess_id;
        
        req.user.is_login = false;
        req.user.user_data = {};

        return new Promise(function(resolve, reject){
            fs.writeFile(sess_file, JSON.stringify(req.user), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve('ok');
                }
            });
        });

    };

    return {
        config      : this.config,
        middleware  : this.middleware,
        sess_data   : this.sess_data,
        sessionId   : this.sessionId,
        login       : this.login,
        logout      : this.logout,
    };

}();

module.exports = antsess;
