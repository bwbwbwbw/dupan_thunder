// ==UserScript==
// @name        dupan_thunder
// @author      SummerWish
// @description 使用迅雷下载百度网盘链接
// @license     GPL version 3
// @encoding    utf-8
// @modified    05/10/2015
// @include     http://pan.baidu.com/*
// @include     http://yun.baidu.com/*
// @exclude     http://yun.baidu.com
// @exclude     http://yun.baidu.com/#*
// @exclude     http://pan.baidu.com/share/manage*
// @exclude     http://pan.baidu.com/disk/recyclebin*
// @exclude     http://yun.baidu.com/pcloud/album/info*
// @grant       unsafeWindow
// @grant       GM_setClipboard
// @run-at      document-end
// @version     0.0.1
// ==/UserScript==

/*
 *原作者: 有一份田
 *原官网: http://www.duoluohua.com/download/
 *原Git: http://git.oschina.net/youyifentian
 */

var VERSION = '2.4.7';
var APPNAME = '百度网盘助手';
var t = new Date().getTime();

var encodeThunder = (function() {

    function base64encode(str) {
        var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var out, i, len;
        var c1, c2, c3;
        len = str.length;
        i = 0;
        out = "";
        while(i < len) {
          c1 = str.charCodeAt(i++) & 0xff;
          if(i == len) {
           out += base64EncodeChars.charAt(c1 >> 2);
           out += base64EncodeChars.charAt((c1 & 0x3) << 4);
           out += "==";
           break;
          }
          c2 = str.charCodeAt(i++);
          if(i == len) {
           out += base64EncodeChars.charAt(c1 >> 2);
           out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
           out += base64EncodeChars.charAt((c2 & 0xF) << 2);
           out += "=";
           break;
          }
          c3 = str.charCodeAt(i++);
          out += base64EncodeChars.charAt(c1 >> 2);
          out += base64EncodeChars.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
          out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6));
          out += base64EncodeChars.charAt(c3 & 0x3F);
        }
        return out;
    }

    return function (str) {
        return "thunder://"+base64encode("AA"+str+"ZZ");
    };

}());


$ = $ || unsafeWindow.$;
var disk = unsafeWindow.disk;
var FileUtils = unsafeWindow.FileUtils;
var Page = unsafeWindow.Page;
var Utilities = unsafeWindow.Utilities;
var yunData = unsafeWindow.yunData;
var require= unsafeWindow.require;

