'use strict';
var Promise = require("../../../lib-inject").Promise;
var Message = require("../../lib/message");
var Content = require("../../classes/Content");

module.exports = function (res, _changeContent) {

	/////////////////////////////定义
	// 广告进度信息
	var adProgressInfo = {
		time: 0,
		duration: 0,
		skipable: false
	};
	// 所有内容的map
	var contentMap = {};
	// 所有内容是否播完的map
	var doneMap = {};
	// 需要预加载的内容列表
	var preloadList = [];
	// 播放进度
	var progressDefer = Promise.defer();
	var progress = progressDefer.promise;
	// 消息
	var _message = new Message;
	// 是否已被中止
	var terminated = false;

	var currentContent = null;

	var changeContent = (content)=> {
		console.log('contentchange:', content, doneMap);
		var emitter = {
			currentContent: content,
			preloadContents: preloadList.filter(item=> !doneMap[item.id] && item != content)
		};
		if (content && content.isad) {
			emitter.progress = adProgressInfo;
		}
		currentContent = content;
		_changeContent(emitter);
	};

	/////////////////////////////流程定义
	var {ad, videoinfo} = res;
	var skipped = false;

	// 广告内容
	(ad.adList || []).forEach(adFactory=> {
		var adconfig = adFactory();

		let content = new Content({
			url: adconfig.url,
			duration: adconfig.duration,
			isad: true
		});
		let contentProgress = new Promise(resolve=> {
			if (skipped || terminated) return;

			content.on('end', function () {
				resolve();
				adconfig.onEnd();
			}, true);
			content.on('error', function () {
				resolve();
				adconfig.onError();
			}, true);
			content.on('skip', function () {
				skipped = true;
				resolve();
				adconfig.onSkip();
			}, true);
			content.on('start', function () {
				_message.emit('adplaying', content);
				adconfig.onStart();
			}, true);
			content.on('timeupdate', function (current) {
				adconfig.onTimeupdate(current)
			}, true);

			_message.on('terminate', function () {
				resolve();
			})
		}).then(r=> {
			doneMap[content.id] = true;
			return r;
		});

		contentMap[content.id] = content;
		preloadList.push(content);
		adProgressInfo.duration += adconfig.duration;
		adProgressInfo.skipable = adconfig.skipable;

		progress = progress
			.then(()=> {
				console.info('playflow: ad.' + adconfig.url);

				// 到这里时，广告即将开始播放，所以可以用于检测空单
				if (adconfig.oid == "1") {
					console.log("这是一个空单，往下走");
					adconfig.onReportEmpty();
					return;
				}

				changeContent(content);
				return contentProgress
					.then(r=> {
						adProgressInfo.time += content.duration;
					})
			});
	});

	// 视频内容
	let videocontent = new Content({
		url: videoinfo.url,
		duration: videoinfo.duration,
		filesize: videoinfo.filesize,
		isad: false,

		preview: videoinfo.preview,
		charged: videoinfo.charged
	});
	contentMap[videocontent.id] = videocontent;
	preloadList.unshift(videocontent);

	let videoProgress = new Promise((resolve, reject)=> {
		if (terminated) return;

		videocontent.on('start', ()=> {
			_message.emit('videoplaying', videocontent);
		}, true);
		videocontent.on('play', ()=> {
			_message.emit('videoplay', videocontent);
		});
		videocontent.on('pause', ()=> {
			_message.emit('videopause', videocontent);
		});
		videocontent.on('error', e=> {
			var err = new Error((e.detail && e.detail.errMsg) || e.message || '播放出错');
			err.code = 'P.0';
			reject(err);
		}, true);
		videocontent.on('end', resolve, true);

		_message.on('terminate', function () {
			resolve();
		})
	}).then(r=> {
		doneMap[videocontent.id] = true;
		return r;
	});

	progress = progress
		.then(()=> {
			// videocontent掌权之后，不再单独emit change事件，而是直接触发video的changeContent
			videocontent.off('change');
			videocontent.on('change', function () {
				changeContent(videocontent);
			});
			changeContent(videocontent);
			return videoProgress
		})
		.then(function () {
			_message.emit('end')
		})
		.catch(function (e) {
			_message.emit('error', e);
			throw e;
		});
	changeContent(null);

	var exportee = {
		progress: progress,

		stop() {
			_message.emit('terminate');
			Object.keys(contentMap).forEach(key=> {
				contentMap[key].off();
			});
			_message.off();
			return this;
		},

		start() {
			progressDefer.resolve();
			return progress;
		},

		on() {
			return _message.on.apply(_message, arguments);
		}
	};

	['End', 'Play', 'Pause', 'Timeupdate', 'Error', 'Skip'].forEach(hook=> {
		exportee['onContent' + hook] = function (contentid, ...args) {
			let content = contentid && contentMap[contentid] ? contentMap[contentid] : currentContent;
			content['onContent' + hook].apply(content, args);
		};
	});
	
	return exportee;
};