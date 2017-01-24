var util = require('../../utils/util.js');
var article = require('article.js');
var config = require("../../utils/config.js");
var app = getApp();
var g = app.global;
function initComment(opt, call) {
  var data = getComment(opt, call);
}

//获取首页评论
function getComment(opt, call) {
  article.getData(config.getUrl('comment'), { article_id: opt.id }).then(function (data) {
    var comments = data.data && data.data.comments ? data.data.comments : false;
    if (data.statusCode == 200 && data.data && data.data.ret == 0 && comments && comments.new.length > 0) {
      var tmp = {
        selected: [],
        hot: [],
        new: [],
        count: 0
      }

      for (var key in tmp) {
        if (comments[key] && comments[key].length > 0) {
          tmp[key] = formatComment(comments[key], opt);
        }
      }

      tmp.count = comments.count;

      //获取一下lastlast replyid
      var lastReplyId = false;
      if (data.data.bnext && comments.new.length > 0) {
        var last = comments.new[comments.new.length - 1];
        if (last.length == 1) {
          lastReplyId = last[0]['reply_id'];
        } else if (last.length == 2) {
          lastReplyId = last[1]['reply_id'];
        }
      }

      call.setData({
        commentState: 0,//1. 无评论, 2.禁止评论
        comment_selected: tmp.selected,
        comment_hot: tmp.hot,
        comment_new: tmp.new,
        comment_count: util.transNum(tmp.count),
        lastReplyId: lastReplyId
      });
    } else if(data.data.ret == -1){
      call.setData({
        commentState: 2
      });
    } else{
      call.setData({
        commentState: 1
      });
    }
  });
}

function loadMoreComment(opt, call) {
  if (call.onCommentLoading) {
    return;
  }
  call.onCommentLoading = true;
  call.setData({
    reachBottom: true
  });

  article.getData(config.getUrl('comment'), { article_id: opt.id, reply_id: call.data.lastReplyId }).then(function (data) {
    if (data.statusCode == 200 && data.data && data.data.ret == 0) {
      var comments = data.data.comments;
      var more = [];
      if (comments['new'] && comments['new'].length > 0) {
        more = formatComment(comments['new']);
      }

      //获取一下lastlast replyid
      var lastReplyId = false;
      if (call.data.comment_new.length >= 80) {
        lastReplyId = false;
      } else if (data.data.bnext && comments.new.length > 0) {
        var last = comments.new[comments.new.length - 1];
        if (last.length == 1) {
          lastReplyId = last[0]['reply_id'];
        } else if (last.length == 2) {
          lastReplyId = last[1]['reply_id'];
        }
      }

      call.setData({
        comment_new: call.data.comment_new.concat(more),
        lastReplyId: lastReplyId,
        reachBottom: false
      });
    } else {
      //todo 无数据容错是不是要做一下
    }
    call.onCommentLoading = false;
  });
}

function formatComment(data, opt) {
  var ret = [],
    n = data.length;
  for (var i = 0; i < n; i++) {
    var item = data[i],
      tmp = {};

    //格式化一下时间
    if (item[0] && item[0]["pub_time"]) item[0]["pub_time_text"] = util.formatTimeText(item[0]["pub_time"]);
    if (item[1] && item[1]["pub_time"]) item[1]["pub_time_text"] = util.formatTimeText(item[1]["pub_time"]);

    if (item.length == 1) {

      tmp.sender = item[0];
    } else {
      tmp.sender = item[1];
      tmp.parent = item[0];
      //记一下是不是媒体回复
      if (item[1] && item[1]["mediaid"] && item[1]["mediaid"] == opt.media_id) {
        tmp.sender.media_reply = 1;
      }
    }

    ret.push(tmp);
  }

  return ret;
}

module.exports = {
  initComment,
  loadMoreComment
};