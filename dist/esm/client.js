import TOS from '@volcengine/tos-sdk';
import { generateFilename, deepMerge, guid } from './utils/util';
import { formatResponse } from './utils/format';
import { cloneDeep } from 'lodash-es';
export class QyxVolcegineTos {
    constructor(options) {
        this.client = null;
        this.tasks = new Map();
        this.refreshTimer = null;
        this.opts = cloneDeep(deepMerge({
            async: false,
            rootPath: '',
            rename: true,
            enableCdn: false,
            requestTimeout: 120000,
            connectionTimeout: 10000,
            cdnUrl: '',
            maxRetryCount: 5,
            partSize: 5 * 1024 * 1024,
            parallel: 3,
            refreshSTSTokenInterval: 300000,
            config: {
                headers: {
                    'Cache-Control': 'public',
                },
            },
            getOptions: async () => {
                throw new Error('getOptions must be implemented by user');
            },
        }, options));
        this.expiration = options.expiration;
    }
    async init() {
        if (this.client && this.expiration && this.expiration > Date.now())
            return this.client;
        const creds = await this.opts.getOptions();
        this.opts = {
            ...this.opts,
            ...creds,
            bucket: creds.bucket,
            rootPath: creds.rootPath,
            endpoint: creds.endpoint,
            cdnUrl: creds.cdnUrl,
            enableCdn: creds.enableCdn,
        };
        this.client = new TOS({
            accessKeyId: creds.accessKeyId,
            accessKeySecret: creds.accessKeySecret,
            stsToken: creds.securityToken,
            endpoint: creds.endpoint,
            region: creds.region,
            maxRetryCount: 5,
        });
        this.expiration = creds.expiration;
        return this.client;
    }
    async putObject(fileName, file, config = {}) {
        var _a, _b, _c, _d;
        try {
            await this.init();
            const rename = config.hasOwnProperty('rename')
                ? config === null || config === void 0 ? void 0 : config.rename
                : this.opts.rename;
            const key = generateFilename({
                fileName,
                rename,
                rootPath: (_a = this.opts.rootPath) !== null && _a !== void 0 ? _a : '',
            });
            const result = await this.client.putObject({
                key,
                body: file,
                bucket: config.bucket || this.opts.bucket,
                headers: {
                    'Content-Type': file.type,
                    ...(((_b = this.opts.config) === null || _b === void 0 ? void 0 : _b.headers) || {}),
                }
            });
            return (formatResponse({
                relationPath: key,
                data: result,
                enableCdn: (_c = this.opts) === null || _c === void 0 ? void 0 : _c.enableCdn,
                cdnUrl: (_d = this.opts) === null || _d === void 0 ? void 0 : _d.cdnUrl,
                bucket: config.bucket || this.opts.bucket,
                endpoint: this.opts.endpoint,
            }));
        }
        catch (error) {
            throw error;
        }
    }
    addMultipartUpload(fileName, file, options = {}, oldTaskId) {
        var _a, _b, _c, _d;
        if (oldTaskId && this.tasks.has(oldTaskId)) {
            const controller = new AbortController();
            let cancelTokenSource = TOS.CancelToken.source();
            this.tasks.set(oldTaskId, {
                ...this.tasks.get(oldTaskId),
                ...options,
                abortSignal: controller.signal,
                cancelTokenSource,
            });
            return oldTaskId;
        }
        const taskId = guid();
        const controller = new AbortController();
        let cancelTokenSource = TOS.CancelToken.source();
        const task = {
            id: taskId,
            file,
            status: 'pending',
            controller,
            ...options,
            partSize: (_b = (_a = options.partSize) !== null && _a !== void 0 ? _a : this.opts.partSize) !== null && _b !== void 0 ? _b : 5 * 1024 * 1024,
            progress: options.progress || undefined,
            abortSignal: controller.signal,
            fileName,
            uploadedBytes: 0,
            totalBytes: file.size,
            rename: (_d = (_c = options.rename) !== null && _c !== void 0 ? _c : this.opts.rename) !== null && _d !== void 0 ? _d : true,
            key: null,
            cancelTokenSource,
        };
        this.tasks.set(taskId, task);
        return taskId;
    }
    async startUpload(taskId) {
        var _a, _b, _c;
        const task = this.tasks.get(taskId);
        if (!task || task.status === 'cancelled')
            return;
        task.status = 'uploading';
        try {
            await this.init();
        }
        catch (initError) {
            task.status = 'failed';
            throw initError;
        }
        try {
            const rename = (_a = task.rename) !== null && _a !== void 0 ? _a : this.opts.rename;
            let key;
            if (task.checkpoint) {
                key = task.checkpoint.key;
            }
            else {
                key = generateFilename({
                    fileName: task.fileName,
                    rename,
                    rootPath: (_b = this.opts.rootPath) !== null && _b !== void 0 ? _b : '',
                });
            }
            task.key = key;
            let checkpoint = (_c = task === null || task === void 0 ? void 0 : task.checkpoint) !== null && _c !== void 0 ? _c : undefined;
            const abortSignal = task.controller.signal;
            const result = await this.client.uploadFile({
                bucket: this.opts.bucket,
                key,
                file: task.file,
                partSize: task.partSize,
                checkpoint: checkpoint,
                progress: task.progress
                    ? (percent, checkpoint) => task.progress({ percent, ...checkpoint })
                    : undefined,
                cancelToken: task.cancelTokenSource.token
            });
            task.status = 'success';
            const response = formatResponse({
                relationPath: key,
                data: result,
                enableCdn: this.opts.enableCdn,
                cdnUrl: this.opts.cdnUrl,
                bucket: this.opts.bucket,
                endpoint: this.opts.endpoint,
            });
            return response;
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.code) === 'CancelError' || (error === null || error === void 0 ? void 0 : error.name) === 'AbortError') {
                task.status = 'cancelled';
            }
            else {
                task.status = 'failed';
            }
            throw error;
        }
    }
    pause(taskId) {
        try {
            const task = this.tasks.get(taskId);
            if (!task) {
                return;
            }
            task.cancelTokenSource.cancel();
            if (task && task.status === 'uploading') {
                task.controller.abort();
                task.status = 'paused';
            }
        }
        catch (error) {
            throw error;
        }
    }
    async cancel(key, uploadId, taskId) {
        try {
            if (taskId) {
                const task = this.tasks.get(taskId);
                if (task) {
                    task.cancelTokenSource.cancel();
                    task.controller.abort();
                    task.status = 'cancelled';
                    this.tasks.delete(taskId);
                }
            }
            await this.init();
            if (uploadId && key) {
                try {
                    await this.client.abortMultipartUpload({
                        bucket: this.opts.bucket,
                        key,
                        uploadId,
                    });
                    console.log(`✅ 已清理服务端分片上传: ${uploadId}`);
                }
                catch (err) {
                    if (err.statusCode === 404) {
                        console.warn(`⚠️ 分片上传已被清除或不存在: ${uploadId}`);
                    }
                    else {
                        console.error(`❌ 清理失败，请手动处理 uploadId: ${uploadId}`, err);
                    }
                }
            }
            else {
                console.warn(`[Task ${taskId}] 缺少 uploadId，无法清理服务端资源`);
            }
        }
        catch (error) {
            console.error('Error during cancel operation:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=client.js.map