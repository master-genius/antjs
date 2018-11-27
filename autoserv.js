
const ant = require('./ant1.7.1.js');
const antsess = require('./ant_sess_middleware.js');
const antupfilter = require('./ant_upload_middleware.js');
const fs = require('fs');

ant.config.static_path = './static';
ant.config.static_on = true;
ant.config.upload_path = `${ant.config.static_path}/upload`;
//ant.config.daemon = true;
//ant.config.https_on = true;
ant.config.https_options = {
    key  : './rsa/rsa_private.key',
    cert : './rsa/cert.crt'
};

//设置跨域
ant.addmiddle(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return next.method(req, res, next.next);
}, '');

antsess.config.expires = 3600;
ant.usemiddle(antsess);

antupfilter.middleware.preg = ['/upload'];
ant.usemiddle(antupfilter);

var path_table = [

    {
        path        : '/',
        method      : 'GET',
        callback    : function(req, res) {
            res.send('success');
        }
    },

    {
        path        : '/post-test',
        method      : 'POST',
        callback    : function(req, res) {
            console.log(req.GET, req.POST);
            res.send(req.POST);
        }
    },

    {
        path        : '/header',
        method      : 'GET',
        callback    : function(req, res) {
            res.send({
                request   : req.headers,
                response  : res.getHeaders()
            });
        }
    },

    {
        path        : '/content/:id/@type',
        method      : 'GET',
        callback    : function(req, res, args) {
            res.send(args);
        }
    }

];

ant.autoRoute(path_table);


ant.post('/upload', function(req, res){
    var up_after = null;
    if (req.upload_files['image'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['image'], 0, 'image');
    } else if (req.upload_files['file'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['file'], 0, 'file');
    } else {
        res.send('Please named your file');
    }

    req.upload_files = undefined;

    if (up_after === false) {
        res.send('Error: file not found');
    }

    if (up_after.message !== undefined) {
        res.send(up_after.message);
    }

    res.send(up_after);
});


ant.ants('127.0.0.1', 5678);
//ant.run('127.0.0.1', 2019);

