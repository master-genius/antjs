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

var antsess = function() {

    this.config = {
        pre             : 'ant_sess_',
        cookie_name     : 'ANTSESSIONID',
        path            : '/tmp',
    };

    this.sess_data = {
        is_login    : false,
        sess_id     : '',
        user        : {}
    };

    this.middleware = {
        mid  : function(req, res) {
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

                res.setHeader('Set-Cookie', sess_cookie);
                antsess.sess_data.sess_id = sess_id;

                new Promise(function(resolve, reject){
                    fs.writeFile(antsess.config.path + '/' + sess_file, 
                        JSON.stringify(antsess.sess_data), 
                        function(err){
                            if (err) {
                                reject(err);
                            } else {
                                resolve(sess_file);
                            }
                    });
                }).then(function(sess_file){
                    
                }, function(err) {
                    console.log(err);
                });

            } else {
                var sess_id = cookie[antsess.config.cookie_name];
                var sess_file = antsess.config.path + '/' 
                                + antsess.config.pre + sess_id;

                try{
                    var user_data = fs.readFileSync(sess_file);
                    req.user = JSON.parse(user_data);
                } catch(err) {
                    console.log(err);
                }
            }
            
            return res;
        },

        fail : function(req, res, mid) {
            res.send(`Error: session failed -> ${mid.name}`);
        },

        preg : /.*/,

        name : 'ant-session'
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
        sess_data   : this.sess_data,
        middleware  : this.middleware,
        sessionId   : this.sessionId,
        login       : this.login,
        logout      : this.logout,

    };
}();

module.exports = antsess;
