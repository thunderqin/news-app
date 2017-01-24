var app = getApp();
var util = require('../../../utils/util.js');
var article = require('../../../common/js/article.js');
var comment = require('../../../common/js/comment.js');
var Txv = require("../../../lib/WechatAppPlayer/index.js");
var config = require("../../../utils/config.js");
var pagePath = '/pages/article/normal/normal';

Page({
    data: {
        showType: 0,//0:loading;1:正常状态;2:无内容;3无网
        data: {},
        videos: {},
        imglist: {},
        network: '',
        relateNew: []
    },

    //播放器对象
    videoContext: {},
    videos: {},

    onLoad: function (option) {
        var _this = this;

        //记一下页面初始化时间
        _this.beginTime = parseInt(new Date().getTime() / 1000);

        //判断一下当前网络
        wx.getNetworkType({
            success: function (res) {
                _this.setData({
                    network: res.networkType
                })
            }
        })

        //把query参数存到全局
        _this.queryData = option;

        var id = _this.queryData.id;
        // id = option.query.id;
        // id = '20160731V02LNB00';//带媒体名片
        // id = 'NEW2016122201291800';//带摘要,图注
        // id = '20161220A07A5500';//gif图
        // id = 'NEW2016122302784400';//相关无图和单图
        // id = '20170111A07UNE00';//相关组图和单图
        // id = '20161121A03GQ300';//多视频
        // _this.queryData.id = '20170102A01YDB00';
        article.getData(config.getUrl('article'), { id: id }, _this.queryData).then(function (data, state) {
            if (data.statusCode == 200 && data.data && data.data.ret == 0) {

                //分享进来的页面可能会命中错误的模板, 如果发现模板错误,则做一次重定向
                var url = util.getUrlByAtype(data.data.articletype, { id: id });
                if (url && url.indexOf(pagePath) != 0) {
                    wx.redirectTo({
                        url: url
                    })
                    return;
                }

                //设置一下分享信息
                _this.shareInfo = {
                    title: data.data.title ? data.data.title : '',
                    desc: data.data.listItem.abstract ? data.data.listItem.abstract : '',
                    path: url ? url : ''
                }

                //正式初始化数据
                data = _this.formatContent(data.data);
                // _this.initVideo();
                _this.setData({
                    showType: 1,
                    data: data,
                    videos: _this.data.videos,
                    imglist: _this.data.imglist
                });

                //获取相关文章
                article.getData(config.getUrl('relateNews'), {
                    id: id,
                    chlid: _this.queryData.from ? 'relate_news' : _this.queryData.chlid
                }, _this.queryData).then(_this.renderRelateNews);

                //加载评论
                comment.initComment({
                    id: id,
                    media_id: data.card ? data.card.chlid : '',
                    type: 'normal'
                }, _this);

                //上报一下页面打开
                article.report('page_pageView', {}, _this);
            } else if (data.statusCode != 200) {
                _this.setData({
                    showType: 3,
                });
            } else {
                _this.setData({
                    showType: 2,
                });
            }
        }, function () {
            _this.setData({
                showType: 3,
            });
        });

    },

    onUnload: function () {
        if (this.data.videos && this.data.videos.length > 0) {
            for (var i = 0; i < this.data.videos.length; i++) {
                this.data.videos[i].stop();
            }
        }
    },

    onShow: function () {
        console.log('show');
    },
    onHide: function () {
        // 页面隐藏
        article.report('page_hide', {}, this);
    },
    onUnload: function () {
        // 页面关闭
        article.report('page_unload', {}, this);
    },
    onReachBottom: function () {
        if (this.data.lastReplyId == false || this.data.commentState) {
            return;
        }
        comment.loadMoreComment({
            id: this.queryData.id,
            media_id: this.data.card ? this.data.card.chlid : '',
            type: 'normal'
        }, this);

    },

    //分享时传入分享内容
    onShareAppMessage: function () {
        return this.shareInfo ? this.shareInfo : article.getDefaultShareInfo()
    },

    //格式化数据
    formatContent: function (data) {
        var ret = {};

        ret.title = data.title;

        //媒体信息
        if (data.card) {
            ret.card = data.card;
        } else if (data.listItem && data.listItem.card) {
            ret.card = data.listItem.card;
        }

        var timestamp = parseInt(data.listItem.timestamp) * 1000;
        ret.comments = util.transNum(this.queryData.comments);
        ret.timestamp = util.formatTimeExt(timestamp, 'yyyy-MM-dd');
        ret.chlname = data.listItem.source;

        //摘要
        if (data.intro) {
            ret.intro = data.intro;
            ret.intro_name = data.intro_name ? data.intro_name : '摘要';
        }

        if (data.remark) {
            ret.remark = data.remark;
            ret.remark_name = data.remark_name ? data.remark_name : '结语';
        }

        //正文
        ret.content = [];
        var n = data.orig_content.length,
            count = 0;
        for (var i = 0; i < n; i++) {
            var tmp = data.orig_content[i],
                item = {};

            item.type = tmp.type;
            if (tmp.type == "cnt_article") {
                item.desc = tmp.desc;
                if (item.desc) {
                    item.desc = item.desc.replace(/(<strong)>|(<\/strong>)/g, "");
                }
            } else if (tmp.type == "img_url") {
                //设置图片url
                item.itype = tmp.itype;
                if (tmp.img && tmp.img.islong == 1 && tmp.img.imgurl0) {
                    item.img_url = tmp.img.imgurl0.imgurl;
                } else if (tmp.img && tmp.img.imgurl641) {
                    item.img_url = tmp.img.imgurl641.imgurl;
                } else {
                    item.img_url = tmp.img_url;
                }

                //设置原图url
                item.img_url_wifi = tmp.img_url_wifi;

                //设置为当前图片的第几张
                item.imgpos = ++count;
                item.id = 'img_' + item.imgpos;

                //把原图信息单独存起来
                this.data.imglist[item.id] = {
                    url: item.img_url_wifi
                }

                //如果是gifgif, 处理一下相关数据
                if (tmp.itype == 1 && tmp.img && tmp.img.imgurlgif) {
                    item.img_url_gif = tmp.img.imgurlgif.imgurl;
                    item.size = parseInt(tmp.img.imgurlgif.length / 1024) >= 1 ? (tmp.img.imgurlgif.length / 1024).toFixed(1) + 'M' : tmp.img.imgurlgif.length + 'K';

                    //相关数据塞到对应字段里面去
                    this.data.imglist[item.id] = {
                        url: item.img_url_gif,
                        clicked: false,
                        loading: false
                    }
                }

                //设置图片显示高度
                var h = 690 * parseInt(tmp.img_url_height) / parseInt(tmp.img_url_width);
                // item.img_show_height = h > 690 ? 690 : h;
                item.img_show_height = h;

                //设置图注
                item.desc = tmp.desc;
            } else if (tmp.type == "video") {
                item.vid = tmp.vid;
                item.img = tmp.img;
                item.desc = tmp.desc;

                //单独存一下视频信息, 为了之后播放控制用
                this.data.videos[item.vid] = {
                    src: '',
                    is_ad: true,
                    clicked: false,
                    play_state: 'stop'
                };
            }
            ret.content.push(item);
        }
        ret.img_count = count;

        console.log(ret);

        //结语 todo

        return ret;
    },

    creatVideo: function (vid) {
        var rmd = [];
        rmd.push('channel_id=' + (app.global.chlid ? app.global.chlid : ''));
        rmd.push('seq_no=' + (this.queryData.seq_no ? this.queryData.seq_no : ''));
        rmd.push('alg_version=' + (this.queryData.alg_version ? this.queryData.alg_version : ''));
        rmd.push('curpage =videodetailPage');

        var _this = this;
        _this.videoContext[vid] = wx.createVideoContext(vid);
        // this.data.videos[vid]['video'] && this.data.videos[vid]['video'].stop();
        this.videos[vid] = Txv(vid, {
            from: 'v4139',
            getReportParam: function (cb) {
                cb(null, {
                    hc_openid: app.global.comPostInfo.openid,
                    rmd: encodeURIComponent(rmd.join('&'))
                })
            }
        });

        this.videos[vid].on('contentchange', content => {
            // 视频播放内容变更
            console.log('contentchange', content);
            console.log(vid);
            _this.data.videos[vid]['src'] = content.currentContent.url;
            _this.data.videos[vid]['is_ad'] = content.currentContent.isad;
            _this.data.videos[vid]['loading'] = 'ok';
            _this.data.videos[vid]['playing'] = true;

            this.setData({
                videos: _this.data.videos
            });
        });
    },

    // 小程序video元素事件
    __onTvpPlay: function (e) {
        var vid = e.currentTarget.id;
        this.videos[vid] && this.videos[vid].onContentPlay()
    },
    __onTvpPause: function (e) {
        var vid = e.currentTarget.id;
        this.videos[vid] && this.videos[vid].onContentPause();
        //暂停一下视频
        this.pauseVideo(vid);
    },
    __onTvpEnded: function (e) {
        var vid = e.currentTarget.id;
        this.videos[vid] && this.videos[vid].onContentEnd()
    },
    __onTvpTimeupdate: function (e) {
        var vid = e.currentTarget.id;
        this.videos[vid] && this.videos[vid].onContentTimeupdate()
    },
    __onTvpError: function (e) {
        // this.videos[vid] && this.videos[vid].onContentError()
    },

    pauseVideo: function (vid) {
        this.data.videos[vid]['playing'] = false;
        this.setData({ videos: this.data.videos });
    },

    pauseVideoWithOut: function (withOutVid) {
        for (var key in this.data.videos) {
            if (key != withOutVid && this.videoContext[key]) {
                this.videoContext[key].pause();
                this.data.videos[key]['playing'] = false;
            }
        }

        this.setData({ videos: this.data.videos });
    },

    //播放按钮点击监听
    playBtnTap: function (e) {
        var vid = e.target.dataset.vid;
        if (vid) {
            if (this.videoContext[vid]) {
                this.videoContext[vid].play();
                this.data.videos[vid]['playing'] = true;
            } else {
                this.data.videos[vid]['loading'] = 'loading';
                this.creatVideo(vid);
            }

            this.pauseVideoWithOut(vid);

            this.setData({
                videos: this.data.videos
            });

            // this.data.videos[vid]['clicked'] = true;

            // this.setData({
            //     videos: this.data.videos
            // });
        }
    },

    //gif点击监听
    gifClick: function (e) {
        var id = e.currentTarget.id;
        this.data.imglist[id]['clicked'] = true;
        if (!this.data.imglist[id]['loading']) {
            this.data.imglist[id]['loading'] = true;
        }

        this.setData({
            imglist: this.data.imglist
        });
    },

    //gifloadload
    gifLoad: function (e) {
        var id = e.currentTarget.id;
        this.data.imglist[id]['loading'] = false;

        this.setData({
            imglist: this.data.imglist
        });
    },

    //图片预览
    imgTap: function (e) {
        var id = e.currentTarget.id;
        var cur = this.data.imglist[id]['url'],
            list = [];

        //获取一下所有的图片
        for (var key in this.data.imglist) {
            list.push(this.data.imglist[key]['url']);
        }

        wx.previewImage({
            current: cur, // 当前显示图片的http链接
            urls: list // 需要预览的图片http链接列表
        })
    },

    //渲染相关新闻
    renderRelateNews: function (data) {
        if (data.statusCode == 200 && data.data && data.data.ret == 0) {
            data = this.formatSubNews(data.data);

            this.setData({ relateNew: data });
        }
    },

    //格式化相关数据,其中picshowtype对应如下
    // 标题+小图 0 
    // 只有文字标题 1 
    // 标题+组图 2 
    // 标题+大图 3 
    // 标题+视频 4 
    formatSubNews: function (data) {
        var ret = [],
            n = data.relateNewslist.length;
        for (var i = 0; i < n; i++) {
            var item = data.relateNewslist[i],
                tmp = article.formatNews(item, data.changeInfo.subIdComments);



            ret.push(tmp);
        }

        console.log(ret);

        return ret;
    },

    commentImgTap: function (e) {
        var tar = e.currentTarget,
            url = tar.dataset.url;
        if (url) {
            wx.previewImage({
                current: url, // 当前显示图片的http链接
                urls: [url] // 需要预览的图片http链接列表
            })
        }
    },

    //相关点击上报
    relTap: function (e) {
        var id = e.currentTarget.dataset.newsid ? e.currentTarget.dataset.newsid : '';
        article.report('page_relClick', { iReserved1: id }, this);
    },

    //媒体点击上报
    mediaTap: function (e) {
        var chlid = e.currentTarget.dataset.chlid ? e.currentTarget.dataset.chlid : '';
        article.report('page_mediaClick', { iReserved1: chlid }, this);
    }
})