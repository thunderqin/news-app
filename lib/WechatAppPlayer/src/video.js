'use strict';
var Reporter = require("./videoflow/reporter/index");
var Videoflow = require("./videoflow/index");

var APP_NAME = require("./util/platform-config").APP_NAME;

/**
 * 构造函数
 * @param ids 视频vid 专辑cid// 直播pid 流sid
 * @param option
 *  from 平台号
 *  autoplay 自动播放（抛出第一个currentContent的时机） 默认true
 *
 *  @deprecated getLoginData
 *  getReportParam
 */
var exportee = module.exports = function (ids = {}, option = {}) {
	let vid = ids.vid;
	if (typeof ids == 'string') {
		vid = ids;
	}
	if (!vid) {
		throw new Error('连vid都不传让我怎么播视频呀 o(︶︿︶)o ');
	}

	let cid = ids.cid || '';
	let from = option.from;
	let autoplay = option.autoplay !== void 0 ? option.autoplay : true;

	var getReportParam = typeof option.getReportParam == 'function' ? option.getReportParam : (
		typeof option.getLoginData == 'function' ? cb=> {
			option.getLoginData(function (err, res) {
				res.hc_openid = res.openid;
				delete res.openid;
				cb(err, res);
			})
		} : cb=> cb()
	);

	var exportee = Videoflow({
		vid, cid,
		from
	}, {
		getReportParam: function (cb) {
			getReportParam(function (err, res) {
				res.appname = APP_NAME[from];
			    cb(err, res);
			})
		}
	});

	if (autoplay) {
		exportee.start()
	}
	return exportee;
};

exportee.on = function (ev) {
	if (ev == 'report') {
		Reporter.off('report');
		Reporter.on.apply(Reporter, arguments);
	}
};

exportee.release = Reporter.release;

exportee.saveState = Reporter.saveState;

exportee.restoreState = Reporter.restoreState;

exportee.checkState = Reporter.checkState;