var util = require('.//util');
var conf = require('./config');
var rep = require('./report').report;
var Base = require("./base");

var fetch = util.fetch;
var KEY = 'newslist';
var app = getApp();
var g = app.global;


// 公共方法，找到数组arr中key等于query的index
function _getQueryIndex(arr, key, query) {
	var temp;

	var len = arr.length;
	while (len--) {
		var item = arr[len];
		if (item[key] === query) {
			temp = len;
			break;
		}
	}

	return temp;
};

function setOld(arr) {
	var len = arr.length;

	while (len--) {
		var item = arr[len];

		item.isOld = true;
	}
}



// 格式化后端数据
function formatData(d, me) {

	var newsArr = d[KEY];
	var news_len = newsArr.length;

	while (news_len--) {

		// 策略模式 一次循环搞定
		var item = newsArr[news_len];
		var id = item.id;

		// 发布时间随机函数
		item.isShowTime = (Math.random() * 10 < 4);
		item.pushTime = parseInt(Math.random() * 8) + 1;

		// 视频特殊处理
		if (me.data.chlid == 'kb_video_news') {
			item.pathUrl = util.getUrlByAtype((item.listItem && item.listItem.articletype), item, 'video');
			item.playcount = util.transNum(item.playcount);
		} else {
			if (+item.articletype === 4 || +item.articletype === 101) {
				if (+item.picShowType === 0) {
					item.picShowType = '40'
				}
				if (item.picShowType === 3 || item.picShowType === 4) {
					item.picShowType = '43'
				}
			}
			item.pathUrl = util.getUrlByAtype(item.articletype, item);
			if(item.changeInfo){
				item.changeInfo.comments = util.transNum(item.changeInfo.comments);
			}
		}
	}
};

// 获取一个随机0-9的整数
function getRandomNum(d) {
	return Math.random() * 10;
};

// 新数据塞到旧数据
function new2old(newArr, oldArr) {
	return newArr.concat(oldArr);
};

// 各种意外状态的图片提示
function show404(me) {
	wx.hideNavigationBarLoading();
	me.setData({
		pullListDate: [],
		newsListData: [],
		is404: true,
		isBlank: false,
		isNoNet: false,
		isShowLoading: false,
		isShowTopLoad: false
	});
};
function showBgLoading(me) {
	me.setData({
		pullListDate: [],
		newsListData: [],
		isShowLoading: true,
		isShowTopLoad: false,
		isBlank: false,
		isNoNet: false,
		is404: false
	});
};
function showNoNet(me) {
	me.setData({
		pullListDate: [],
		newsListData: [],
		isShowLoading: false,
		isNoNet: true,
		is404: false,
		isBlank: false,
		isShowTopLoad: false
	});
};
function showBlank(me) {
	me.setData({
		pullListDate: [],
		newsListData: [],
		isBlank: true,
		is404: false,
		isNoNet: false,
		isShowLoading: false,
		isShowTopLoad: false
	});
};
function hideTopTip(me, info) {

	// 动画 列表
	var animation = wx.createAnimation({
		duration: 0
	})
	me.animation = animation;

	animation.height(35).step()
	me.setData({
		animationData: animation.export(),
		isShowTopNum: true,
		pullNewsInfo: info
	})
	setTimeout(function () {
		var animation2 = wx.createAnimation({
			duration: 500
		})
		animation2.height(0).step();
		me.setData({
			animationData: animation2.export()
		})
	}.bind(me), 1500)


}

// 清空占位图
function clearScreen(me) {
	me.setData({
		is404: false,
		isBlank: false,
		isNoNet: false,
		isShowLoading: false
	})
}

// 视频数据格式化
function formatVideoData(me, d) {
	if (d && d.data && d.data.kankaninfo && me.data.chlid == 'kb_video_news') {
		var t = {};
		t.data = {};
		t.data[KEY] = d.data.kankaninfo.videos;
		t.data.recommWording = d.data.recommWording;
		return t;
	} else {
		return d
	}
}

