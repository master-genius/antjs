var raj = function() {
    this.ajax = function (xd){
        if(xd.async === undefined){
            xd.async = true;
        }

        if(xd.success === undefined){
            xd.success = function(xr){xr=null;};
        }

        if (xd.error === undefined) {
            xd.error = function(xr){xr=null;};
        }
        if(xd.datatype == 'json'){
            xd.data = JSON.stringify(xd.data);
        }
        var retdata = '';
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if(xhr.readyState==4){
                if(xhr.status==200){
                    if(xd.retformat == 'json'){
                        try{
                            retdata = JSON.parse(xhr.responseText);
                        } catch(e) {
                            if (typeof xd.except === 'function') {
                                xd.except(e);
                            }
                        }
                    } else {
                        retdata = xhr.responseText;
                    }
                    xd.success(retdata);
                } else {
                    xd.error({status_code:xhr.status});
                }
                retdata=null;
                xhr.responseText=null;
            }
        }
        if( xd.type == 'POST' || xd.type == 'post'){
            xhr.open("POST",xd.url,xd.async);
            xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            xhr.send(xd.data);
        } else if( xd.type == 'GET' || xd.type == 'get') {
            xhr.open("GET",xd.url,xd.async);
            xhr.send();
        }
    };


    this.get = function (xd){
        if (xd.retformat===undefined) {
            xd.retformat = 'json';
        }
        this.ajax({
            url:xd.url,
            type:'get',
            data:'',
            datatype:xd.datatype,
            success:xd.success,
            error:xd.error,
            async:true,
            retformat:xd.retformat,
            except:xd.except
        });
    };

    this.post = function (xd){
        if (xd.retformat===undefined) {
            xd.retformat = 'json';
        }
        this.ajax({
            url:xd.url,
            type:'post',
            data:xd.data,
            datatype:xd.datatype,
            success:xd.success,
            error:xd.error,
            async:true,
            retformat:xd.retformat,
            except:xd.except
        });
    };

    this.uploadOne = function (file,jup){
        if(jup.success === undefined){
            jup.success = function(){};
        }
        if(jup.error === undefined){
            jup.error = function(){};
        }
        if(jup.retformat === undefined){
            jup.retformat = 'json';
        }
        var retdata = '';
        var frd = new FileReader();
        frd.onload = function(){
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if(xhr.readyState==4){
                    if(jup.retformat == 'json'){
                        try{
                            retdata = JSON.parse(xhr.responseText);
                        } catch(e) {
                            if (jup.except !== undefined &&
                                 typeof jup.except === 'function') {
                                jup.except(e);
                            } else {
                                retdata = xhr.responseText;
                            }
                        }
                    } else {
                        retdata = xhr.responseText;
                    }

                    if(xhr.status==200){
                        jup.success(retdata);
                    }
                    else if(xhr.status >= 400){
                        jup.error({status : xhr.status, errinfo : retdata});
                    }
                }
            }
            var fd = new FormData();
            xhr.open("POST",jup.url,true);
            //xhr.setRequestHeader("content-length",file.size);
            xhr.overrideMimeType("application/octet-stream");
            fd.append(jup.upload_name,file);
            xhr.send(fd);
        }
        frd.readAsBinaryString(file);
    };

    this.upload = function (file,jup){
        if(file.files.length>0){
            this.uploadOne(file.files[0],jup);
        }
    };

    return {
        ajax : ajax,
        get  : this.get,
        post : this.post,
        uploadOne : this.uploadOne,
        upload : this.upload
    };
}();
