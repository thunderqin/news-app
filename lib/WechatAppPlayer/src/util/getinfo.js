'use strict';

var request = require("../../lib-inject").request;
var qvsec = require("../module/qvsec");

// const useHLS = true;
const useHLS = wx.getSystemInfoSync().platform != 'devtools';

var SDTFROM;
const PLATFORM = require("./platform-config").APP_PLATFORM;

function getInfo(vid, FROM) {
    SDTFROM = FROM;
    var _rnd = timestamp();
    var qvData = qvsec.$xx(PLATFORM[FROM], vid, SDTFROM, 1, _rnd);
    var qvstr = '';
    var qvcookie = '';
    if (qvData && qvData.u1 && qvData.u2 && qvData.c) {
        qvstr = `_qv_rmt=${qvData.u1}&_qv_rmt2=${qvData.u2}`;
        qvcookie = 'qv_als=' + qvData.c;
    }

    console.info('getinfo waiting');
    return request(`https://h5vv.video.qq.com/getinfo?${qvstr}&defn=auto&platform=${PLATFORM[FROM]}&otype=json&sdtfrom=${FROM}&_rnd=${_rnd}&appVer=0.0.1&${useHLS ? 'dtype=3&' : ''}vid=` + vid, {
        needlogin: true,
        header: {
            Cookie: qvcookie
        }
    })
        .catch(function () {
            return request(`https://bkvv.video.qq.com/getinfo?${qvstr}&defn=auto&platform=${PLATFORM[FROM]}&otype=json&sdtfrom=${FROM}&_rnd=${_rnd}&appVer=0.0.1&${useHLS ? 'dtype=3&' : ''}vid=` + vid, {
                needlogin: true,
                header: {
                    Cookie: qvcookie
                }
            })
        })
        .then(function (res) {
            res = res.data;
            if (res.s != "o") {
                // 可能还是应该抛Error实例
                throw res
            }
            console.log('getinfo result:', res);
            return res;
        });
}

module.exports = function () {
    return getInfo.apply(this, arguments)
        .then(function (videoinfo) {
            if (useHLS) {
                let vlist = videoinfo.vl;
                let video = vlist.vi[0];

                if (!video.ul.ui[0].hls.pt) {
                    return {
                        url: ''
                    }
                }

                return {
                    url: video.ul.ui[0].url + video.ul.ui[0].hls.pt +
                    '?platform=' + PLATFORM[SDTFROM] +
                    '&sdtfrom=' + SDTFROM,
                    duration: video.td,
                    dltype: videoinfo.dltype,
                    fmid: videoinfo.fl.fi.filter(item=> +item.sl)[0].id,
                    filesize: videoinfo.fl.fi.filter(item=> +item.sl)[0].fs
                };

            } else {
                let vlist = videoinfo.vl;
                let video = vlist.vi[0];

                if (!video.fvkey) {
                    return {
                        url: ''
                    }
                }

                return {
                    url: video.ul.ui[0].url +
                    video.fn + '?vkey=' + video.fvkey +
                    '&br=' + video.br +
                    '&fmt=auto' +
                    '&level=' + video.level +
                    '&platform=' + PLATFORM[SDTFROM] +
                    '&sdtfrom=' + SDTFROM,
                    duration: video.td,
                    dltype: videoinfo.dltype,
                    fmid: videoinfo.fl.fi.filter(item=> +item.sl)[0].id,
                    filesize: videoinfo.fl.fi.filter(item=> +item.sl)[0].fs
                }
            }
        })
};


function timestamp(len) {
    len = len || 10;
    var timestamp = parseInt(+new Date()) + '';
    if (timestamp.length === len) {
        return timestamp;
    } else if (timestamp.length > len) {
        return timestamp.substring(0, len);
    } else {
        var index = len - timestamp.length;
        while (index > 0) {
            timestamp = '0' + timestamp;
            index--;
        }
        return timestamp;
    }
}