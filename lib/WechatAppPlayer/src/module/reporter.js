var Message = require("./message");
var request = require("../../lib-inject").request;

var reportQueue = (function () {
	const MAX_RELEASE_TIMEOUT = 3000;
	var self;

	var lock = false;
	var queue = [];
	var maxReleaseTimer = null;

	function doReport(url) {

		if (~url.reportUrl.indexOf('btrace.qq.com')) {
			request(url.reportUrl).then(function () {
			    self.release();
			}).catch(function () {
				Reporter.emit('report', url);

			})

		} else {
			Reporter.emit('report', url);
		}

		maxReleaseTimer = setTimeout(function () {
			self.release();
		}, MAX_RELEASE_TIMEOUT);
	}

	return (self = {
		release: function (url) {
			if (lock && url && url != lock) { // 如果release的url和当前不一样，忽略
				return;
			}
			lock = false;
			clearTimeout(maxReleaseTimer);
			if (queue.length) {
				doReport(queue.shift());
			}
		},
		push: function (url) {
			if (!lock) {
				lock = url;
				doReport(url);

			} else {
				queue.push(url);
			}
		}
	})
})();

var _firstReporter = true;
// https://docs.google.com/spreadsheets/d/1eUyqFD1FkRc8L4YawJg2rUOqYecqmFjH2b_MeT_FS3w/edit#gid=0
function Reporter(vid, cid, cfg = {}) {
	let externalReportParam = cfg.getReportParam || {};

	let firstReporter = _firstReporter;
	_firstReporter = false;

	var _videoinfo = null;

	function getbase() {
	    return {
		    iformat: _videoinfo ? _videoinfo.dltype : 0,
		    duration: _videoinfo ? _videoinfo.duration : '',
		    defn: _videoinfo ? formatidToDefn(_videoinfo.fmid) : '',

		    playtime: currentPlaySumTime + (currentPlayStartTime ? Date.now() - currentPlayStartTime : 0),

		    vid: vid || '',
		    cid: cid || '',

		    appname: cfg.appname || ''
	    };
	}

	var step7reported = false;
	var allPlayStartTime = 0;

	var currentPlayStartTime;
	var currentPlaySumTime = 0;
	return {
		// getinfo成功后输入videoinfo
		setVideoInfo: function (v) {
		    _videoinfo = v;
		},

		// 用于统计播放时长
		start() {
			!allPlayStartTime && (allPlayStartTime = Date.now());
			currentPlayStartTime = Date.now();
		},
		pause() {
			currentPlaySumTime += (Date.now() - currentPlayStartTime);
			currentPlayStartTime = 0;
		},

		/**
		 * 播放上报step3
		 */
		step3: Oncer(function () {
			var param = getbase();

			param.val1 = firstReporter ? 1 : 2;

			reportPlay(3, param, externalReportParam)
		}),
		/**
		 * 播放上报step5
		 * type: error || complete || incomplete
		 * lastplaytime: 上次成功播放时间
		 */
		step5: Oncer(function (type, lastplaytime) {
			var param = getbase();

			param.val1 = Date.now() - allPlayStartTime;
			param.val2 = {
				"error": 3,
				"complete": 1,
				"incomplete": 2
			}[type] || 2;
			param.val3 = lastplaytime;

			reportPlay(5, param, externalReportParam)
		}),

		step6: Oncer(function (url) {
			var param = getbase();
			param.val1 = Date.now() - allPlayStartTime;
			param.val2 = step7reported ? 0 : 1; // 无法得知视频loaded状态，反正有广告就报0
			param.val3 = url;

			reportPlay(6, param, externalReportParam);
		}),

		// 播放上报step7
		step7: Oncer(function (url) {
			var param = getbase();
			param.val1 = 0;
			param.val2 = 0;
			param.val3 = url;
			step7reported = true;
			reportPlay(7, param, externalReportParam);
		})
	}
}

Reporter.any = function (url) {
	reportQueue.push(url);
};

Reporter.release = reportQueue.release;

(new Message).assign(Reporter);

module.exports = Reporter;


// 只跑一次的
function Oncer(fn) {
	var done = false;
	return function () {
		if (done) return;
		done = true;
		fn.apply(this, arguments);
	}
}

const BOSSID = 4327;
const PWD = 944465292;
var systemInfo = wx.getSystemInfoSync();

function reportPlay(step, param = {}, asyncExt) {

	asyncExt(function (err, adata) {

		console.log('reportPlay', step, param, adata);
		var pages = getCurrentPages().slice(0);
		var cur = pages.pop();
		var ref = pages.pop();

		wx.getNetworkType({
			success: function (res) {
				var reportee = {
					BossId: BOSSID,
					Pwd: PWD,
					app_version: '',
					platform: systemInfo.platform,
					client_model: systemInfo.model,
					wx_version: systemInfo.version,
					network: res && res.networkType ? res.networkType : '',
					step,
					// iformat
					// duration
					// defn
					// tpay
					// adid
					// playtime
					page_url: (cur && cur.$name) || '',
					page_query: (cur && cur.$query) || '',
					page_ref: (ref && ref.$name) || ''
					// cid
					// vid
					// isvip
					// val1
					// val2
					// val3
					// appname
					// nick
					// rmd
				};
				[
					'hc_openid',
					'iformat', 'duration', 'defn', 'tpay', 'adid', 'playtime',
					'page_url', 'page_query', 'page_ref',
					'cid', 'vid', 'isvip', 'val1', 'val2', 'val3',
					'appname', 'nick', 'rmd'
				].forEach(key=> {
					if (key in param) reportee[key] = param[key];
					if (key in adata) reportee[key] = adata[key];
				});
				

				reportQueue.push({
					reportUrl: 'https://btrace.qq.com/kvcollect?' +
					Object.keys(reportee)
						.map(key=> key in reportee ? `${key}=${encodeURIComponent(reportee[key])}` : '')
						.filter(item=>item)
						.join('&')
				})
			}
		})
	});
}

// 转化成boss上报的清晰度id
// 产品定义的清晰度： 1.默认（未知，例如format 1和2), 2.流畅 3.高清 4.超清
function formatidToDefn(id) {

	return {
		1: 1,
		2: 1,
		10001: 4,
		10002: 3,
		10003: 2,
		10201: 4,
		10202: 3,
		10203: 2,
		100001: 2
	}[id]
}