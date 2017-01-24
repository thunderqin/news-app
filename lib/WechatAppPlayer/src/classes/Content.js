'use strict';
var Message = require("../lib/message");
var ID = 1;
/**
 * 一个播放内容，广告 视频都是播放内容
 * @type {Content}
 */
module.exports = class Content {
	get url() { // 该content的播放url
		return this._url[this._urlIndex]
	}

	get id() {
		return this._id
	}

	get duration() { // 该content的播放时长
		return this._duration
	}

	get filesize() {
		return this._filesize
	}

	get preview() {
		return this._preview
	}

	get charged() {
		return this._charged
	}

	constructor(option) {
		this.mockUpdate = 0;
		this._urlIndex = 0;

		Object.defineProperties(this, {
			_url: {
				value: option.url instanceof Array ? option.url : [option.url]
			},
			_id: {
				value: ID++
			},
			_duration: {
				value: option.duration
			},
			_filesize: {
				value: option.filesize
			},
			_charged: {
				value: option.charged
			},
			_preview: {
				value: option.preview
			},
			isad: {
				value: option.isad
			}
		});
		(new Message).assign(this); // 加上事件收发器
	}

	onContentEnd() {
		this.emit('end')
	}

	onContentPlay() { 
		this.emit('play')
	}

	onContentPause() {}

	onContentTimeupdate(currentTime) {
		if (currentTime && currentTime.target) {
			currentTime = currentTime.detail.currentTime
		}
		if (!this.emittedStart && (
				typeof currentTime == typeof void 0 ? this.mockUpdate++ > 5 : currentTime > 0
			)
		) {
			this.emit('start');
			this.emittedStart = true;
		}
		this.emit.apply(this, ['timeupdate'].concat([].slice.call(arguments, 0)))
	}

	onContentError() {
		// 使用替补url
		if (this._url.length > this._urlIndex + 1) {
			this._urlIndex++;
			this.emit('change', this.url);
			return;
		}
		this.emit.apply(this, ['error'].concat([].slice.call(arguments, 0)))
	}

	onContentSkip() {
		this.isad && this.emit('skip')
	}

};