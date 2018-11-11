const ant = require('./ant1.2.js');
const antsess = require('./ant-session.js');


ant.config.static_path = './static';
ant.config.static_on = true;
ant.upload_path = 'upload';

/* ant.addmiddle(function(req, res){
    res.write("hello\n");

    return res;
}, function(req, res, mid) {
    console.log(mid);
    res.send(`failed : ${mid.name}`);
}, ['/pt', '/'], 'test');

ant.addmiddle(function(req, res){
    res.write("world\n");

    return res;
}, function(req, res, mid) {
    console.log(mid);
    res.send(`failed : ${mid.name}`);
}, ['/pt', '/'], 'test2'); */

ant.usemiddle(antsess);

ant.get('/', function(req, res) {
    console.log('user-data', req.user);
    res.end("success");
});

ant.post('/upload', function(req, res){
    var up_after = null;
    if (req.upload_files['image'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['image'][0]);
    } else if (req.upload_files['file'] !== undefined) {
        up_after = ant.moveUploadFile(req.upload_files['file'][0]);
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
    console.log(req.headers);
    res.send(req.post_data);
});

ant.get('/header', function(req, res){
    res.send(req.headers);
});

ant.get('/content/:id', (req, res, args) => {
    console.log(args);
    res.send(args);
});

ant.run('127.0.0.1', 2018);
