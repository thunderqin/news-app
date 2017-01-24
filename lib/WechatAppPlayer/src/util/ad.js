'use strict';
var request = require("../../lib-inject").request;
var Message = require("../module/message");

var ad_type = "WL";
var vid = "";
var live = 0;
var coverid = "";
var chid = 0;
var pu = -1;
var tpid = 1;
var reportTime;
var trueviewAd;
var skipable = -1;
var currentAdDuration = 0;
var allAdDuration = 0;
var closeReport = "https://t.l.qq.com?t=s";
var dp3Report = "https://dp3.qq.com/qqvideo/?bid=weixin";
var rfid = "";
var openid = "";

var message = new Message();

/**
 * 由于组件引用组件不太好弄，考虑到后续甚至有可能要把播放器独立出sdk给第三方使用
 * 这里暂时改成与databinding解耦的模式...
 *
 * @param query   vid,cid等
 * @returns {{adList: Array}} 广告列表 每一个广告是一个function，详见函数末尾的注释。
 */
var exportee = module.exports = function(query) {
	var adList = [];

	console.log('ad video onLoad');
	console.log(query);
	//console.log("tpid:" + paramPromise._result.tpid);
	console.log("当前rfid:" + rfid);
	//console.log(login.getUserInfoSync());
	//console.log(login.getReqHeader());

	if (query.vid) vid = query.vid;
	if (query.live) live = query.live;
	if (query.chid) chid = query.chid;
	if (query.coverid) coverid = query.coverid;
	if (query.pu) pu = query.pu;
	if (query.openid) openid = query.openid;
	//if (paramPromise._result.tpid) tpid = paramPromise._result.tpid;

	var rptVars = {};
	//请求后台lview
	return request(
		'https://livew.l.qq.com/livemsg?ty=web&ad_type=' + ad_type +
		'&pf=H5&lt=wx&pt=0&live=' + live +
		'&pu=' + pu + '&rfid=' + rfid + "&openid=" + openid +
		'&v=TencentPlayerV3.2.19.358&plugin=1.0.0&speed=0&adaptor=2&musictxt=&chid=' + chid +
		'&st=0&resp_type=json&_t=1478361546359&rfid=&vid=' + vid +
		'&vptag=&url=&refer=&pid=&mbid=&oid=&guid=&coverid=' + coverid, {
			needlogin: true
		}
	).then(function(res) {
		if (res.data.adLoc) {
			if (res.data.adLoc.rfid) {
				rfid = res.data.adLoc.rfid;
			}
			if (res.data.adLoc.tpid) {
				tpid = res.data.adLoc.tpid;
			}
		}

		rptVars = {
			t: "0",
			url: "",
			vid: vid,
			coverid: coverid,
			pf: "H5",
			vptag: "",
			pid: "",
			chid: chid,
			tpid: tpid
		};

		console.log("livew请求完成，进行上报");
		var tempStr = dp3Report + "step=2&merged=1&errorcode=100&trycount=0&openid=" + openid;
		tempStr = updateUrlParam(tempStr, rptVars);
		try {
			pingUrl(tempStr);
		} catch (e) {}

		var adList = getLoading(res.data.adList);
		//adList = adList.slice(0, 2);
		console.log("最终adList:" + adList);
		checkTrueviewAd(adList);
		getAllDuration(adList);
		// console.log(adList[0].reportUrlOther.reportitem[0].url);

		// switchAd(adList[0].image[0].url);
		// console.log(adList[0].image[0].url);
		return adList;
	}, function(e) {
		console.log("livew error，再试一次");
		console.log("livew请求失败，进行上报");
		var tempStr = dp3Report + "step=2&merged=1&errorcode=202&trycount=0&openid=" + openid;
		tempStr = updateUrlParam(tempStr, rptVars);
		try {
			pingUrl(tempStr);
		} catch (e) {}
		return request(
			'https://livew.l.qq.com/livemsg?ty=web&ad_type=' + ad_type + '&pf=H5&lt=wx&pt=0&live=' + live + '&pu=' + pu + '&rfid=' + rfid + '&v=TencentPlayerV3.2.19.358\
&plugin=1.0.0&speed=0&adaptor=2&musictxt=&chid=' + chid + "&openid=" + openid + '&st=0&resp_type=json&_t=1478361546359&rfid=&vid=' + vid + '&vptag=&url=&refer=\
&pid=&mbid=&oid=&guid=&coverid=' + coverid, {
				needlogin: true
			}
		).then(function(res) {
			if (res.data.adLoc) {
				if (res.data.adLoc.rfid) {
					rfid = res.data.adLoc.rfid;
				}
				if (res.data.adLoc.tpid) {
					tpid = res.data.adLoc.tpid;
				}
			}

			rptVars = {
				t: "0",
				url: "",
				vid: vid,
				coverid: coverid,
				pf: "H5",
				vptag: "",
				pid: "",
				chid: chid,
				tpid: tpid
			};

			console.log("livew重试请求完成，进行上报");
			var tempStr = dp3Report + "step=2&merged=1&errorcode=100&trycount=1&openid=" + openid;
			tempStr = updateUrlParam(tempStr, rptVars);

			try {
				pingUrl(tempStr);
			} catch (e) {}

			var adList = getLoading(res.data.adList);
			//adList = adList.slice(0, 2);
			console.log("最终adList:" + adList);
			checkTrueviewAd(adList);
			getAllDuration(adList);

			// console.log(adList[0].reportUrlOther.reportitem[0].url);
			// switchAd(adList[0].image[0].url);
			// console.log(adList[0].image[0].url);
			return adList;
		}, function(e) {
			console.log("livew请求失败，进行上报");
			var tempStr = dp3Report + "step=2&merged=1&errorcode=202&trycount=1&openid=" + openid;
			tempStr = updateUrlParam(tempStr, rptVars);
			try {
				pingUrl(tempStr);
			} catch (e) {}
			console.log("livew error，订单获取失败，返回空数组");
			return [];
		})
	}).then(function(adList) {
		adList = adList.map((ad, index) => {
			return function() {
				// 外部通过调用该函数获取每个广告url，因此，此处应该也可以放一些上报逻辑：
				var reportUrlOtherArr = [];
				if (ad.reportUrlOther.reportitem) {
					for (var i = 0; i < ad.reportUrlOther.reportitem.length; i++) {
						reportUrlOtherArr[i] = {
							url: ad.reportUrlOther.reportitem[i].url,
							time: ad.reportUrlOther.reportitem[i].reporttime,
							isReported: false
						};
					}
				}

				console.log("当前广告的trueview开关是否打开：" + ad.trueviewTurn);
				console.log("当前广告是否符合trueview条件：" + trueviewAd);
				if (ad.trueviewTurn && trueviewAd) {
					skipable = 5;
				}

				return {
					oid: ad.order_id, //oid
					url: ad.image[0].url, // 广告的url
					reportUrl: {
						url: ad.reportUrl,
						time: ad.ReportTime,
						isReported: false
					},
					reportUrlOther: reportUrlOtherArr,
					skipable: skipable, //是否可被跳过，0表示一开始就可被跳过，-1表示不可跳过，其他数字表示几秒后可跳过
					duration: ad.duration / 1000,
					allDuration: allAdDuration,
					onSkip: function() { // 当广告被跳过，会回调该函数
						console.log("当前广告被跳过了，上报智慧点10237");
						var reportUrl = closeReport + "&actid=10237";
						reportUrl += "&oid=" + ad.order_id + "&mid=" + ad.order_id + "&locid=";
						try {
							pingUrl(reportUrl);
						} catch (e) {}
					},
					onTimeupdate: function(e) { // 当该广告播放时间更新时的回调
						console.log('update', arguments[0].detail.currentTime + "/" + arguments[0].detail.duration);
					},
					onEnd: function() { // 广告播放结束事件 可作上报
						console.log("当前广告播放结束，进行上报");
						var tempStr = dp3Report + "step=5&merged=1&openid=" + openid;
						tempStr = updateUrlParam(tempStr, rptVars);
						try {
							pingUrl(tempStr);
						} catch (e) {}
					},
					onStart: function() { // 广告播放开始事件 可作上报
						console.log("当前广告开始播放" + ad);
						console.log("当前广告的oid是：" + this.oid);
						//console.log("当前广告的url是：" + ad.image[0].url);
						this.reportUrl.url = updateUrlParam(this.reportUrl.url, rptVars);
						//console.log("当前广告的上报地址是：" + this.reportUrl.url + "/上报时间是：" + this.reportUrl.time);
						if (this.reportUrl.time == 0 && !this.reportUrl.isReported) {
							this.reportUrl.isReported = true;
							try {
								pingUrl(this.reportUrl.url);
							} catch (e) {}
						}

						for (var i = 0; i < this.reportUrlOther.length; i++) {
							this.reportUrlOther[i].url = updateUrlParam(this.reportUrlOther[i].url, rptVars);
							//console.log("当前广告的第三方上报地址是：" + this.reportUrlOther[i].url + "/上报时间是：" + this.reportUrlOther[i].time);
							if (this.reportUrlOther[i].time == 0 && !this.reportUrlOther[i].isReported) {
								this.reportUrlOther[i].isReported = true;
								try {
									pingUrl(this.reportUrlOther[i].url);
								} catch (e) {}
							}
						}
					},
					onError: function() { //广告播放出错
						console.log("当前广告播放出错，进行上报");
						var tempStr = dp3Report + "step=4&merged=1&errorcode=204&openid=" + openid;
						tempStr = updateUrlParam(tempStr, rptVars);
						try {
							pingUrl(tempStr);
						} catch (e) {}
					},
					onReportEmpty: function() { //空单上报
						console.log("我是空单上报，当前广告的上报地址是：" + this.reportUrl.url);
						this.reportUrl.url = updateUrlParam(this.reportUrl.url, rptVars);
						try {
							pingUrl(this.reportUrl.url);
						} catch (e) {}
					}
					// 此处还可以放置更多的hook函数，具体再议

				}
			};
		});

		return {
			adList: adList
		};
	}).catch(function(e) {
		return {}
	})

};