// 重新加载
function reload(me, myPara) {
	// wx.showNavigationBarLoading();
	g.comPostInfo.last_time = g.last_time || 0;
	//抓去数据
	console.info('reload');
	fetch(me.data.api, { forward: 2 }, myPara).then(function (d) {
		setShowType(me,'')
		console.info(d);
		wx.stopPullDownRefresh();
		wx.hideNavigationBarLoading();
		// 格式化视频数据
		d = formatVideoData(me, d);
		console.info('格式化数据');
		if (d.data && d.data[KEY] && d.data[KEY].length) {
			// 加入评论
			formatData(d.data, me);
			g.last_time = d.data.timestamp;

			var oldArr = d.data[KEY];
			var newArr = [];

			// 第一次获取到openid 合并到公共参数 并保存到内存

			if (!g.comPostInfo.openid) {
				var user = d.data.userInfo;
				util.extend(g.comPostInfo, user);
				wx.setStorage({
					key: 'user',
					data: JSON.stringify(user)
				})
			}

			//更新页面
			me.setData({
				isShowLoading: false,
				pullListDate: newArr,
				newsListData: oldArr,
				pullNewsInfo: d.data.recommWording,
				is404: false,
				isBlank: false,
				isNoNet: false,
				isLocatFail: false
			});

		} else {
			// 没有数据
			console.info('数据格式不对');
			if (d.statusCode == 404 || d.statusCode == 500) {
				setShowType(me,'404')
			} else {
				setShowType(me,'blank')
			}
		}
	}, function () {
		// 断网处理
		wx.stopPullDownRefresh();
		wx.hideNavigationBarLoading();
		console.info('请求失败');
		setShowType(me,'nonet')
	})
}

// 设置城市
function setCity(obj, me) {
	if (!obj) {
		return
	}

	// cityInfo保存province 公参没有
	g.cityInfo = obj;
	g.comPostInfo.user_city = obj.cityName || obj.prvinceName;
	g.comPostInfo.user_cityid = obj.chlid;
	wx.setStorage({
		key: 'locat',
		data: JSON.stringify(obj)
	})
	if (me.data.baseApi) {
		me.data.chlid = obj.chlid;
		me.data.api = me.data.baseApi + obj.chlid;
		reload(me);
	}
};

var jwdApi = conf.getUrl('jwdApi');

// 通过后端接口返回城市名
function getCityName(me) {
	fetch(jwdApi).then(function (d) {

		if (d && d.data) {
			//只有proviceName说明是直辖省
			var info = d.data;

			var locatObj = {
				cityName: info.chlname,
				prvinceName: info.provincename,
				chlid: info.chlid
			};
			g.physicalCity = info.chlname;
			setCity(locatObj, me);
		} else {
			wx.showToast({
				title: '获取城市名失败',
				icon: 'success',
				duration: 2000
			})
		}
	}, function (e) {
		// 全局标识获取经纬度失败
		g.getLoacationFail = true;
	})
}
// 获取经纬度
function getCity(me) {
	if (!g.comPostInfo.user_city) {
		var jwdInfo = wx.getStorageSync('jwd');

		if (jwdInfo) {
			try {
				var t = JSON.parse(jwdInfo);

				g.comPostInfo.latitude = t.latitude;
				g.comPostInfo.longitude = t.longitude;
				// return
			} catch (e) {
				console.log(e)
			}
		};

		var locatInfo = wx.getStorageSync('locat');

		// 如果缓存有
		if (locatInfo) {
			try {
				var t = JSON.parse(locatInfo);
				setCity(t, me);
				return
			} catch (e) {
				console.log(e)
			}
		}



		wx.getLocation({
			type: 'wgs84',
			success: function (res) {
				console.log(res);
				g.comPostInfo.latitude = res.latitude;
				g.comPostInfo.longitude = res.longitude;
				// 缓存经纬度
				var t = {
					latitude: res.latitude,
					longitude: res.longitude
				};
				wx.setStorage({
					key: 'jwd',
					data: JSON.stringify(t)
				});
				getCityName(me);
			},
			fail: function (e) {
				// 获取失败处理
				g.getLoacationFail = true;
			},
			complete: function (reg) {

				// wx.showToast({
				// 	title: reg.errMsg,
				// 	icon: 'success',
				// 	duration: 2000
				// })
			}
		})
	}
}

var start = (me,atype) => {
	// 传给底层页
	g.chlid = me.data.chlid;
	if (me.data.newsListData.length > 2 && atype !== 'fouce') {
		return
	}

	showBgLoading(me);
	// var promise = util.postUserInfo();
	// 如果返回promise 说明获取到后端返回的openID 否则说明之前已经拿到了
	if (g.comPostInfo.openid) {
		reload(me);
		return;
	} else {
		wx.login({
			success: function (res) {
				if (res.code) {
					//发起网络请求
					g.comPostInfo.code = res.code;
					reload(me);
				} else {
					console.log('获取用户登录态失败！' + res.errMsg)
				}
			},
			fail: function () {
				// 网络失败处理
				showNoNet(me);
			},
			complete: function (d) {
				console.info(d);
			}
		});
	}
}

// 初次请求 需要从后端获取用户Id Post给后端
function init(me, atype) {
	Base.init().then(function (res) {
		start(me, atype)
	},function(e){
		setShowType(me,'nonet')
	})
}

function setShowType(me,atype){
	me.setData({
		showType: atype
	})
}

