//index.js

var Fn = require("../../utils/index_fn");
var conf =  require("../../utils/config");

var api = conf.getUrl('timeLine');

Page({
	data: {
		// 拉去的新数据
		pullListDate: [],
		// 旧数据
		newsListData: [],
		scrollTop: null,
		showType: 'loading',
		xhrLock: false,
		chlid:'news_news_tech',
		api: api,
		animationData:{}
	},
	onLoad: function (query) {
		this.data.api = api+this.data.chlid;
		this.queryData = query;
        //记一下页面初始化时间
        this.beginTime = parseInt(new Date().getTime() / 1000);
	},
	onShow: function () {
		Fn.init(this);
	},
	scroll: function (e) {
		// console.log(1);
	},
	onPullDownRefresh: function(){
		Fn.upperLoad(this);
	},
  	onReachBottom: function(){
  	  Fn.lowerLoad(this);
 	},
	upper: function () {
		// 上拉加载
		// Fn.upperLoad(this);
	},
	lower: function (e) {
		// 滚动加载
		// Fn.lowerLoad(this);
	},
	reflash: function () {
		// Fn.upperLoad(this);
	},
	delEven: function(e){
		console.log(e);
	},
	tapEven: function(event){
		Fn.report(event,this);
		Fn.setClick(event,this);
	},
	touchstart: function(e){
		this.touchInfo = e.changedTouches[0];
	},
	onShareAppMessage: function () {
		
		return {
			title: '腾讯新闻',
			desc: '为您提供7×24小时、全方位、及时报道的新闻资讯',
			path: 'pages/index/index'
		}
	},
	touchend: function(e){
		return
		var info = e.changedTouches[0];
		var distanceX = info.clientX - this.touchInfo.clientX;
		var distanceY = info.clientY - this.touchInfo.clientY;

		if(distanceX<-80 && Math.abs(distanceY)<50){
			wx.switchTab({
				url: '../video/video'
			})
		}
		console.log(distanceX);
	}
})
