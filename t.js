const httpreq = require('./hq.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var host = 'https://127.0.0.1:2020';

var upload_url = `${host}/upload`;

var h = new httpreq();

/*
h.upload(
    upload_url,
    {
        file : '/home/brave/tmp/he.jpg',
        upload_name : 'image',
    },
    (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log(data);
        }
    }
);
*/
/*
h.get(`${host}/content/1234`, 
    (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log(data);
        }
    }
);
*/

h.post(`${host}/pt?a=123`,
    {
        x : 12.3,
        y : 34.5
    },
    (err, data) => {
        if (err) {
            console.log(err);
        } else {
            console.log(data);
        }
    }
);

