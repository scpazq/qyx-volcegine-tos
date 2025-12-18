interface GenerateFilenameParams {
    fileName?: string;
    rename?: boolean;
    rootPath: string;
}
/**
 * guid
 * @return {string}
 */
export function guid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * 获取后缀
 * @param {string} filename 文件名
 * @returns {string}
 */
export function getSuffix(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'))
}

/**
 * 格式化路径
 * @param {string} path 路径
 * @returns {string}
 */
export function formatPath(path: string): string {
    return path.replace(new RegExp('\\/{2,}', 'g'), '/').replace(new RegExp('^/', 'g'), '')
}

/**
 * 生成文件名
 * @param {string} filename 文件名
 * @param {boolean} rename 重命名
 * @param {string} rootPath 根目录
 * @returns {string}
 */
export function generateFilename({fileName, rename, rootPath}: GenerateFilenameParams): string {
    if (!fileName) return ''
    const path = fileName.substring(0, fileName.lastIndexOf('/'))
    const newFilename = rename ? `${path}/${guid()}${getSuffix(fileName)}` : fileName
    return formatPath(`${rootPath}/${newFilename}`)
}

/**
 * 深度合并
 * @param {object} src
 * @param {object} target
 * @return {object}
 */
// export function deepMerge(src = {}, target = {}) {
//     let key
//     for (key in target) {
//         src[key] = isObject(src[key], 'Object') ? deepMerge(src[key], target[key]) : (src[key] = target[key])
//     }
//     return src
// }

export function deepMerge<T extends Record<string, any>>(src: T = {} as T, target: Record<string, any> = {}): T {
    for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            if (isObject(src[key])) {
                (src as Record<string, any>)[key] = deepMerge(src[key] as Record<string, any>, target[key]);
            } else {
                (src as Record<string, any>)[key] = target[key]; // Cast to allow assignment
            }
        }
    }
    return src;
}

/**
 * @param {*} val
 * @param {string} type
 * @returns {boolean}
 */
export function is(val: any, type: string): boolean {
    return Object.prototype.toString.call(val).slice(8, -1) === type
}

/**
 * 是否对象
 * @param {*} val
 * @returns {boolean}
 */
export function isObject(val:any): boolean {
    return is(val, 'Object')
}