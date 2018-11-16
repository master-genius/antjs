const h = require('./hq.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var url = 'https://127.0.0.1:2020/upload';

h.config.protocol = 'https';

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

