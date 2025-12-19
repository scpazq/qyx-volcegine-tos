export function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function getSuffix(filename) {
    return filename.substring(filename.lastIndexOf('.'));
}
export function formatPath(path) {
    return path.replace(new RegExp('\\/{2,}', 'g'), '/').replace(new RegExp('^/', 'g'), '');
}
export function generateFilename({ fileName, rename, rootPath }) {
    if (!fileName)
        return '';
    const path = fileName.substring(0, fileName.lastIndexOf('/'));
    const newFilename = rename ? `${path}/${guid()}${getSuffix(fileName)}` : fileName;
    return formatPath(`${rootPath}/${newFilename}`);
}
export function deepMerge(src = {}, target = {}) {
    for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(target, key)) {
            if (isObject(src[key])) {
                src[key] = deepMerge(src[key], target[key]);
            }
            else {
                src[key] = target[key];
            }
        }
    }
    return src;
}
export function is(val, type) {
    return Object.prototype.toString.call(val).slice(8, -1) === type;
}
export function isObject(val) {
    return is(val, 'Object');
}
//# sourceMappingURL=util.js.map