(function (){
    var isOther = location.href.indexOf('://pan.baidu.com/disk')==-1,
    downProxy = null,shareData = null,
    Canvas,Pancel,RestAPI,Toast={},errorMsg,CommonService,
    iframe = '',httpHwnd = null,index = 0,
    msg = [
        '咱能不二么,一个文件都不选你让我咋个办...', //0
        '尼玛一个文件都不选你下个毛线啊...', //1
        '你TM知道你选了<b>90</b>多个文件吗?想累死我啊...', //2
        '<b>请求已发送，数据下行中...</b>', //3
        '<b>该页面</b>不支持文件夹和多文件的<font color="red"><b>链接复制和查看</b></font>！', //4
        '<font color="red">请求超时了...</font>', //5
        '<font color="red">请求出错了...</font>', //6
        '<font color="red">返回数据无法直视...</font>', //7
        '请输入验证码', //8
        '验证码输入错误,请重新输入', //9
        '<b>链接已复制到剪切板！</b>', //10
        '未知错误，errno:',//11
        '<font color="red"><b>尼玛竟然跪了了，不要告诉我你的水表在里面...</b></font>',//12
        ''
        ],
    btnClassArr=[
        {css:'icon-download',tag:'a',id:''},
        {css:'icon-btn-download',tag:'li',id:''},
        {css:'icon-btn-download',tag:'',id:''},
        {css:'download-btn',tag:'',id:''},
        {css:'',tag:'',id:'downFileButton'}
    ];
    try{
        downProxy = isOther ? disk.util.DownloadProxy || null : null;
        shareData = isOther ? disk.util.ViewShareUtils || null : null;
    }catch(e){}
    if(!isOther || (isOther && !FileUtils)){
        RestAPI = require("common:widget/restApi/restApi.js");
        CommonService = require("common:widget/commonService/commonService.js");
        Canvas = require("common:widget/canvasPanel/canvasPanel.js");
        Pancel = require("common:widget/panel/panel.js");
        Toast = require("common:widget/toast/toast.js");
        errorMsg = require("common:widget/errorMsg/errorMsg.js");
    }
    var helperMenuBtns=(function(){
        var menuTitleArr=['迅雷下载','复制链接','查看链接'],panBtnsArr=[],html='';
        for(var i=0;i<btnClassArr.length;i++){
            var item=btnClassArr[i];
            var tmpItem=item.id!='' ? $('#'+item.id) : $('.'+item.css);
            var tmpArr=item.tag!='' ? tmpItem.parent(item.tag) : tmpItem;
            panBtnsArr=$.merge(panBtnsArr,tmpArr.toArray());
        }
        if(!panBtnsArr.length){return panBtnsArr;}
        html+='<div id="panHelperMenu" style="display:none;position:fixed;z-index:999999;">';
        html+='<ul class="pull-down-menu" style="display:block;margin:0px;padding:0px;left:0px;top:0px;list-style:none;">';
        for(var i=0;i<menuTitleArr.length;i++){
            html+='<li><a href="javascript:;" class="panHelperMenuBtn" type="'+i+'"><b>'+menuTitleArr[i]+'</b></a></li>';
        }
        html+='<li style="display:none;"><a href="' + getApiUrl('getnewversion', 1) + '" target="_blank">';
        html+='<img id="updateimg" title="有一份田" style="border:none;"/></a></li></ul></div>';
        $('<div>').html(html).appendTo(document.body);
        for (var i = 0; i < panBtnsArr.length; i++) {
            var item = panBtnsArr[i];
            createHelperBtn(item);
        }
        function createHelperBtn(btn) {
            var newnode=btn.cloneNode(true),html=newnode.innerHTML;
            $(newnode).attr('id','').attr('href','javascript:void(0)').attr('data-key','downloadhelper').attr('node-type','btn-helper').attr('onclick','').css({width:63}).html(html.replace(/[\u4E00-\u9FA5]{2,4}(\(.*\)|（.*）)?/,'网盘助手')).unbind();
            var o=$('<div class="panHelperBtn" style="display:inline-block;">').append(newnode)[0];
            btn.parentNode.insertBefore(o, btn.nextSibling);
            return o;
        }
        var helperBtn = $('.panHelperBtn'),helperMenu = $('#panHelperMenu'),
        menuFun = function() {
            helperDownload($(this).attr('type') || 0);
            helperMenu.hide();
        };
        helperBtn.click(menuFun).mouseenter(function() {
            $(this).addClass('b-img-over');
            var o=$(this).children('a'),offset=o.offset(),w=o.outerWidth()-parseInt(o.css('paddingRight'));
            helperMenu.children('ul').css('width', w-2);
            helperMenu.css('top', offset.top + o.height() + parseInt(o.css('paddingTop')) - $(document).scrollTop());
            helperMenu.css('left', offset.left).show();
        }).mouseleave(function() {
            $(this).removeClass('b-img-over');
            helperMenu.hide();
        });
        $(document).scroll(function() {
            helperMenu.hide();
        });
        helperMenu.mouseenter(function() {
            $(this).show();
        }).mouseleave(function() {
            $(this).hide();
        });
        helperMenu.find('a').css('text-align', 'center');
        return helperMenu.find('a.panHelperMenuBtn').click(menuFun).toArray();
    })();
    if(!helperMenuBtns.length){return;}
    checkUpdate();
    function helperDownload(type){
        iframe=createDownloadIframe();
        iframe.src = 'javascript:;';
        var items = getListViewCheckedItems(),len = items.length;
        if(!len) {
            index = 1 == index ? 0 : 1;
            return myToast(msg[index]);
        }else if (len > 90) {
            return myToast(msg[2]);
        }
        if(1 == len) {
            var url = items[0].dlink;
            if(isUrl(url)) {
                if(2 == type) {
                    showHelperDialog(type, items, {"errno": 0,"dlink": url});
                }else if(1 == type){
                    copyText(url);
                }else{
                    myToast(msg[3],1);
                    iframe.src = encodeThunder(url);  // 迅雷
                }
            }else{
                getDownloadInfo(type, items);
            }
        }else {
            getDownloadInfo(type, items);
        }
        downloadCounter(items);
    }
    function getDownloadInfo(type, items, vcode) {
        if(!vcode) {
            showHelperDialog(helperMenuBtns.length+1, items);
            vcode = FileUtils ? '' : {};
        }
        var url = '',data = {},fidlist = '',fids = [];
        for (var i = 0; i < items.length; i++) {
            fids.push(items[i]['fs_id']);
        }
        fidlist = '[' + fids.join(',') + ']';
        if(isOther){
            if(FileUtils){
                url = disk.api.RestAPI.SHARE_GET_DLINK + '&uk=' + FileUtils.share_uk + '&shareid=' + FileUtils.share_id + '&timestamp=' + FileUtils.share_timestamp + '&sign=' + FileUtils.share_sign + '&fid_list=' + fidlist;
                data = {
                    shareid:FileUtils.share_id,
                    uk:FileUtils.share_uk,
                    fid_list:fidlist
                };
            }else{
                var context=yunData.getContext();
                if(typeof vcode =='object'){
                    url = '/api/sharedownload?' + 'uk=' + yunData.SHARE_UK + '&shareid=' + yunData.SHARE_ID + '&timestamp=' + yunData.TIMESTAMP + '&sign=' + yunData.SIGN + '&fid_list=' + fidlist;
                    data = 'encrypt=0&product=share&primaryid=' + yunData.SHARE_ID + '&shareid=' + yunData.SHARE_ID + '&uk=' + yunData.SHARE_UK + '&fid_list=' + fidlist+ '&extra=' + '{"sekey":"' + context.sekey + '"}';
                    data = {
                        encrypt:0,
                        extra:'{"sekey":"' + context.sekey + '"}',
                        product:'share',
                        primaryid:yunData.SHARE_ID,
                        shareid:yunData.SHARE_ID,
                        uk:yunData.SHARE_UK,
                        fid_list:fidlist
                    };
                }else{
                    url = RestAPI.GET_CAPTCHA + '?prod=share';
                }
            }
            if(typeof vcode =='object'){
                data = $.extend(data,vcode);
            }
            data.type=(items.length >1 || items[0]['isdir']) ? "batch" : "dlink";
        }else{
            url = RestAPI.DOWN_GET_DLINK;
            if ("function" != typeof yunData.sign2) try {
                yunData.sign2 = new Function("return " + yunData.sign2)();
            } catch (o) {}
            data={
                sign: CommonService.base64Encode(yunData.sign2(yunData.sign3, yunData.sign1)),
                timestamp: yunData.timestamp,
                bdstoken: yunData.MYBDSTOKEN,
                fidlist: fidlist,
                type: (items.length >1 || items[0]['isdir']) ? "batch" : "dlink"
            };
        }
        httpHwnd = $.post(url, data,
            function(o) {
                var dlink = typeof o.dlink =='object' ? o.dlink[0]['dlink'] : o.dlink;
                if(-20 === o.errno){
                    getDownloadInfo(type, items, JSON.stringify(vcode) =='{}' ? 'getvcode' : 'showvcode');
                }else if (0 === o.errno) {
                    if(o.list || dlink){
                        if(!dlink){
                            var list = o.list,opt=list[0];
                            dlink=opt.dlink;
                        }
                        dlink = dlink + '&zipname=' + encodeURIComponent(getDownloadName(items));
                        o.dlink = dlink;
                        setCheckedItemsDlink(items,dlink);
                    }else{
                        if(o.vcode_img && o.vcode_str){
                            o.errno = -20;
                            if(vcode == 'getvcode'){
                                //return getDownloadInfo(type, items, getVCode('test',o.vcode_str));
                            }
                        }
                    }
                    showHelperDialog(type, items, o, vcode);
                }else{
                    showHelperDialog(type, items, o, vcode);
                }
            });
    }
    function showHelperDialog(type, items, opt, vcode) {
        var canvas =document.canvas ? document.canvas : Canvas ? new Canvas() : new disk.ui.Canvas(),
        _ = document.helperdialog || createHelperDialog(),isVisible = _.isVisible(),status=0;
        document.canvas = canvas;
        _.canvas = canvas;
        _.type = type;
        _.items = items;
        if (type < helperMenuBtns.length) {
            if (0 === opt.errno) {
                status=1;
                if(type < 2) {
                    _.canvas.setVisible(false);
                    _.setVisible(false);
                    if(0 == type){
                        iframe.src = encodeThunder(opt.dlink);
                        myToast(msg[3],1);
                    } else {
                        copyText(opt.dlink);
                    }
                    return;
                }
                _.sharefilename.innerHTML = getDownloadName(items);
                _.sharedlink.value = opt.dlink;
                _.dlink = opt.dlink;
                //_.downloadbtn.href= opt.dlink;
                _.focusobj = _.sharedlink;
            } else if(-19 ==opt.errno) {
                status=2;
                _.vcodeimg.src = opt.img;
                _.vcodeimgsrc = opt.img;
                _.vcodevalue = opt.vcode;
                _.vcodetip.innerHTML = vcode ? msg[9] : '';
                _.vcodeinput.value = '';
                _.focusobj = _.vcodeinput;
            }else if(-20 ==opt.errno) {
                status=2;
                _.vcodeimg.src = opt.vcode_img;
                _.vcodeimgsrc = opt.vcode_img;
                _.vcodevalue = opt.vcode_str;
                _.vcodetip.innerHTML = vcode && vcode!='getvcode' ? msg[9] : '';
                _.vcodeinput.value = '';
                _.focusobj = _.vcodeinput;
            } else {
                _.canvas.setVisible(false);
                _.setVisible(false);
                return myToast(errorMsg ? errorMsg.ErrorMessage[opt.errno] : disk.util.shareErrorMessage[opt.errno] || (msg[11] + opt.errno));
            }
        }
        _.loading.style.display = 0==status ? '' : 'none';
        _.showdlink.style.display = 1==status ? '' : 'none';
        _.showvcode.style.display = 2==status ? '' : 'none';
        _.showbtnbar.style.display = 1==status ? '' : 'none';
        if (!isVisible) {
            _.canvas.setVisible(true);
            _.setVisible(true);
        }
        _.setGravity(Pancel ? Pancel.CENTER : disk.ui.Panel.CENTER);
        _.focusobj.focus();
    }
    function createHelperDialog() {
        var html = '<div class="dlg-hd b-rlv"title="有一份田"><span title="关闭"id="helperdialogclose"class="dlg-cnr dlg-cnr-r"></span><h3><a href="'+getApiUrl('getnewversion',1)+'"target="_blank"style="color:#000;">'+APPNAME+'&nbsp;' + VERSION + '</a><span id="showbtnbar"style="float:right;margin-right:175px;"><a href="javascript:;"title="点此复制"id="copytext">点此复制</a>（<a href="javascript:;"title="重新获取"id="redlink">重新获取</a>）</span></h3></div><div class="download-mgr-dialog-msg center"id="helperloading"><b>数据赶来中...</b></div><div id="showvcode"style="text-align:center;display:none;"><div class="dlg-bd download-verify"style="text-align:center;margin-top:25px;"><div class="verify-body">请输入验证码：<input type="text"maxlength="4"class="input-code vcode"><img width="100"height="30"src=""alt="验证码获取中"class="img-code"><a class="underline"href="javascript:;">换一张</a></div><div class="verify-error"style="text-align:left;margin-left:84px;"></div></div><br><div><div class="alert-dialog-commands clearfix"><a href="javascript:;"class="sbtn okay postvcode"><b>确定</b></a><a href="javascript:;"class="dbtn cancel"><b>关闭</b></a></div></div></div><div id="showdlink"style="text-align:center;display:none;"><div class="dlg-bd download-verify"><div style="padding:5px 0px;"><b><span id="sharefilename"></span></b></div><input type="text"name="sharedlink"id="sharedlink"class="input-code"maxlength="1024"value=""style="width:500px;border:1px solid #7FADDC;padding:3px;height:24px;"></div><br><div><div class="alert-dialog-commands clearfix"><a href="javascript:;"class="sbtn okay postdownload"><b>直接下载</b></a><a href="javascript:;"class="dbtn cancel"><b>关闭</b></a></div></div></div>',
        o=$('<div class="b-panel download-mgr-dialog helperdialog" style="width:550px;">').html(html).appendTo(document.body);
        o[0].pane = o[0];
        var _ = Pancel ? new Pancel(o[0]) : new disk.ui.Panel(o[0]),vcodeimg = o.find('img')[0],vcodeinput = o.find('.vcode')[0],
        sharedlink = o.find('#sharedlink')[0],vcodetip = o.find('.verify-error')[0],
        showbtnbar = o.find('#showbtnbar')[0],postdownloadBtn=o.find('.postdownload')[0],
        dialogClose = function() {
            vcodeinput.value = '';
            vcodetip.innerHTML = '';
            vcodeimg.src = '';
            _.canvas.setVisible(false);
            _.setVisible(false);
            if (httpHwnd) {httpHwnd.abort();}
        },
        postvcode = function() {
            if (httpHwnd) {httpHwnd.abort();}
            var v = vcodeinput.value,len = v.length,max = msg.length - 1,i = max,
            vcode = getVCode(v,_.vcodevalue);
            i = 0 == len ? 8 : (len < 4 ? 9 : i);
            vcodetip.innerHTML = msg[i];
            if (i != max) {return vcodeinput.focus();}
            getDownloadInfo(_.type, _.items, vcode);
        },
        postdownload = function(e) {
            //if(!e){iframe.src = _.dlink;}
            iframe.src = _.dlink;
            dialogClose();
            myToast(msg[3],1);
        };
        _._mUI.pane = o[0];
        _.loading = o.find('#helperloading')[0];
        _.showvcode = o.find('#showvcode')[0];
        _.showdlink = o.find('#showdlink')[0];
        _.showbtnbar= showbtnbar;
        _.downloadbtn=postdownloadBtn;
        _.vcodeinput = vcodeinput;
        _.sharedlink = sharedlink;
        _.sharefilename = o.find('#sharefilename')[0];
        _.vcodeimg = vcodeimg;
        _.vcodetip = vcodetip;
        _.vcodeimgsrc = '';
        _.vcodevalue = '';
        _.focusobj = sharedlink;
        o.find('#copytext').click(function(){
            copyText(_.dlink);
            this.blur();
        });
        o.find('#redlink').click(function(){
            setCheckedItemsDlink(_.items);
            dialogClose();
            helperDownload(2);
        });
        $(vcodeimg).siblings('a').click(function() {
            vcodeimg.src = _.vcodeimgsrc + '&' + new Date().getTime();
            vcodeinput.focus();
        });
        vcodeinput.onkeydown = function(e) {
            if (13 == e.keyCode) {postvcode();}
        };
        o.find('.postvcode').click(postvcode);
        $(postdownloadBtn).click(postdownload);
        $('#sharedlink').focusin(function() {
            this.style.boxShadow = '0 0 3px #7FADDC';
            this.select();
        }).focusout(function() {
            this.style.boxShadow = '';
        }).mouseover(function() {
            this.select();
            this.focus();
        }).keydown(function(e) {
            if (13 == e.keyCode) {postdownload();}
        });
        $(window).bind("resize",function() {
            _.setGravity(Pancel ? Pancel.CENTER : disk.ui.Panel.CENTER);
        });
        o.find('#helperdialogclose').click(dialogClose);
        o.find('.dbtn').click(dialogClose);
        _.setVisible(false);
        document.helperdialog = _;
        return _;
    }
    function getVCode(v,k){
        return FileUtils ? {input:v,vcode:_.k} : {vcode_input:v,vcode_str:k};
    }
    function myToast(msg, type) {
        try{
            unsafeWindow.myToastInjection(msg,type,isOther);
            return;
        }catch(e){}
        try {
            var Toast = {}, obtain,Pancel = null;
            if (isOther && disk.ui) {
                obtain = disk.ui.Toast;
                Toast.obtain = {};
                Toast.obtain.useToast = Utilities.useToast;
            } else {
                Toast = require("common:widget/toast/toast.js");
                Pancel=require("common:widget/panel/panel.js");
                obtain = Toast.obtain;
            }
            var o = Toast.obtain.useToast({
                toastMode:type ? obtain.MODE_SUCCESS :obtain.MODE_FAILURE,
                msg:msg,
                sticky:false,
                position:Pancel ? Pancel.TOP : (disk.ui ? disk.ui.Panel.TOP : undefined)
            });
            try {
                $(o._mUI.pane).css({
                    "z-index":999999
                });
            } catch (e) {}
        } catch (err) {
            if (!type) {
                alert(msg);
            }
        }
    }
    function copyText(text){
        GM_setClipboard(text);
        myToast(msg[10],1);
    }
    function createDownloadIframe(){
        if(iframe){return iframe;}
        var o = $('#helperdownloadiframe');
        iframe=o.length ? o[0] : '';
        if(!iframe) {
            iframe = $('<div style="display:none;">').html('<iframe src="" id="helperdownloadiframe" name="helperdownloadiframe"></iframe>').appendTo(document.body).find('#helperdownloadiframe')[0];
        }
        $(iframe).load(function(){
            if(this.src=='javascript:;'){return;}
            myToast(msg[12],0);
        });
        return iframe;
    }
    function setCheckedItemsDlink(items,dlink){
        dlink = dlink || '';
        if (shareData) {
            var obj = JSON.parse(shareData.viewShareData);
            obj.dlink = dlink;
            shareData.viewShareData = JSON.stringify(obj);
        }
        if (1 == items.length) {
            items[0]['dlink'] = dlink;
            if(items[0]['item']){
                $(items[0]['item']).attr('dlink',dlink);
            }
            try{
                if(yunData.SHAREPAGETYPE == "single_file_page"){
                    yunData.FILEINFO = items;
                }
            }catch(e){}
        }
    }
    function getListViewCheckedItems(){
        var items=[];
        if(shareData){
            items.push(JSON.parse(shareData.viewShareData));
        }else if(isOther) {
            if(FileUtils){
                items = FileUtils.getListViewCheckedItems();
            }else if(yunData){
                if(yunData.SHAREPAGETYPE == "multi_file"){
                    items=getCheckItems();
                }else if(yunData.SHAREPAGETYPE == "single_file_page"){
                    items=yunData.FILEINFO;
                }
            }
        }else{
            items=getCheckItems();
        }
        return items;
    }
    function getCheckItems(){
        var items=[],boxCss=$('.list-selected').length ? 'module-list-view' : 'module-grid-view';
        $('div.' + boxCss).find('.item-active').each(function(i,o){
            items.push(getListViewCheckedItemInfo(o));
        });
        return items;
    }
    function getListViewCheckedItemInfo(obj){
        var o=$(obj),fs_id=o.attr('data-id'),category=o.attr('data-category'),
            isdir=o.attr('data-extname')=='dir' ? 1 : 0,
            server_filename=o.find('[node-type="name"]').attr('title'),
            dlink=o.attr('dlink') || '';
        return {'fs_id':fs_id,'category':category,'isdir':isdir,'server_filename':server_filename,'dlink':dlink,'item':obj};
    }
    function getDownloadName(items) {
        var packName=items[0]['server_filename'];
        if (items.length > 1 || 1 == items[0]['isdir']) {
            try{
                downProxy.prototype.setPackName(FileUtils.parseDirFromPath(items[0]['path']), !items[0]['isdir']);
                packName= downProxy.prototype._mPackName;
            }catch(e){
                packName='【批量下载】'+packName+'等.zip';
            }
        }
        return packName;
    }
    function downloadCounter(C) { //C:items,B:isOneFile
        if (!isOther) {return;}
        var F = FileUtils ? FileUtils.share_uk || disk.util.ViewShareUtils.uk : yunData.SHARE_UK,
        D = FileUtils ? FileUtils.share_id : yunData.SHARE_ID,
        A = [],B = (1 == C.length && 0 == C[0].isdir),
        G = shareData ? disk.util.ViewShareUtils.albumId: '';
        for (var _ in C) {
            if (C.hasOwnProperty(_)) {
                var E = {
                    fid: C[_].fs_id,
                    category: C[_].category
                };
                A.push(E);
            }
        }
        G && B && $.post(disk.api.RestAPI.PCLOUD_ALBUM_DOWNLOAD_COUNTER, {
            uk: F,
            album_id: G,
            fs_id: C[_].fs_id
        });
        !G && $.post(FileUtils ? disk.api.RestAPI.MIS_COUNTER : RestAPI.MIS_COUNTER, {
            uk: F,
            filelist: JSON.stringify(A),
            sid: D,
            ctime: FileUtils ? FileUtils.share_ctime : yunData.SHARE_TIME,
            "public": FileUtils ? FileUtils.share_public_type : yunData.SHAREPAGETYPE,
            t: (new Date).getTime(),
            _: Math.random()
        });
        !G && B && $.get(FileUtils ? disk.api.RestAPI.SHARE_COUNTER : RestAPI.SHARE_COUNTER, {
            type: 1,
            shareid: D,
            uk: F,
            sign: FileUtils ? FileUtils.share_sign : yunData.SIGN,
            timestamp: FileUtils ? FileUtils.share_timestamp : yunData.TIMESTAMP,            
            t: new Date().getTime(),
            _: Math.random()
        });
    }
})();

function isUrl(url) {
    return /^(http|https):\/\/([\w-]+(:[\w-]+)?@)?[\w-]+(\.[\w-]+)+(:[\d]+)?([#\/\?][^\s<>;"\']*)?$/.test(url);
}
function checkUpdate() {
    var js = 'var upinfo=document.getElementById("updateimg");';
    js += 'upinfo.src="' + getApiUrl('checkupdate', 1) + '";';
    js += 'upinfo.onload=function(){';
    js += 'upinfo.parentNode.parentNode.style.display="";';
    js += '}';
    loadJs(js);
}
function getApiUrl(action, type) {
    return 'http://app.duoluohua.com/update?action=' + action + '&system=script&appname=dupanlink&apppot=scriptjs&frompot=dupan&type=' + type + '&version=' + VERSION + '&t=' + t;
}
function loadJs(js) {
    var oHead = document.getElementsByTagName('HEAD')[0],
    oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.text = js;
    oHead.appendChild(oScript);
}