exportee.reporter = message;

function getLoading(items) {
	// console.log(items);
	var ret = [];
	items.item.forEach(function(item, index) {
		// console.log(index, item);
		//if (item.order_id > 10000) {
		ret.push(item);
		//}
	});
	return ret;
}

function pingUrl(_url) {
	//console.log("ping上报地址：" + _url);
	var reportTime = (new Date()).getTime();
	_url = updateUrlParam(_url, {
		reportTime: reportTime
	});
	_url = getHttpsUrl(_url);
	console.log("加上参数后的上报地址为：" + _url);
	//抛出上报事件
	message.emit('report', {
		reportUrl: _url
	});
	//request(_url);
	//var image = new Image();
	//image.src = _url;
}

function getUrlParas(url) {
	var index = url.indexOf("?");
	var para = new Object();
	var newurl = url;
	if (index >= 0) {
		newurl = newurl.substr(index + 1);
		var paraArray = newurl.split("&");
		var parastr;
		var strArray;
		for (var i = 0; i < paraArray.length; i++) {
			parastr = paraArray[i];
			strArray = parastr.split("=");
			if (strArray.length > 1)
				para[strArray[0]] = strArray[1];
			else
				para[strArray[0]] = "null";
		}
	}
	return para;
}

/**
 * 更新url中的参数值，同名的会被覆盖
 */
