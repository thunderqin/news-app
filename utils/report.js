function report(opt) {
  if(!opt.opType){
    return;
  }
  var app = getApp();
  if(!app){
      setTimeout(function(){
          report(opt);
      },2000)
      return
  }
  var g = app.global.comPostInfo;
  var param = {
    BossId: 4454,//bossid, 固定
    Pwd: 1226184945, //秘钥,固定
    model: g.model,//手机型号
    pixelRatio: g.pixelRatio,//设备像素比
    windowWidth: g.windowWidth,//窗口宽度
    windowHeight: g.windowHeight,//窗口高度
    language: g.language,//微信设置的语言
    version: g.version,//微信版本号
    system: g.system,//操作系统版本
    platform: g.platform,//客户端平台
    network: g.network,//网络类型2g，3g，4g，wifi
    biz: '',//业务名称
    openid: g.openid,//用户的账号
    unionid: '',//新闻业务体系绑定体系
    cmnid: g.cmnid,//boss在omg内部的绑定体系
    city: g.user_city,//城市名
    chlid: app.global.chlid ? app.global.chlid : '',//频道id

    //下面这些是需要传的
    bucketId: opt.bucketId ? opt.bucketId : '',//桶id
    opType: opt.opType ? opt.opType : '',//操作名称（打开、离开、点击、曝光、分享、赞、取消赞、投表情、评论等）
    articleId: opt.articleId ? opt.articleId : '',//文章id
    openSrc: opt.openSrc ? opt.openSrc : '',//启动方式
    pageType: opt.pageType ? opt.pageType : '',//页面类型
    itemCount: opt.itemCount ? opt.itemCount : '',//文章数目
    des: opt.des ? opt.des : '',//对应文章内容（包括文章id、推荐理由、文章分类等信息）
    iReserved1: opt.iReserved1 ? opt.iReserved1 : '',//附加字段

    beginTime: opt.beginTime ? opt.beginTime : app.global.start,//开始时间
    endTime: parseInt(new Date().getTime() / 1000),//结束时间
  }

  if(param.beginTime){
    param.duration = param.endTime - param.beginTime;
  }else{
    param.beginTime = '';
    param.duration = '';
  }

  wx.request({
    url: 'https://btrace.qq.com/kvcollect',
    data: param,
    success: function (data) {},
    fail: function (data) {}
  })
}

module.exports = {
  report
};