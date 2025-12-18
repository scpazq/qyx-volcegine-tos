import { getSuffix } from './util'

interface FormatResponseParams {
    data: any;
    enableCdn?: boolean;
    cdnUrl?: string;
    relationPath?: string;
    bucket?: string;
    endpoint?: string;
    uploadId?: string;
    key?: string;
}

interface FormatResponseResult {
    code: number;
    data: {
        url: string;
        suffix: string;
        meta: any;
        uploadId?: string;
    };
}

interface GenerateUrlParams {
    url: string;
    cdnUrl?: string;
}

/**
 * 格式化响应值
 * @param {object} data
 * @param {boolean} enableCdn 启用 cdn 域名
 * @param {string} cdnUrl cdn 域名
 * @param {string} relationPath 相对路径
 * @returns {object}
 */
export function formatResponse({ 
    data,
    enableCdn,
    cdnUrl,
    relationPath,
    bucket,
    endpoint,
    uploadId
}: FormatResponseParams): FormatResponseResult{
    const { statusCode } = data
    if (!relationPath) {
        return {
            code: statusCode,
            data: {
                url: '',
                suffix: '',
                meta: data,
                uploadId,
            },
        }
    }
    const url =  enableCdn ? `${cdnUrl}/${relationPath}`: `https://${bucket}.${endpoint}/${relationPath}`
    const suffix = getSuffix(url)
    return {
        code: statusCode,
        data: {
            url,
            suffix,
            meta: data,
            uploadId,
        },
    }
}

/**
 * 生成 url
 * @param {string} url
 * @param {string} cdnUrl
 * @returns {string}
 */
export function generateUrl({ url, cdnUrl }: GenerateUrlParams) : string {
    if (!cdnUrl) return url
    const { pathname } = new URL(url)
    const { protocol, host } = new URL(cdnUrl)
    return `${protocol}//${formatPath(host + pathname)}`
}

/**
 * 格式化路径
 * @param {string} path 路径
 * @returns {string}
 */
export function formatPath(path: string) : string {
    return path.replace(new RegExp('\\/{2,}', 'g'), '/').replace(new RegExp('^/', 'g'), '')
}