function updateUrlParam(url, data) {
	try {
		var param = getUrlParas(url);
		var t_url = url;
		var flag = true;

		if (url.indexOf("?") != -1) {
			t_url = url.substring(0, url.indexOf("?"));

			var o;

			for (o in data) {
				param[o] = data[o];
			}

			for (o in param) {
				if (flag) {
					flag = false;
					t_url += "?" + o + "=" + param[o];
				} else {
					t_url += "&" + o + "=" + param[o];
				}
			}
		}
	} catch (e) {
		t_url = "";
	}

	return t_url;
}

function checkTrueviewAd(_arrayAdOrder) {
	console.log("开始检查trueview贴片状态");
	var len = _arrayAdOrder.length;
	// 有多少广告算在贴数里
	var trueviewCheckArr = [];
	var trueviewCount = 0;
	for (var i = 0; i < len; i++) {
		_arrayAdOrder[i].trueviewTurn = false;
		if (_arrayAdOrder[i].order_id == 1 || _arrayAdOrder[i].type == "FT") {
			trueviewCheckArr[i] = 0;
		} else {
			if (checkTrueviewTurn(_arrayAdOrder[i])) {
				_arrayAdOrder[i].trueviewTurn = true;
			}
			trueviewCheckArr[i] = 1;
			trueviewCount += 1;
		}
	}

	if (trueviewCount == 1) {
		trueviewAd = true;
	} else {
		trueviewAd = false;
	}
	console.log("trueviewCheckArr内容是：" + trueviewCheckArr + ",trueviewCount值是：" + trueviewCount);
}

function checkTrueviewTurn(_orderItem) {
	console.log("开始检查trueview开关");
	if (_orderItem.params && _orderItem.params != undefined && _orderItem.params != "") {
		var params = _orderItem.params;
		if (params.indexOf("richdata=") != -1) {
			var richdata = params.substr(params.indexOf("richdata=") + 9);
			if (richdata.indexOf("&") != -1) {
				richdata = richdata.substr(0, richdata.indexOf("&"));
			}
			richdata = decodeURIComponent(richdata.replace(/\+/g, " "));
			console.log("转换出来的richdata参数是：" + richdata);
			try {
				var obj = JSON.parse(richdata);
				console.log("转换成json后的对象是：" + obj);
				if (obj.plugins && obj.plugins != undefined) {
					if (obj.plugins.trueview && obj.plugins.trueview != undefined && obj.plugins.trueview == "Y") {
						console.log("trueview开关是打开的Y！");
						return true;
					}
				}
			} catch (e) {
				console.log("richdata解析出错！");
			}
		}
	}
	return false;
}

function getAllDuration(_arrayAdOrder) {
	//获取所有广告总时长
	for (var i = 0; i < _arrayAdOrder.length; i++) {
		if (_arrayAdOrder[i].order_id != 1) {
			allAdDuration += (_arrayAdOrder[i].duration) / 1000
		}
	}
	console.log("广告总时长为：" + allAdDuration);
}

function getHttpsUrl(url) {
	console.log("要转换的url是：" + url);
	//if (!url || !rich.isHttps) return url;
	if (!url) return url;
	var urlArr = url.match(/^(http:\/\/|https:\/\/)(.*)/);
	if (!urlArr || urlArr.length < 2) return url;
	return "https://" + urlArr[2];
}