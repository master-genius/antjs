const ant = require('./ant1.6.5.js');
const antsess = require('./ant_sess_middleware.js');
const antupfilter = require('./ant_upload_middleware.js');
const fs = require('fs');

ant.config.static_path = './static';
ant.config.static_on = true;
ant.config.upload_path = `${ant.config.static_path}/upload`;
//ant.config.daemon = true;

antsess.config.expires = 3600;

antupfilter.middleware.preg = ['/upload', '/upimage'];

ant.usemiddle(antsess);
ant.usemiddle(antupfilter);

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

ant.post('/upimage', function(req, res){

    ant.moveuf({
        files : req.upload_files['image'],
        file_index : 0,
        upload_name : 'image'
    }, (err, data) => {
        if (err) {
            console.log(err);
            res.send('failed');
        } else {
            res.send(data);
        }

    });
    
});

ant.post('/pt', function(req, res){
    console.log(req.GET, req.POST);
    res.send(req.POST);
});

ant.get('/header', function(req, res){
    res.send(req.headers);
});

ant.get('/upage', function(req, res) {
    fs.readFile('view/upload.html', (err, data) => {
        if (err) {
            res.statusCode = 404;
            res.send('Not found');
        } else {
            res.send(data.toString('utf8'));
        }
    });
});

ant.get('/test', function(req, res) {
    fs.readFile('view/index.html', (err, data) => {
        if (err) {
            res.statusCode = 404;
            res.send('Not found');
        } else {
            res.send(data.toString('utf8'));
        }
    });
});

ant.get('/content/:id', (req, res, args) => {
    console.log(args);
    res.send(args);
});

ant.run('127.0.0.1', 5678);
//ant.run('127.0.0.1', 2019);

