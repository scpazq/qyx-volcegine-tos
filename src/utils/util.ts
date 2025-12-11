
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
export function generateFilename({fileName, rename, rootPath}: {fileName: string, rename: boolean, rootPath: string}): string {
    if (!fileName) return ''
    const path = fileName.substring(0, fileName.lastIndexOf('/'))
    const newFilename = rename ? `${path}/${guid()}${getSuffix(fileName)}` : fileName
    return formatPath(`${rootPath}/${newFilename}`)
}