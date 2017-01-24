var util = require('../../utils/util.js');
var app = getApp();
var rep = require("../../utils/report").report;
var g = app.global;
var Base = require('../../utils/base.js');
var Promise = require("../../lib/WechatAppPlayer/lib-inject").Promise;

function getData(url, opt, ext) {
  return new Promise(function (resolve, reject) {
    //分享页进来可能没有登录态,这里需要先获取一下
    if (!g.comPostInfo.openid) {
      Base.init().then(function () {
        sendReq(url, opt, ext).then(function (res) {
          resolve(res);
        }, function (e) {
          reject(e)
        })
      })
    } else {
      sendReq(url, opt, ext).then(function (res) {
        resolve(res);
      }, function (e) {
        reject(e)
      })
    }
  })
}

function sendReq(url, opt, ext) {
  var postInfo = util.extend(g.comPostInfo, opt);
  if (!postInfo.chlid && g.chlid) {
    postInfo.chlid = g.chlid;
  }

  //加入附加公用字段
  if (ext) {
    postInfo = util.extend(postInfo, {
      seq_no: ext.seq_no ? ext.seq_no : '',
      alg_version: ext.alg_version ? ext.alg_version : '',
      reasonInfo: ext.reasonInfo ? ext.reasonInfo : '',
      article_pos: ext.article_pos ? ext.article_pos : ''
    });
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      data: postInfo,
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      method: "POST",
      success: function (res) {
        resolve(res)
      },
      fail: function (e) {
        reject(e);
      }
    })
  })
}

function getCommentCount(id, comments) {
  var n = comments.length, info,
    ret = 0;
  for (var i = 0; i < n; i++) {
    var item = comments[i];
    if (id == item.id) {
      ret = item.comments;
      break;
    }
  }

  return util.transNum(ret);
}

//ignoredVideo 是否忽略视频,有些地方不要求显示视频icon
function formatNews(data, commentList, ignoredVideo) {
  var tmp = {
    picShowType: data.picShowType,
    articletype: data.articletype,
    imgs: data.thumbnails_qqnews,
    chlname: data.chlname,
    commentid: data.commentid,
    title: data.title,
    id: data.id,
    timestamp: data.timestamp ? data.timestamp : '',
    hasVideo: data.hasVideo && !ignoredVideo ? data.hasVideo : 0,
    seq_no: data.seq_no ? data.seq_no : '',
    alg_version: data.alg_version ? data.alg_version : '',
    reasonInfo: data.reasonInfo ? data.reasonInfo : '',
    article_pos: data.article_pos ? data.article_pos : ''
  };

  if (data.hasVideo) {
    if (data && data.videolist && data.videolist[0]['video']) {
      tmp.duration = data.videolist[0]['video']['duration'];
    } else if (data && data.video_channel && data.video_channel['video']) {
      tmp.duration = data.video_channel['video']['duration'];
    } else {
      tmp.duration = '';
    }
  }

  //todo 注入文章评论数
  if (commentList && commentList.length > 0) {
    tmp.comments = getCommentCount(data.id, commentList);
  }


  tmp.url = util.getUrlByAtype(data.articletype, tmp);

  return tmp;
}

function getDefaultShareInfo() {
  return {
    title: '腾讯新闻',
    desc: '实时热点全网罗',
    path: '/pages/index/index'
  }
}

function report(opType, opt, call) {
  if (!opType) {
    return;
  }

  rep({
    opType: opType ? opType : '',//操作名称（打开、离开、点击、曝光、分享、赞、取消赞、投表情、评论等）
    bucketId: opt.bucketId ? opt.bucketId : '',//桶id
    articleId: call.queryData && call.queryData.id ? call.queryData.id : '',//文章id
    openSrc: call.queryData && call.queryData.refer ? call.queryData.refer : 'open_self',//启动方式
    pageType: 'content_page',//页面类型
    itemCount: opt.itemCount ? opt.itemCount : 1,//文章数目
    des: opt.des ? opt.des : '',//对应文章内容（包括文章id、推荐理由、文章分类等信息）
    iReserved1: opt.iReserved1 ? opt.iReserved1 : '',//附加字段
    beginTime: call.beginTime ? call.beginTime : ''// 记一下开始时间
  });
}
module.exports = {
  getData,
  getCommentCount,
  formatNews,
  getDefaultShareInfo,
  report
};