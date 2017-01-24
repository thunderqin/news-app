'use strict';
var promisePath = "./src/lib/es6-promise";
var requestPath = "./src/lib/request";

/**
 * 如果希望减少播放器带来的代码尺寸，或是使用自己的promise库，可以修改tvp.js
 * @type {{}}
 */
try {
	let libpath = require("../tvp.js");
	promisePath = libpath.Promise || promisePath;
	requestPath = libpath.request || requestPath;
} catch(e) {}


module.exports = {
	Promise: require(promisePath),

	request: require(requestPath).get
};