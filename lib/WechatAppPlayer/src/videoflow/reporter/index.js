'use strict';
var message = new (require("../../lib/message"));
var reportQueue = require("./report-queue");
reportQueue.onReport = function (cfg) {
    Reporter.emit('report', cfg)
};
var reportPlay = require("./report-play");
var cache = require("../../module/cache");

// https://docs.google.com/spreadsheets/d/1eUyqFD1FkRc8L4YawJg2rUOqYecqmFjH2b_MeT_FS3w/edit#gid=0
function Reporter(cfg, hook = {}) {
	var {vid, cid} = cfg;
	let externalReportParam = hook.getReportParam || {};

	var _videoinfo = null;

	var allPlayStartTime = 0;   // 所有播放的开始时间
	var currentPlayStartTime;   // 这一段播放开始时间
	var currentPlaySumTime = 0; // 这一段播放总长

	function getbase() {
		return {
			iformat: _videoinfo ? _videoinfo.dltype : 0,
			duration: _videoinfo ? Math.floor(_videoinfo.duration) : '',
			defn: _videoinfo ? formatidToDefn(_videoinfo.fmid) : '',

			playtime: currentPlaySumTime + (currentPlayStartTime ? Date.now() - currentPlayStartTime : 0),

			vid: vid || '',
			cid: cid || ''
		};
	}

	var playedAd = false;
	var step7 = Oncer(function (url) {
		var param = getbase();
		param.val1 = 0;
		param.val2 = 0;
		param.val3 = url;
		reportPlay(7, param, externalReportParam);
	});

	var step6 = Oncer(function (url) {
		var param = getbase();
		param.val1 = allPlayStartTime ? Date.now() - allPlayStartTime : 0;
		param.val2 = playedAd ? 0 : 1; // 无法得知视频loaded状态，反正有广告就报0
		param.val3 = url;
		reportPlay(6, param, externalReportParam);
	});

	var step5 = Oncer(function (type, lastplaytime) {
		var param = getbase();

		param.val1 = allPlayStartTime ? Date.now() - allPlayStartTime : 0;
		param.val2 = {
				"error": 3,
				"complete": 1,
				"incomplete": 2
			}[type] || 2;
		param.val3 = lastplaytime;

		reportPlay(5, param, externalReportParam)
	});

	reportPlay(3, getbase(), externalReportParam);

	Reporter.on('_save', function () {
		var param = getbase();

		param.val1 = allPlayStartTime ? Date.now() - allPlayStartTime : 0;
		param.val2 = 2;

		reportPlay(5, param, externalReportParam, function (err, url) {
			cache.set('tvp_report_5', url)
		})
	});
	Reporter.on('_restore', function () {
		cache.del('tvp_report_5');
	});

	return {
		setPlayFlow: Oncer(function (playflow) {
			playflow.on('adplaying', function (content) {
				playedAd = true;
				step7(content.url);
			});
			playflow.on('videoplay', function (content) {
				!allPlayStartTime && (allPlayStartTime = Date.now());
				currentPlayStartTime = Date.now();
			});
			playflow.on('videoplaying', function (content) {
				step6(content.url);
			});
			playflow.on('videopause', function () {
				// 用于统计播放时长
				currentPlaySumTime += (Date.now() - currentPlayStartTime);
				currentPlayStartTime = 0;
			});
			playflow.on('terminate', function () {
				step5('incomplete');
			});
			playflow.on('end', function () {
				step5('complete');
			});
			playflow.on('error', function () {
				step5('error');
			});
		}),

		setVideoInfo: Oncer(function (v) {
			_videoinfo = v;
		}),

		// getinfo失败调这里？
		error: function () {
		    step5('error');
		}
	}
}

Reporter.any = function (url) {
	reportQueue.push(url);
};

Reporter.saveState = function() {
	console.log('reporter.js', 'saveState');
	Reporter.emit('_save');
};

Reporter.restoreState = function() {
	console.log('reporter.js', 'restoreState');
	Reporter.emit('_restore')
};

Reporter.checkState = function() {
	console.log('reporter.js', 'checkState');
	var url = cache.get('tvp_report_5');
	if (url) {
		reportQueue.push(url);
	}
	cache.del('tvp_report_5');
};

message.assign(Reporter);

module.exports = Reporter;


// 只跑一次的
function Oncer(fn) {
	var done = false;
	var ret = function () {
		if (done) return;
		done = true;
		fn.done = done;
		fn.apply(this, arguments);
	};

	ret.done = done;
	return ret;
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