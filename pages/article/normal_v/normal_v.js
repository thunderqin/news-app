var app = getApp();
var util = require('../../../utils/util.js');
var article = require('../../../common/js/article.js');
var comment = require('../../../common/js/comment.js');
var Txv = require("../../../lib/WechatAppPlayer/index.js");
var config = require("../../../utils/config.js");
var pagePath = '/pages/article/normal_v/normal_v';

Page({
  data: {
    showType: 0,//0:loading;1:正常状态;2:无内容;3无网
    videoInfo: {},
    videoList: {},
    network: util.getNetwork(),
    showListType: 1,//列表的状态,默认先显示
  },
  onLoad: function (option) {
    var _this = this;

    //记一下页面初始化时间
    _this.beginTime = parseInt(new Date().getTime() / 1000);

    //把query参数存到全局
    _this.queryData = option;

    _this.id = _this.queryData.id;
    // _this.id = '20161221V01EBS00';
    article.getData(config.getUrl('article'), { id: _this.id }, _this.queryData).then(function (data, state) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {

        //分享进来的页面可能会命中错误的模板, 如果发现模板错误,则做一次重定向
        var url = util.getUrlByAtype(data.data.articletype, { id: _this.id });
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
        console.log(data);

        _this.setData({
          showType: 1,
          videoInfo: data[0],
          videoList: data.splice(1, data.length - 1),
          network: util.getNetwork()
        });

        // _this.initVideo(data[0]['vid']);
        if (util.getNetwork() == 'wifi') {
          _this.creatVideo(data[0]['vid']);
        }

        //加载评论
        comment.initComment({
          id: _this.id,
          media_id: '',
          type: 'normal_v'
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
    this.video && this.video.stop();
  },

  _onScrollToBottom: function () {
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

  formatContent: function (data) {
    var list = data.kankaninfo ? data.kankaninfo.recVideos : [],
      newsList = data.newslist ? data.newslist : [],
      n = list.length,
      ret = [];
    for (var i = 0; i < n; i++) {
      var item = list[i];
      var newsInfo = this.getNewsInfo(item.id, data.newslist);
      if (newsInfo == false) {
        continue;
      }

      var tmp = {
        title: item.title,
        playcount: util.transNum(item.playcount),
        vid: item.id,
        id: newsInfo.id,
        img: item.imageurl,
        timeDesc: item.timeDesc,
        src: newsInfo.chlname ? newsInfo.chlname : newsInfo.source,
        tags: item.tags ? this.getTags(item.tags) : [],
        commentid: newsInfo.commentid,
        seq_no: newsInfo.seq_no ? newsInfo.seq_no : '',
        alg_version: newsInfo.alg_version ? newsInfo.alg_version : '',
        comments: 0,//假的
        chlname: '',//假的
        timestamp: ''//假的
      };

      if (parseInt(newsInfo.chlid) > 0 && newsInfo.chlname && newsInfo.chlicon && newsInfo.chlmrk) {
        tmp.card = {
          chlid: newsInfo.chlid,
          chlname: newsInfo.chlname,
          icon: newsInfo.chlicon,
          desc: newsInfo.chlmrk
        }
      }

      tmp.url = util.getUrlByAtype(newsInfo.articletype, tmp);

      ret.push(tmp);
    }

    return ret;
  },

  //获取对应的文章信息
  getNewsInfo: function (id, newsList) {
    var n = newsList.length;
    for (var i = 0; i < n; i++) {
      var item = newsList[i],
        tmpId = item.video_channel && item.video_channel.video ? item.video_channel.video.vid : '';
      if (tmpId == id) {
        return item;
      }
    }

    return false;
  },

  //获取视频的tag信息
  getTags: function (tags) {
    var n = tags.length, ret = [];
    for (var i = 0; i < n; i++) {
      var item = tags[i];
      ret.push(item.name);
    }

    return ret;
  },

  itemTap: function (e) {
    var id = e.currentTarget.id,
      data = this.data.videoList,
      n = data.length,
      tar;
    for (var i = 0; i < n; i++) {
      var item = data[i];
      if (item.vid == id) {
        tar = item;
      }
    }

    if (!tar) {
      return;
    }

    this.id = tar.id;

    this.setData({
      videoInfo: tar,
      videoList: [],
      showListType: 0,
      network: util.getNetwork(),
      commentState: 1,//1. 无评论, 2.禁止评论
      comment_selected: [],
      comment_hot: [],
      comment_new: [],
      comment_count: 0,
      lastReplyId: false
    });

    // this.initVideo(tar['vid']);

    this.loadNewList();

    //上报一下相关点击
    article.report('page_relClick', { iReserved1: tar.id }, this);

    //为了上报, querydata里面的id也重写一下吧
    this.queryData.id = tar.id;
    this.queryData.seq_no = tar.seq_no ? tar.seq_no : '';
    this.queryData.alg_version = tar.alg_version ? tar.alg_version : '';
  },

  creatVideo: function (vid) {
    var rmd = [];
    rmd.push('channel_id=' + (app.global.chlid ? app.global.chlid : ''));
    rmd.push('seq_no=' + (this.queryData.seq_no ? this.queryData.seq_no : ''));
    rmd.push('alg_version=' + (this.queryData.alg_version ? this.queryData.alg_version : ''));
    rmd.push('curpage =KBVideoDetailsViewController');

    this.videoContext = wx.createVideoContext(vid);

    this.video && this.video.stop();
    this.video = Txv(vid, {
      from: 'v4139',
      getReportParam: function (cb) {
        cb(null, {
          hc_openid: app.global.comPostInfo.openid,
          rmd: encodeURIComponent(rmd.join('&'))
        })
      }
    });

    this.video.on('contentchange', content => {
      // 视频播放内容变更
      console.log('contentchange', content);
      if (content.currentContent) {
        this.data.videoInfo.src = content.currentContent.url;
        this.data.videoInfo.is_ad = content.currentContent.isad;
        this.data.videoInfo.loading = 'ok';
        this.data.videoInfo.playing = true;

        this.setData({
          videoInfo: this.data.videoInfo
        });
      }
    });
  },

  // 小程序video元素事件
  __onTvpPlay: function () {
    this.video && this.video.onContentPlay()
  },
  __onTvpPause: function () {
    this.video && this.video.onContentPause();
    this.pauseVideo();
  },
  __onTvpEnded: function () {
    this.video && this.video.onContentEnd();
  },
  __onTvpTimeupdate: function () {
    this.video && this.video.onContentTimeupdate()
  },
  __onTvpError: function () {
    // this.video && this.video.onContentError()
  },

  pauseVideo: function () {
    this.data.videoInfo.playing = false;
    this.setData({ videoInfo: this.data.videoInfo });
  },

  //播放按钮点击监听
  playBtnTap: function (e) {
    var vid = e.target.dataset.vid;
    if (vid) {
      if (this.videoContext) {
        this.videoContext.play();
        this.data.videoInfo.playing = true;
      } else {
        this.data.videoInfo.loading = 'loading';
        this.creatVideo(vid);
      }

      this.setData({
        videoInfo: this.data.videoInfo
      });
    }
  },

  loadNewList: function () {
    var _this = this;
    article.getData(config.getUrl('article'), { id: _this.id }, _this.queryData).then(function (data) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        //设置一下分享信息
        _this.shareInfo = {
          title: data.data.title ? data.data.title : '',
          desc: data.data.listItem.abstract ? data.data.listItem.abstract : '',
          path: util.getUrlByAtype(data.data.articletype, { id: _this.id })
        }

        data = _this.formatContent(data.data);

        _this.setData({
          showListType: 1,
          videoList: data.splice(1, data.length - 1),
        });

        _this.creatVideo(data[0]['vid']);

        //加载评论
        comment.initComment({
          id: _this.id,
          media_id: '',
          type: 'normal_v'
        }, _this);
      } else {
        //todo 做个容错??
      }
    });
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
})