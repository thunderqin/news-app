var app = getApp();
var util = require('../../../utils/util.js');
var article = require('../../../common/js/article.js');
var Txv = require("../../../lib/WechatAppPlayer/index.js");
var config = require("../../../utils/config.js");
var pagePath = '/pages/article/topic_v/topic_v';

Page({
  data: {
    showType: 0,//0:loading;1:正常状态;2:无内容;3无网
    videoInfo: {},
    videoList: {},
    network: util.getNetwork()
  },
  onLoad: function (option) {
    // console.log(app.global.systemInfo);
    var _this = this;

    //记一下页面初始化时间
    _this.beginTime = parseInt(new Date().getTime() / 1000);

    //把query参数存到全局
    _this.queryData = option;

    var id = _this.queryData.id;
    // var id = 'NEW2016122603338303';
    article.getData(config.getUrl('topic_v'), { id: id }, _this.queryData).then(function (data, state) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        //设置一下分享信息
        _this.shareInfo = {
          title: data.data.newslist[0].title ? data.data.newslist[0].title : '',
          desc: data.data.newslist[0].abstract ? data.data.newslist[0].abstract : '',
          path: pagePath + '?id=' + id
        }

        //正式初始化数据
        data = _this.formatContent(data.data);
        console.log(data);

        _this.setData({
          showType: 1,
          videoInfo: data[0],
          videoList: data,
          network: util.getNetwork()
        });

        if (util.getNetwork() == 'wifi') {
          _this.creatVideo(data[0]['vid']);
        }

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
        tags: item.tags ? this.getTags(item.tags) : []
      };

      if (parseInt(newsInfo.chlid) > 0 && newsInfo.chlname && newsInfo.chlsicon && newsInfo.chlmrk) {
        tmp.card = {
          chlid: newsInfo.chlid,
          chlname: newsInfo.chlname,
          icon: newsInfo.chlsicon,
          desc: newsInfo.chlmrk
        }
      }

      //如果是第一个,加一下默认选中
      if (i == 0) {
        tmp.selected = ' selected';
      } else {
        tmp.selected = '';
      }

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
        data[i]['selected'] = ' selected';
        tar = item;
      } else {
        data[i]['selected'] = '';
      }
    }

    this.setData({
      videoInfo: tar,
      videoList: data,
      network: util.getNetwork()
    });

    this.creatVideo(tar['vid']);

    //上报一下相关点击
    article.report('page_relClick', { iReserved1: tar.id }, this);
  },

  creatVideo: function (vid) {
    var rmd = [];
    rmd.push('channel_id=' + (app.global.chlid ? app.global.chlid : ''));
    rmd.push('seq_no=' + (this.queryData.seq_no ? this.queryData.seq_no : ''));
    rmd.push('alg_version=' + (this.queryData.alg_version ? this.queryData.alg_version : ''));
    rmd.push('curpage=KBAlbumDetailViewController');

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
    this.playNext();
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

  //播放下一个
  playNext: function () {
    var cur = this.data.videoInfo.vid,
      list = this.data.videoList,
      n = list.length, next = false;

    //不用遍历到最后一个了
    for (var i = 0; i < n - 1; i++) {
      if (list[i].vid == cur) {
        next = list[i + 1];
      }

      list[i]['selected'] = '';
    }

    if (!next) {
      return;
    }

    next.selected = ' selected';

    this.setData({
      videoInfo: next,
      videoList: list,
      network: util.getNetwork()
    });

    this.creatVideo(next.vid);
  }
})