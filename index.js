const ant = require('./ant1.1.js');


ant.config.static_path = './static';
ant.config.static_on = true;


ant.get('/', function(req, res) {
    res.end("success");
});

ant.post('/upload', function(req, res){
    //console.log(req.upload_files);
    if (req.upload_files['image'] !== undefined) {
        var up_name = ant.genUploadName(req.upload_files['image'][0].filename);

        ant.moveUploadFile(req.upload_files['image'][0], `images/${up_name}`, ()=>{
            res.end('');
        });
    } else if (req.upload_files['file'] !== undefined) {
        var up_name = ant.genUploadName(req.upload_files['file'][0].filename);
        ant.moveUploadFile(req.upload_files['file'][0], 
            `files/${up_name}`, ()=>{
                res.end('');
        });
    } else {
        res.end('');
    }
    
});

ant.post('/pt', function(req, res){
    console.log(req.post_data);
    res.end('');
});


ant.ants('127.0.0.1', 2018);
