function getUrl(key) {
    var baseApi = 'https://wxapp.inews.qq.com/';

    var arr = {
        article: baseApi+'getSubNewsContent',
        relateNews: baseApi+'getSubNewsRelate',
        topic: baseApi+'getSpecialListItems',
        topic_v: baseApi+'getSpecialVideoListItems',
        media_info: baseApi+'getSubItem',
        media_article: baseApi+'getSubNewsIndex',
        media_video: baseApi+'getVideoNewsIndex',
        media_next: baseApi+'getSubNewsListItems',
        comment: baseApi+'getQQNewsComment',

        timeLine: baseApi+'getQQNewsUnreadList?devid=3&chlid=',
        postApi: baseApi+'login'
    }

    return arr[key]  ? arr[key] : false;
}

module.exports = {
    getUrl: getUrl
};