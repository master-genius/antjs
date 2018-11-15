const h = require('./hq.js');

var url = 'http://127.0.0.1:2020/upload';

h.config.protocol = 'http';

h.upload(
    url,
    {
        file : '/home/brave/tmp/he.jpg',
        upload_name : 'image',
    },
    (data) => {
        console.log(data);
    }
);

