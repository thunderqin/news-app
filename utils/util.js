
var conf = require("./config");
var app = getApp();
var g = app.global;
var Promise = require("../lib/WechatAppPlayer/lib-inject").Promise;


function formatTime(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()

  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()


  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
// 例子： 
// (new Date()).Format(timestamp, "yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
// (new Date()).Format(timestamp, "yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
function formatTimeExt(timestamp, fmt) {
  var date = timestamp ? new Date(timestamp) : new Date();
  var o = {
    "M+": date.getMonth() + 1, //月份 
    "d+": date.getDate(), //日 
    "h+": date.getHours(), //小时 
    "m+": date.getMinutes(), //分 
    "s+": date.getSeconds(), //秒 
    "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
    "S": date.getMilliseconds() //毫秒 
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

//生成相对时间字符串
function formatTimeText(timestamp) {
  var dateNow = parseInt(new Date().getTime() / 1000);
  var num = dateNow - timestamp;
  var re;
  switch (true) {
    case num < 60:
      re = "刚刚";
      break;
    case num / 60 < 60:
      re = parseInt(num / 60) + '分钟前';
      break;
    case num / 3600 < 24:
      re = parseInt(num / 3600) + '小时前';
      break;
    default:
      re = parseInt(num / 86400) + '天前';
      break;
  }
  return re;
}

function transNum(num) {
  var re = 0;
  num = parseInt(num);
  switch (num >= 0) {
    case parseInt(num) === 0:
      re = 0;
      break;
    case num < 10000:
      re = num;
      break;
    case num < 100000000:
      re = (num % 1000 <= 999) ? (parseInt(num / 10000) + "万") : (parseFloat(num / 10000).toFixed(1) + "万");
      break;
    default:
      re = (num % 10000000 <= 9999999) ? (parseInt(num / 100000000) + "亿") : (parseFloat(num / 100000000).toFixed(1) + "亿");
      break;
  }
  return re;
}

// obj转url参数  比如 {a:1,b:2} => &a=1&b=2
function urlEncode(param, key, encode) {
  if (param == null) return '';
  var paramStr = '';
  var t = typeof (param);
  if (t == 'string' || t == 'number' || t == 'boolean') {
    paramStr += '&' + key + '=' + ((encode == null || encode) ? encodeURIComponent(param) : param);
  } else {
    for (var i in param) {
      var k = key == null ? i : key + (param instanceof Array ? '[' + i + ']' : '.' + i);
      paramStr += urlEncode(param[i], k, encode);
    }
  }
  return paramStr;
};

// 解决异步回调噩梦 使用方法 
// fetch = new getApp().fetch
// fetch(url,para).then(function(d){})

function fetch(api, para, myPara = {}) {
  var url = para ? api + urlEncode(para) : api;

  var postInfo = extend(g.comPostInfo, myPara);


  delete postInfo.chlid

  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      data: postInfo,
      method: "POST",
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      success: function (res) {
        console.log(res);
        resolve(res);
      },
      fail: function (e) {
        reject(e);
      }
    })
  });
};
// 简单的实现jquery extend
function extend(obj1, obj2) {
  for (var key in obj2) {
    obj1[key] = obj2[key];
  }
  return obj1;
}


function setComInfo(d) {
  // 

}

function getUserInfo() {
  // 获取用户信息
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (res) {
        g.loginInfo = res;
        wx.getUserInfo({
          success: function (d) {
            resolve(d);
          },
          fail: function (e) {
            reject(e)
          }
        })
      },
      fail: function (e) {
        console.log(e);
      }
    });

  })
};

//通过文章类型获取对应文章模板的链接
function getUrlByAtype(atype, item, chlid) {
  var url = '/pages/article/';
  switch (true) {
    case atype == 100://专题
      url += 'topic/topic';
      break;
    case atype == 101://视频专辑
      url += 'topic_v/topic_v';
      break;
    case atype == 102://玫瑰直播
    case atype == 4 || atype == 56://视频底层页
      url += 'normal_v/normal_v';
      break;
    default:
      url += 'normal/normal';
      break;
  }
  if (chlid === 'video') {
    var seq_no = item.listItem && item.listItem.seq_no ? item.listItem.seq_no : '';
    var alg_version = item.listItem && item.listItem.alg_version ? item.listItem.alg_version : '';
    return `${url}?id=${item.aid}&seq_no=${item.listItem.seq_no}&alg_version=${item.listItem.alg_version}`;
  }
  // url = '/pages/article/topic_v/topic_v?chlid=5114542';
  var comments = item.changeInfo && item.changeInfo.comments ? item.changeInfo.comments : 0;
  var seq_no = item.seq_no ? item.seq_no : '';
  var alg_version = item.alg_version ? item.alg_version : '';
  var article_pos = item.article_pos ? item.article_pos : '';
  var reasonInfo = item.reasonInfo ? item.reasonInfo : '';
  return `${url}?id=${item.id}&comments=${comments}&seq_no=${seq_no}&alg_version=${alg_version}&article_pos=${article_pos}&reasonInfo=${reasonInfo}`;
};


function getMediaUrl(atype, item) {
  var url = '/pages/article/media/media';
  return `${url}?id=${item.chlid}`;
};

// 上传用户数据 获取openid 和 城市名
function postUserInfo() {

  var api = 'http://wxapp.cnews.qq.com/uploadUserInfo';

  if (g.userCode) {
    return false;
  }

  return new Promise(function (resolve, reject) {
    getUserInfo().then(function (res) {
      console.log(res);
      g.userCode = res;
      var postInfo = {
        signature: g.userCode.signature,
        rawData: g.userCode.rawData,
        encryptedData: g.userCode.encryptedData,
        iv: g.userCode.iv,
        code: g.loginInfo.code
      }
      wx.request({
        url: api,
        data: postInfo,
        header: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST",
        success: function (res) {
          console.log(res)
        },
        fail: function (e) {
          console.log(e)
        }
      })
    })
  })
}

//获取一下网络状态
function getNetwork() {
  if (app.global.comPostInfo.network) {
    return app.global.comPostInfo.network;
  } else {
    app.getNetworkType();
  }
}


// 用户信息初始化
function userInit(){
    var postApi = conf.getUrl('postApi');

    function postUserInfo() {
      // 获取用户信息
      if (g.isPostInfo) {
        return
      }

      wx.login({
          success: function (res) {
            if (res.code) {
              //发起网络请求
              var temp = res;
              wx.getUserInfo({
                complete: function (res) {
                  var reg = /ok/;
                  // 如果用户允许
                  if (reg.test(res.errMsg)) {
                    t.signature = res.signature;
                    t.rawData = res.rawData;
                    t.encryptedData = res.encryptedData;
                    t.iv = res.iv;
                  }else{
                    console.log('获取用户信息失败')
                  }
                  // 上传用户
                  fetch(postApi, {}, t).then(function (d) {
                    g.isPostInfo = true;
                  })
                }
              })
            } else {
              console.log('获取用户登录态失败！' + res.errMsg)
            }
          },
          fail: function () {
            // 网络失败处理
            showNoNet(me);
          }
        });
    }
}

//  es6简介写法
module.exports = {
  formatTime,
  formatTimeExt,
  formatTimeText,
  transNum,
  urlEncode,
  fetch,
  getUrlByAtype,
  postUserInfo,
  getNetwork,
  extend,
  getMediaUrl,
  userInit
};




