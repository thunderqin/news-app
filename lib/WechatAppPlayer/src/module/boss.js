/**
 * Boss 上报模块
 * code:
 *        var boss = require('boss')('play')
 *        boss.pv()
 *        boss.click('play')
 */
var systemInfo = wx.getSystemInfoSync()
var nextworkInfo
var networkExpireTimer

function getActionBaseConf(type) {
	switch (type) {
		case 'click':
		case 'expose':
		case 'pageview':
			return {
				BossId: 4328,
				Pwd: 935617029
			};
		case 'play':
			return {
				BossId: 4327,
				Pwd: 944465292
			};
		default:
			return {}
	}
}
function curPage() {
	var page = getCurrentPages().slice(0).pop()
	return page.$name
}
function refPage() {
	var pages = getCurrentPages().slice(0);
	pages.pop();
	pages = pages.pop();
	return (pages && pages.$name) || ''
}

/**
 * 同一时间只允许一个上报请求，其它的排队
 */
var boss = queue(function (next, ...stats) {
	var kvs = extend.apply(null, stats)

	function report() {
		kvs.network = nextworkInfo ? nextworkInfo.type : ''
		kvs.wx_version = systemInfo.version
		kvs.platform = systemInfo.platform
		kvs.client_model = systemInfo.model
		kvs.app_version = '' // 小程序版本

		wx.request({
			method: 'GET',
			url: 'https://btrace.qq.com/kvcollect',
			data: kvs,
			complete: function () {
				next()
			}
		})
	}

	if (!nextworkInfo) {
		clearTimeout(networkExpireTimer)
		wx.getNetworkType({
			success: function (res) {
				nextworkInfo = {
					type: res.networkType
				}
				networkExpireTimer = setTimeout(function () {
					nextworkInfo = null
				}, 500)
				report()
			}
		})
	} else {
		report()
	}
})
module.exports = function (conf) {
	if (conf && typeof conf != 'object') {
		console.error('[Boss] illegal conf param:', conf)
		conf = {}
	}
	function report() {
		return boss.apply(null, arguments)
	}

	report.play = function (step, exts) {
		if (!step || isNaN(+step)) {
			return
		}
		var type = 'play'
		var stats = {
			step,
			page_url: curPage(),
			page_ref: refPage()
		}
		boss(getActionBaseConf(type), stats, conf, exts)
	}
	return report
}

function extend(obj) {
	if (typeof obj != 'object' && typeof obj != 'function') return obj;

	var source, prop;
	for (var i = 1, length = arguments.length; i < length; i++) {
		source = arguments[i];
		for (prop in source) {
			if (source.hasOwnProperty(prop)) {
				obj[prop] = source[prop];
			}
		}
	}
	return obj;
}
function queue(fn, capacity) {
	capacity = capacity || 1
	var callbacks = []
	var remains = capacity
	function next() {
		var item = callbacks.shift()
		if (!item) {
			remains = capacity
			return
		}
		remains--
		var fn = item[0]
		var ctx = item[1]
		var args = item[2]
		args.unshift(function () {
			// once task is done, remains increasing
			remains ++
			// then check or call next task
			next.apply(this, arguments)
		})
		setTimeout(function () {
			return fn.apply(ctx, args)
		}, 16)
	}
	return function () {
		callbacks.push([fn, this, [].slice.call(arguments, 0)])
		if (!remains) return
		return next()
	}
}