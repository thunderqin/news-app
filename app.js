"use strict";


var rep =  require("./utils/report").report;


App({
	onLaunch: function () {
		// 启动
		var that = this;
		this.getSystemInfo();
		this.getLocationInfo();
		this.getNetworkType();
		this.global.start = parseInt(new Date().getTime() / 1000);
		setInterval(function(){
			that.getNetworkType();
		},3000)
		rep({
			opType:'app_open'
		})
	},
	onShow: function () {
		// 前台运行
		console.log("App Show");
		rep({
			opType:'app_show'
		})
	},
	onHide: function () {
		// 后台运行
		rep({
			opType:'app_leave'
		})
	},
	getSystemInfo: function () {
		// 获取设备信息
		var that = this;
		if (!that.global.systemInfo) {
			wx.getSystemInfo({
				success: function (res) {
					var t = that.global.comPostInfo;
					for (var key in res) {
						t[key] = res[key]
					}
				},
				fail: function () {
					wx.showToast({
						title: '获取设备信息失败',
						icon: 'success',
						duration: 2000
					})
				}
			})
		}
	},
	getLocationInfo: function () {
		// 获取地址经纬度
		
	},
	getNetworkType: function () {
		var that = this;

		wx.getNetworkType({
			success: function (res) {
				that.global.comPostInfo.network = res.networkType;
			},
			fail:function(){
				wx.showToast({
					title: '获取网络状态失败',
					icon: 'success',
					duration: 2000
				})
			}
		})
	},
	global: {
		chlid:'',
		cityInfo:{},
		start:'',
		comPostInfo: {
			openid: '',
			unionid: '',
			cmnid: '',
			network: '',
			latitude: '',
			longitude: '',
			user_city: '',
			last_time:''
		}
	}
});
