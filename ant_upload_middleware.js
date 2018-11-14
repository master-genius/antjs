
var antupfilter = function () {

    this.config = {

        //mime OR ext, mime -> mime_type; ext -> type
        type_mode   : 'mime',

        type        : [
            '.jpg', '.png', '.gif', '.mp3', '.mp4'
        ],

        mime_type   : [
            'image/jpeg', 'image/png', 'image/gif', 'audio/mp3', 'video/mp4'
        ],

        //max size in bytes
        max_size    : 2000000,

        throw_err   : 'Failed to check file limit; ',

        /*
            上传文件的索引名称，如果不设置，则会默认检测所有req.upload_files中的文件。
        */
        upload_name : '',
        
    };

    this.middleware = {

        method : function(req, res, next) {

            var ext_filter = function(filename) {
                var n_split = filename.split('.').filter(s => s.length > 0);
                var extname = '';
                if (n_split.length > 0) {
                    extname = n_split[n_split.length];
                } else {
                    return false;
                }
                if (antupfilter.config.type.indexOf(extname) < 0) {
                    return false;
                }
                return true;
            };

            var mime_filter = function(mime) {
                if (antupfilter.config.mime_type.indexOf(mime) < 0) {
                    return false;
                }
                return true;
            };

            var failed_list = [];

            var filter_file = function (file) {
                var r = false;
                if (antupfilter.config.type_mode === 'ext') {
                    r = ext_filter(file.filename);
                } else {
                    r = mime_filter(file['content-type']);
                }

                if (r === false) {
                    failed_list.push({
                        name    : file.filename,
                        err     : 'illegal file type'
                    });
                    return false;
                }

                if (antupfilter.config.max_size < file.data.length) {
                    failed_list.push({
                        name : file.filename,
                        err  : `file size out of limit : ${antupfilter.config.max_size}`
                    });
                    return false;
                }

                return true;
            }

            if (antupfilter.config.upload_name === '') {
                for (var k in req.upload_files) {

                    for (var i=0; i < req.upload_files[k].length; i++) {
                        filter_file(req.upload_files[k][i]);
                    }
                }
            } else if (req.upload_files[antupfilter.config.upload_name] !== undefined) {
                var flist = req.upload_files[antupfilter.config.upload_name];
                for(var i=0; i < flist; i++) {
                    filter_file(flist[i]);
                }
            } else {
                return next.method(req, res, next.next);
            }

            if (failed_list.length > 0) {
                res.statusCode = 415;
                var throw_type = typeof antupfilter.config.throw_err;
                if (throw_type === 'function') {
                    throw antupfilter.config.throw_err(failed_list);
                } else if (throw_type === 'string') {
                    throw `${antupfilter.config.throw_err}${JSON.stringify(failed_list)}`;
                } else {
                    throw JSON.stringify(failed_list);
                }
            }


            return next.method(req, res, next.next);
        },

        preg : /.*/
    };

    return {
        config          : this.config,
        middleware      : this.middleware 
    };

}();

module.exports = antupfilter;

