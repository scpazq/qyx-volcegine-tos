import { getSuffix } from './util';
export function formatResponse({ data, enableCdn, cdnUrl, relationPath, bucket, endpoint, uploadId }) {
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
    const suffix = getSuffix(url);
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
export function generateUrl({ url, cdnUrl }) {
    if (!cdnUrl)
        return url;
    const { pathname } = new URL(url);
    const { protocol, host } = new URL(cdnUrl);
    return `${protocol}//${formatPath(host + pathname)}`;
}
export function formatPath(path) {
    return path.replace(new RegExp('\\/{2,}', 'g'), '/').replace(new RegExp('^/', 'g'), '');
}
//# sourceMappingURL=format.js.map