var brutal = {
    html:function(cid,data,attach){
        var dq = document.querySelector(cid);
        if(dq){
            if (typeof data === undefined) {
                return dq.innerHTML;
            } else {
                if (attach == true) {
                    dq.innerHTML += data;
                } else {
                    dq.innerHTML = data;
                }
            }
        } else {
            return '';
        }
    },
    val:function(cid,data){
        var dq = document.querySelector(cid);
        if(dq&&dq.value!==undefined){
            if (data===undefined) {
                return dq.value;
            } else {
                dq.value = data;
            }
        } else {
            return '';
        }
    },
    autod:function(cid,data,attach){
        var dq = document.querySelector(cid);
        if(dq&&dq.value!==undefined){
            if (data===undefined) {
                return dq.value;
            } else {
                dq.value = data;
            }
        } else if(dq) {
            if (data===undefined) {
                return dq.innerHTML;
            } else {
                if (attach==true) {
                    dq.innerHTML += data;
                } else {
                    dq.innerHTML = data;
                }
            }
        } else {
            return '';
        }
    },
    autonode:function(cid,type=''){
        var dq = document.querySelector(cid);
        if (!dq) {
            return document;
        }
        if (type=='childs') {
            return dq.childNodes;
        } else if (type=='first') {
            return dq.firstChild;
        } else if (type=='last') {
            return dq.lastChild;
        } else {
            return dq;
        }
    },
    classname:function(cid,data){
        var dq = document.querySelector(cid);
        if(dq){
            if (data===undefined) {
                return dq.className;
            } else {
                dq.className = data;
            }
        } else {
            return '';
        }
    },
    checked:function(cid,handle,type){
        var dq = document.querySelectorAll(cid);
        if (!dq) {
            return false;
        }
        if(handle===undefined || handle===false){
            handle='bool';
            if(dq.length !==undefined) {
                handle='list';
            }
        }

        if(handle=='bool') {
            if(dq.length){
                return (dq[0].checked?true:false);
            }
            return (dq.checked?true:false);
        } else if (handle=='value') {
            if(dq.length && dq.length>0){
                for(var i=0;i<dq.length;i++){
                    if(dq[i].checked){
                        return dq[i].value;
                    }
                }
            }
            return dq.value;
        } else if (handle=='list') {
            if (type===undefined) {
                type = 'check';
            }

            var check_arr = [];
            var uncheck_arr = [];
            for(var i=0;i<dq.length;i++){
                if(dq[i].checked){
                    check_arr.push(dq[i].value);
                } else {
                    uncheck_arr.push(dq[i].value);
                }
            }

            return (type=='uncheck'?uncheck_arr:check_arr);
        } else if (handle=='set' || handle=='unset') {
            var chbool = (handle==='set'?true:false);
            for(var i=0;i<dq.length;i++){
                dq[i].checked = chbool;
            }
        } else {
            return null;
        }

    },
    selected:function(cid,handle,val){
        var dq = document.querySelector(cid);
        if (!dq) {
            return false;
        }
        if(dq.tagName!=='SELECT'){
            return ;
        }
        if(handle===undefined || handle===false){
            handle='value';
        }
        if (handle=='value' || handle=='html') {
            if(dq.options.length>0){
                if(handle=='html'){
                    return dq[dq.selectedIndex].innerHTML;
                } else {
                    return dq[dq.selectedIndex].value;
                }
            } else {
                return null;
            }
        } else if (handle=='set') {
            for(var i=0;i<dq.options.length;i++){
                if(dq.options[i].value == val){
                    dq.options[i].selected = true;
                    break;
                }
            }
        } else {
            return false;
        }
    },
    addevent:function(cid,ev,callback){
        var dq = document.querySelector(cid);
        if(!dq){
            return false;
        }
        if (typeof callback !== 'function') {
            return false;
        }
        dq.addEventListener(ev,callback);
    },
    rmevent:function(cid,ev,callback){
        var dq = document.querySelector(cid);
        if(!dq){
            return ;
        }
        if (typeof callback !== 'function') {
            return ;
        }
        dq.removeEventListener(ev,callback);
    },
    jsontodata:function(jsd){
        var data = '';
        for(var k in jsd){
            if (jsd[k] === undefined || jsd[k]===null) {
                continue;
            }
            if(typeof jsd[k] === 'object'){
                jsd[k] = jsd[k].toString();
            }
            data += k+'='+encodeURIComponent(jsd[k])+'&';
        }
        return data.substring(0,data.length-1);
    },
    domattr:function(cid,attr,val){
        var dq = document.querySelector(cid);
        if(!dq){
            return null;
        }
        if(dq[attr]!==undefined) {
            if(val===undefined){
                return dq[attr];
            }
            dq[attr] = val;
        } else {
            return null;
        }
    }
};
