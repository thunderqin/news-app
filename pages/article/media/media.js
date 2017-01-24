var app = getApp();
var util = require('../../../utils/util.js');
var article = require('../../../common/js/article.js');
var config = require("../../../utils/config.js");

Page({
  data: {
    showType: 0,//0:loading;1:正常状态;2:无内容;3无网
    articleReady: false,
    videoReady: false,
    selected: 'article',
    mediaInfo: [],
    articleList: [],
    videoList: [],
    showMoreArticle: true,
    showMoreVideo: true
  },

  histroyArticle: [],//历史文章数据数据
  histroyVideo: [],//历史视频数据
  articleScroll: 0,//文章列表页高度
  videoScroll: 0,//视频列表页高度
  playCount: [],//存一下
  headerHeigth: 0,//头部高度
  navFixed: false,//导航是否采用fixed定位,

  onLoad: function (option) {
    var _this = this;

    _this.queryData = option;

    //计算一下顶部的高度
    if (app.global.comPostInfo && app.global.comPostInfo.windowWidth) {
      _this.headerHeigth = 250 * (app.global.comPostInfo.windowWidth / 750);
    }

    _this.chlid = _this.queryData.chlid;
    // _this.chlid = '5162986';//介绍不带名片
    // _this.chlid = '5146250';//介绍带名片
    console.log(app.global.comPostInfo);

    //拉取媒体数据
    article.getData(config.getUrl('media_info'), { chlid: this.chlid }).then(function (data) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        _this.setData({
          infoReady: true,
          mediaInfo: _this.formatMediaInfo(data.data.channelInfo)
        });
      } else {
        //todo 做个容错?? 直接404吧
      }
    });

    //拉取首屏普通文章数据
    article.getData(config.getUrl('media_article'), { chlid: this.chlid }).then(function (data, state) {
      if (state == 'fail') {
        _this.setData({
          showType: 3,
        });
      } else if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        if (!data.data.ids || data.data.ids.length == 0) {
          _this.data.articleReady = true;
        } else {
          _this.histroyArticle = _this.formatArtIds(data.data.ids);
          var tmp = _this.formatArtList(data.data.newslist);
          _this.setData({
            articleReady: true,
            articleList: tmp,
            showMoreArticle: _this.histroyArticle.length > 0 ? true : false
          });
        }

        //就绪
        _this.dataReady();
      } else if (data.statusCode != 200) {
        _this.setData({
          showType: 3,
        });
      } else {
        _this.setData({
          showType: 2,
        });
      }
    });

    //拉取首屏视频文章数据
    article.getData(config.getUrl('media_video'), { chlid: this.chlid }).then(function (data) {
      if (!data.data.ids || data.data.ids.length == 0) {
        _this.data.videoReady = true;
      } else {
        _this.histroyVideo = _this.formatVideoIds(data.data.ids);
        var tmp = _this.formatVideoList(data.data.newslist, data.data.videoHits);
        _this.setData({
          videoReady: true,
          videoList: tmp,
          showMoreVideo: _this.histroyVideo.length > 0 ? true : false
        });
      }

      //就绪
      _this.dataReady();
    });
  },
  onReady: function () {
    // 页面渲染完成
  },
  onShow: function () {
    // 页面显示
  },
  onHide: function () {
    // 页面隐藏
  },
  onUnload: function () {
    // 页面关闭
  },

  //格式化媒体信息
  formatMediaInfo: function (data) {
    var ret = {
      icon: data.icon,
      chlname: data.chlname,
      desc: data.desc,
      readCount: util.transNum(data.readCount),//阅读量
      subCount: util.transNum(data.subCount),//粉丝量
      wechat: data.wechat ? data.wechat : ''
    };

    return ret;
  },

  //数据就绪调用
  dataReady: function () {
    var tmp = this.data;
    var selected = 'article';
    if (!tmp.articleReady || !tmp.videoReady) {
      return;
    }

    if (tmp.videoList.length != 0 && tmp.articleList.length == 0) {
      selected = 'video';
    }

    this.setData({
      selected: selected,
      showType: 1
    })
  },

  //格式化文章id列表
  formatArtIds: function (ids) {
    var ret = [], n = ids.length;
    for (var i = 0; i < n; i++) {
      var item = ids[i];
      ret.push({
        id: item.id,
        timestamp: item.timestamp,
        comments: item.comments
      });
    }

    return ret;
  },

  //格式化文章列表信息
  formatArtList: function (list) {
    var ret = [], n = list.length;
    for (var i = 0; i < n; i++) {
      //正式格式化一下数据
      var info = list[i];
      var tmp = article.formatNews(info, this.histroyArticle, true);
      tmp.comments = article.getCommentCount(tmp.id, this.histroyArticle);

      ret.push(tmp);

      this.deleteFromList(tmp.id);
    }

    return ret;

  },

  //从ids中删除这一条,避免下次拉旧时取到
  deleteFromList: function (id, type) {
    var ret = [], n = this.histroyArticle.length;
    for (var i = 0; i < n; i++) {
      if (id == this.histroyArticle[i]['id']) {
        this.histroyArticle.splice(i, 1);
        break;
      }
    }
  },

  //格式化视频id列表
  formatVideoIds: function (ids) {
    var ret = [], n = ids.length;
    for (var i = 0; i < n; i++) {
      var tmp = ids[i];
      ret.push({
        id: tmp.id,
        timestamp: tmp.timestamp,
        comments: 0,//视频的暂时没有这个数据
      });

      this.deleteFromVideoList(tmp.id);
    }

    return ret;
  },

  //格式化视频列表信息
  formatVideoList: function (list, playList) {
    var ret = [], n = list.length;
    for (var i = 0; i < n; i++) {
      //正式格式化一下数据
      var info = list[i];
      var tmp = article.formatNews(info, this.histroyVideo);
      tmp.comments = article.getCommentCount(tmp.id, this.histroyVideo);
      tmp.vid = info.video_channel && info.video_channel.video ? info.video_channel.video.vid : '';
      //从额外信息里面取一下playcount
      tmp.playcount = this.getPlayCount(tmp.vid, playList);

      ret.push(tmp);

      this.deleteFromVideoList(tmp.id);
    }

    return ret;

  },

  //从ids中删除这一条,避免下次拉旧时取到
  deleteFromVideoList: function (id) {
    var ret = [], n = this.histroyVideo.length;
    for (var i = 0; i < n; i++) {
      if (id == this.histroyVideo[i]['id']) {
        this.histroyVideo.splice(i, 1);
        break;
      }
    }
  },

  //获取一下视频的播放数
  getPlayCount: function (vid, list) {
    var ret = 0, n = list.length;
    for (var i = 0; i < n; i++) {
      var item = list[i];
      if (item.vid == vid) {
        if (vid == 'k0361nt8jro') {
          console.log(111);
        }
        ret = util.transNum(item.playcount);
        break;
      }
    }

    return ret;
  },

  //导航点击
  navTap: function (e) {
    var id = e.currentTarget.id;
    var selected;
    if (id == 'nav-video') {
      selected = 'video';
    } else if (id == 'nav-des') {
      selected = 'des';
    } else {
      selected = 'article';
    }

    this.setData({ selected: selected });
  },

  //绑定滚动事件
  _onScroll: function (e) {
    if (this.headerHeigth == 0) {
      return;
    }

    var top = e.detail.scrollTop;
    if (top > this.headerHeigth && this.navFixed == false) {
      // this.setData({navFixed:true});
      this.navFixed = true;
      wx.setNavigationBarTitle({
        title: this.data.mediaInfo.chlname
      })
    } else if (top <= this.headerHeigth && this.navFixed == true) {
      // this.setData({navFixed:false});
      this.navFixed = false;
      wx.setNavigationBarTitle({
        title: ''
      })
    }
  },

  //拉旧事件监听
  _onScrollToBottom: function (e) {
    if (this.data.selected == 'article') {
      if (this.histroyArticle.length > 0) {
        this.loadHistroyArticle(20);
      }
    } else if (this.data.selected == 'video') {
      if (this.histroyVideo.length > 0) {
        this.loadHistroyVideo(20);
      }
    }
  },

  //拉取历史文章数据
  loadHistroyArticle: function (count) {
    var _this = this;
    if (this.onArtLoading) {
      return;
    }
    this.onArtLoading = true;

    var list = this.getTop(this.histroyArticle, 20);
    article.getData(config.getUrl('media_next'), { chlid: this.chlid, ids: list.join(',') }).then(function (data) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        var tmp = _this.formatArtList(data.data.newslist);
        _this.setData({
          articleReady: true,
          articleList: _this.data.articleList.concat(tmp),
          showMoreArticle: _this.histroyArticle.length > 0 ? true : false
        });
      } else {
        //todo 做个容错??
      }
      _this.onArtLoading = false;
    })
  },

  loadHistroyVideo: function (count) {
    var _this = this;
    if (this.onVideoLoading) {
      return;
    }
    this.onVideoLoading = true;

    var list = this.getTop(this.histroyVideo, 20);

    //拉取历史视频文章数据
    article.getData(config.getUrl('media_next'), { chlid: this.chlid, ids: list.join(','), is_video: 1 }).then(function (data) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        var tmp = _this.formatVideoList(data.data.newslist, data.data.videoHits);
        _this.setData({
          videoReady: true,
          videoList: _this.data.videoList.concat(tmp),
          showMoreVideo: _this.histroyVideo.length > 0 ? true : false
        });
      }
      _this.onVideoLoading = false;
    });
  },

  //获取头N个文章id
  getTop: function (list, n) {
    if (n <= 0) {
      return [];
    }
    var len = list.length,
      ret = [];
    for (var i = 0; i < len; i++) {
      ret.push(list[i]['id']);
      if (i + 1 >= n) {
        break;
      }
    }

    return ret;
  }
})