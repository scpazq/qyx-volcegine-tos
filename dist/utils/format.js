"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResponse = formatResponse;
exports.generateUrl = generateUrl;
exports.formatPath = formatPath;
const util_1 = require("./util");
function formatResponse({ data, enableCdn, cdnUrl, relationPath, bucket, endpoint, uploadId }) {
    const { statusCode } = data;
    if (!relationPath) {
        return {
            code: statusCode,
            data: {
                url: '',
                suffix: '',
                meta: data,
                uploadId,
            },
        };
    }
    const url = enableCdn ? `${cdnUrl}/${relationPath}` : `https://${bucket}.${endpoint}/${relationPath}`;
    const suffix = (0, util_1.getSuffix)(url);
    return {
        code: statusCode,
        data: {
            url,
            suffix,
            meta: data,
            uploadId,
        },
    };
}
function generateUrl({ url, cdnUrl }) {
    if (!cdnUrl)
        return url;
    const { pathname } = new URL(url);
    const { protocol, host } = new URL(cdnUrl);
    return `${protocol}//${formatPath(host + pathname)}`;
}
function formatPath(path) {
    return path.replace(new RegExp('\\/{2,}', 'g'), '/').replace(new RegExp('^/', 'g'), '');
}
//# sourceMappingURL=format.js.map