'use strict';
var Promise = require("../../lib-inject").Promise;
var GetinfoFlow = require("./flow-getinfo/index");
var PlayFlow = require("./flow-play/index");
var Message = require("../lib/message");
var Reporter = require("./reporter/index");

// 给广告搭个桥
require("./flow-getinfo/data/ad")
	.reporter
	.on('report', function (url) {
		Reporter.any(url)
	});

/**
 * 一个视频生命流程
 * @param cfg
 * @param hook
 * @returns {{flow: (Promise.<T>|*|Promise), start: exportee.start, stop: exportee.stop}|*}
 */
module.exports = function (cfg, hook) {
	cfg = cfg || {};
	hook = hook || {};

	var {vid, from, cid} = cfg;
	var {getReportParam} = hook;
	var getOpenid = new Promise(resolve=> {
		getReportParam ? getReportParam(function (err, res) {
			resolve((res && res.hc_openid) || '');
		}) : resolve('');
	});

	var exportee;

	var model = new Model([{
		// 播放状态
		// loading, ready, playing, end, error
		name: 'state',
		onChange: function (newstate, oldstate) {
			exportee.emit('statechange', newstate, oldstate);
		},
		initialize: 'loading'

	}, {
		// 当前播放content
		name: 'currentContent',
		initialize: null

	}]);

	// 播放流程
	var playflow = null;
	var started = Promise.defer();
	var terminated = false;

	var reporter = Reporter({
		cid, vid
	}, {
		getReportParam
	});

	let flow = getOpenid

		.then(openid=> {
			return GetinfoFlow({
				vid, from, cid, openid
			})
		})

		.then(cfg=> {
			model.state = 'ready';

			// 创建播放流程，创建完后会马上触发一次changeContent，但是没有currentContent
			// 调用start后，会真正开始
			playflow = PlayFlow(cfg, function changeContent(e) {
				model.currentContent = e.currentContent;
				exportee.emit('contentchange', e);
			});
			reporter.setPlayFlow(playflow);
			reporter.setVideoInfo(cfg.videoinfo);

			// 等待上层开始命令
			return started.promise;
		})

		.then(()=> {
			model.state = 'playing';
			// 开始播放流程
			return playflow.start();
		})

		.then(ret=> {
			// 结束喽
			model.state = 'ended'
		})

		.catch(err=> {
			exportee.emit('error', err);
			// 报错喽
			model.state = 'error';

			playflow.stop();
			terminated = true;
			reporter.error();
			throw err
		});

	exportee = {
		vid,

		flow,

		start: function () {
			started.resolve();
			return this;
		},

		stop: function () {
			started.reject();

			playflow && playflow.stop();
			exportee.off();
			terminated = true;
			return this;
		}
	};

	(new Message).assign(exportee);

	['End', 'Play', 'Pause', 'Timeupdate', 'Error', 'Skip'].forEach(hook=> {
		exportee['onContent' + hook] = function () {
			playflow['onContent' + hook].apply(playflow, arguments);
		};
		exportee['on' + hook] = function () {
			console.warn(`不建议再使用video.on${hook}，请使用onContent${hook}`);
			this['onContent' + hook].apply(this, arguments);
		}
	});

	return exportee;
};


/**
 *
 * @constructor
 */
function Model(_configs) {
	var configs = _configs instanceof Array ? _configs : [].slice.call(arguments, 0);
	var object = {};
	configs.forEach(function (config) {
		var _value = config.initialize;
		Object.defineProperty(object, config.name, {
			get: () => {
				return _value
			},
			set: newvalue => {
				let oldvalue = _value;
				_value = newvalue;
				config.onChange && config.onChange(newvalue, oldvalue);
			}
		})
	});
	return object
}