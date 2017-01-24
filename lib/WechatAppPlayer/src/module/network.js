'use strict';
/**
 * 自制networkType切换事件
 * zombie
 * @type {Message}
 */
var Message = require("./message");
var message = new Message;

var _value = '';

function refresh() {
	wx.getNetworkType({
		success(res) {
			if (res && res.networkType) {
				_value = res.networkType;
				if (res.networkType != _value) {
					message.emit('change', _value);
				}
			}
		}
	});
}
refresh();

var timer;

var exportee = module.exports = function get() {
	return _value
};

exportee.onChange = function (fn, once) {
	message.on('change', fn, once);
	return this;
};

exportee.startPoll = function () {
    timer = setInterval(refresh, 5000);
	return this;
};

exportee.endPoll = function () {
    clearInterval(timer);
	return this;
};