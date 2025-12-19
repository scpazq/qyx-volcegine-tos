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
        try {
            await this.init();
            const rename = config.hasOwnProperty('rename')
                ? config?.rename
                : this.opts.rename;
            const key = generateFilename({
                fileName,
                rename,
                rootPath: this.opts.rootPath ?? '',
            });
            const result = await this.client.putObject({
                key,
                body: file,
                bucket: config.bucket || this.opts.bucket,
                headers: {
                    'Content-Type': file.type,
                    ...(this.opts.config?.headers || {}),
                }
            });
            return (formatResponse({
                relationPath: key,
                data: result,
                enableCdn: this.opts?.enableCdn,
                cdnUrl: this.opts?.cdnUrl,
                bucket: config.bucket || this.opts.bucket,
                endpoint: this.opts.endpoint,
            }));
        }
        catch (error) {
            throw error;
        }
    }
    addMultipartUpload(fileName, file, options = {}, oldTaskId) {
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
            partSize: options.partSize ?? this.opts.partSize ?? 5 * 1024 * 1024,
            progress: options.progress || null,
            abortSignal: controller.signal,
            fileName,
            uploadedBytes: 0,
            totalBytes: file.size,
            rename: options.rename ?? this.opts.rename ?? true,
            key: null,
            cancelTokenSource,
        };
        this.tasks.set(taskId, task);
        return taskId;
    }
    async startUpload(taskId) {
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
            const rename = task.rename ?? this.opts.rename;
            let key;
            if (task.checkpoint) {
                key = task.checkpoint.key;
            }
            else {
                key = generateFilename({
                    fileName: task.fileName,
                    rename,
                    rootPath: this.opts.rootPath ?? '',
                });
            }
            task.key = key;
            let checkpoint = task?.checkpoint ?? undefined;
            const abortSignal = task.controller.signal;
            const result = await this.client.uploadFile({
                bucket: this.opts.bucket,
                key,
                file: task.file,
                partSize: task.partSize,
                checkpoint: checkpoint,
                progress: task.sprogress,
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
            if (error?.code === 'CancelError' || error?.name === 'AbortError') {
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