// 上拉刷新
function upperLoad(me, myPara, cb) {

	if (!me.data.lock) {
		me.data.lock = true;
	} else {
		return
	}
	g.comPostInfo.last_time = g.last_time || 0;
	// wx.showNavigationBarLoading();

	var urlPara = {
		forward: 2,
		cachedCount: me.data.newsListData.length
	}
	//抓去数据
	fetch(me.data.api, urlPara, myPara).then(function (d) {
		me.data.lock = false;
		cb && cb(d);
		d = formatVideoData(me, d);
		wx.hideNavigationBarLoading();
		g.comPostInfo.last_time = g.last_time;
		if (d.data && d.data[KEY] && d.data[KEY].length) {
			// 加入评论
			formatData(d.data, me);
			wx.stopPullDownRefresh();
			g.last_time = d.data.timestamp;

			var newArr = me.data.pullListDate;
			var oldArr = me.data.newsListData;

			// 之前拉取的数据塞到旧数据
			oldArr = new2old(newArr, oldArr);
			newArr = d.data[KEY];

			clearScreen(me);
			setOld(oldArr);
			//更新页面
			me.setData({
				pullListDate: newArr,
				newsListData: oldArr
			});
		} else {
			// 提示没有更多数据了
			if (+d.statusCode == 404 || +d.statusCode == 500) {
				show404(me);
			}
			wx.stopPullDownRefresh();
		};
		if (me.data.newsListData.length) {
			hideTopTip(me, "已更新至最新内容");
		}

	}, function (e) {
		// 无网处理
		me.data.lock = false;
		wx.stopPullDownRefresh();
		wx.hideNavigationBarLoading();
		if (me.data.newsListData.length) {
			hideTopTip(me, '网络不给力，稍后再试');
		} else {
			showNoNet(me)
		}
	})
}

// 下拉加载
function lowerLoad(me) {
	
	if (me.data.isNoMore) {
		return
	}
	if (!me.data.lock) {
		me.data.lock = true;
	} else {
		return
	}
	// wx.showNavigationBarLoading();
	var oldArr = me.data.newsListData;
	// 抓取数据
	var urlPara = {
		forward: 1,
		cachedCount: me.data.newsListData.length
	};
	g.comPostInfo.last_time = g.last_time || 0;
	fetch(me.data.api, urlPara).then(function (d) {
		setShowType(me,'')
		me.data.lock = false;
		wx.stopPullDownRefresh();
		d = formatVideoData(me, d);
		if (d.data[KEY] && d.data[KEY].length) {
			formatData(d.data, me);
			g.last_time = d.data.timestamp;
			// 合并之前的数据
			clearScreen(me);
			oldArr = oldArr.concat(d.data[KEY]);
			me.setData({
				newsListData: oldArr,
				isNoMore: false
			});
		} else {
			me.setData({
				isNoMore: true
			})
		}
		wx.hideNavigationBarLoading();
	},function(e){
		me.data.lock = false;
		console.log(e);
		wx.showToast({
			title: '网络无法链接',
			icon: 'loading',
			duration: 800
		})
	})
}

function report(event, me) {
	var newsId = event.currentTarget.dataset.newsid || '';
	var reqNo = event.currentTarget.dataset.seqno || '';

	rep({
		opType: 'list_click',
		beginTime: me.beginTime,
		bucketId: '',//桶id
		articleId: newsId,//文章id
		openSrc: me.queryData && me.queryData.refer ? me.queryData.refer : 'open_self',//启动方式,//启动方式
		pageType: 'list_page',//页面类型
		itemCount: 1,//文章数目
		des: reqNo,//对应文章内容（包括文章id、推荐理由、文章分类等信息）
		iReserved1: '',//附加字段
	})
}

function setClick(event,me) {
	var id = event.currentTarget.dataset.newsid;
	var isOld = event.currentTarget.dataset.isold;

	var newArr = me.data.pullListDate;
	var oldArr = me.data.newsListData;

	if (newArr.length) {
		var index = _getQueryIndex(newArr, 'id', id);

		if (index !== undefined) {
			newArr[index].isClicked = true;
			me.setData({
				pullListDate: newArr
			})
		}else{
			if (oldArr.length) {
				var index = _getQueryIndex(oldArr, 'id', id);

				if (index !== undefined) {
					oldArr[index].isClicked = true;
					me.setData({
						newsListData: oldArr
					})
				}
			}
		}
	} else {
		if (oldArr.length) {
			var index = _getQueryIndex(oldArr, 'id', id);

			if (index !== undefined) {
				oldArr[index].isClicked = true;
				me.setData({
					newsListData: oldArr
				})
			}
		}
	}
	
}
module.exports.new2old = new2old;
exports.upperLoad = upperLoad;
exports.lowerLoad = lowerLoad;
exports.init = init;
exports.setCity = setCity;
exports.report = report;
exports.getCity = getCity;
exports.setClick = setClick;



