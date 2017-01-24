var app = getApp();
var util = require('../../../utils/util.js');
var article = require('../../../common/js/article.js');
var config = require("../../../utils/config.js");
var pagePath = '/pages/article/topic/topic';

Page({
  data: {
    showType: 0,//0:loading;1:正常状态;2:无内容;3无网
    data: {}
  },
  onLoad: function (option) {
    var _this = this;

    //记一下页面初始化时间
    _this.beginTime = parseInt(new Date().getTime() / 1000);

    //把query参数存到全局
    _this.queryData = option;

    var id = _this.queryData.id;
    // var id = 'NEW2017011002969602';
    article.getData(config.getUrl('topic'), { id: id }, _this.queryData).then(function (data, state) {
      if (data.statusCode == 200 && data.data && data.data.ret == 0) {
        //设置一下分享信息
        _this.shareInfo = {
          title: data.data.origtitle ? data.data.origtitle : '',
          desc: '',
          path: pagePath + '?id=' + id
        }

        //正式初始化数据
        data = _this.formatContent(data.data);
        console.log(data);
        _this.setData({
          showType: 1,
          data: data
        });

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

  //分享时传入分享内容
  onShareAppMessage: function () {
    return this.shareInfo ? this.shareInfo : article.getDefaultShareInfo()
  },

  formatContent: function (data) {
    var ret = {};

    ret.title = data.origtitle;
    ret.thumbnails = data.thumbnails;

    //摘要
    if (data.intro) {
      ret.intro = data.intro;
      ret.intro_name = data.intro_name ? data.intro_name : '摘要';
    }

    //组装正文数据
    var n = data.idlist.length;
    ret.newslist = [];
    for (var i = 0; i < n; i++) {
      var item = data.idlist[i],
        section = {
          subtitle: item.section,
          list: []
        },
        m = item.ids.length;
      for (var j = 0; j < m; j++) {
        var news = item.ids[j],
          tmpData = this.formatSubNews(news.id, data);
        if (tmpData) {
          section.list.push(tmpData);
        }
      }

      if (section.list.length > 0) {
        ret.newslist.push(section);
      }
    }
    return ret;
  },

  formatSubNews: function (id, data) {
    var n = data.newslist.length, info;
    for (var i = 0; i < n; i++) {
      var item = data.newslist[i];
      if (id == item.id) {
        info = item;
        break;
      }
    }

    if(!info){
      return false;
    }

    //正式格式化一下数据
    var tmp = article.formatNews(info);
    tmp.comments = article.getCommentCount(id, data.changeInfo.comments);
    return tmp;
  },

  //相关点击上报
  itemTap: function (e) {
    var id = e.currentTarget.dataset.newsid ? e.currentTarget.dataset.newsid : '';
    article.report('page_relClick', { iReserved1: id }, this);
  },
})