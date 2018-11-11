const ant = require('./ant1.3.js');
const antsess = require('./ant-session.js');
const fs = require('fs');

ant.config.static_path = './static';
ant.config.static_on = true;
ant.upload_path = 'upload';

ant.addmiddle(function(req, res, next) {
    var m1 = new Promise((rv, rj) => {
        res.write("hello\n");
        rv({
            req : req,
            res : res,
            next: next
        });
    }).then(rr => {
        return rr.next.method(
            rr.req,
            rr.res,
            rr.next.next
        );
    });

    return m1;
}, ['/pt', '/']);

ant.addmiddle(function(req, res, next) {
    var m2 = new Promise((rv, rj) => {
        res.write("world\n");
        rv({
            req : req,
            res : res,
            next: next
        });
    }).then(rr => {
        return rr.next.method(
            rr.req,
            rr.res,
            rr.next.next
        );
    });

    return m2;
}, ['/pt', '/']);

ant.addmiddle(function(req, res, next){
    var mime_type = [
        'audio/mpeg',
        'video/mp4',
        'image/jpeg',
        'image/png'
    ];

    var mimeTypeFilter = function(mtype) {
        if (mime_type.indexOf(mtype) < 0) {
            return false;
        }
        return true;
    };

    return new Promise((rv, rj) => {
        rv({
            req : req,
            res : res,
            next : next
        });
    })
    .then((rr) => {
        if (rr.req.upload_files['file'] !== undefined) {
            var flist = rr.req.upload_files['file'];
            for(var i=0 ;i<flist.length; i++) {
                if (mimeTypeFilter(flist[i]['content-type']) === false) {
                    throw `MIME TYPE not be accepted : ${flist[i].filename}`;
                }
            }
        }

        return {
            req : rr.req,
            res : rr.res,
            next : rr.next.next
        };
    });
}, ['/upload']);


ant.get('/', function(req, res) {
    //console.log('user-data', req.user);
    res.end("success");
});

ant.post('/upload', function(req, res){
    var up_after = null;
    if (req.upload_files['image'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['image'][0]);
    } else if (req.upload_files['file'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['file'][0]);
    } else {
        res.send('Please named your file');
    }

    req.upload_files = undefined;

    if (up_after !== null) {
        up_after.then(function(val){
            res.send(val);
        }, function(err){
            res.send(err);
        });
    }
    
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

ant.get('/content/:id', (req, res, args) => {
    console.log(args);
    res.send(args);
});

ant.run('127.0.0.1', 2019);
