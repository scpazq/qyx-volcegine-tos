import TOS from '@volcengine/tos-sdk';
import { generateFilename, deepMerge, guid } from './utils/util';
import { formatResponse } from './utils/format'
import { cloneDeep } from 'lodash-es'
import type { QyxVolcegineTosOptions, Task, PutObjectConfig } from './types/index';
export class QyxVolcegineTos {
  opts: QyxVolcegineTosOptions
  client: TOS | null = null;
  tasks = new Map<string, Task>();
  refreshTimer: NodeJS.Timeout | null = null;
  expiration: number | undefined;
  constructor(options: Partial<QyxVolcegineTosOptions>) {
    this.opts = cloneDeep(
      deepMerge(
        {
          async: false,
          rootPath: '',
          rename: true,
          enableCdn: false,
          requestTimeout: 120000, // HTTP 请求超时时间, 默认120s
          connectionTimeout: 10000, // 连接超时，默认10s
          cdnUrl: '',
          maxRetryCount: 5, // 重试次数,默认为3
          partSize: 5 * 1024 * 1024, // 默认分片大小 5MB
          parallel: 3, // 并发上传的分片数
          refreshSTSTokenInterval: 300000,
          config: {
              headers: {
                  'Cache-Control': 'public',
              },
          },
          getOptions: async (): Promise<{
            accessKeyId: string;
            accessKeySecret: string;
            securityToken: string;
            bucket: string;
            endpoint: string;
            region: string;
            expiration: number;
            rootPath?: string;
            cdnUrl?: string;
            enableCdn?: boolean;
          }> => {
            throw new Error('getOptions must be implemented by user');
          },
        },
        options
      )
    )
    this.expiration = options.expiration
  }

  async init(): Promise<TOS> {
    if (this.client && this.expiration && this.expiration > Date.now()) return this.client;
    const creds = await this.opts.getOptions();
    this.opts = {
      ...this.opts,
      ...creds,
      bucket: creds.bucket,
      rootPath: creds.rootPath,
      endpoint: creds.endpoint,
      cdnUrl: creds.cdnUrl,
      enableCdn: creds.enableCdn,
    } as QyxVolcegineTosOptions;
    this.client = new TOS({
      accessKeyId: creds.accessKeyId,
      accessKeySecret: creds.accessKeySecret,
      stsToken: creds.securityToken,
      endpoint: creds.endpoint,
      region: creds.region,
      maxRetryCount: 5, // 重试次数,默认为3
    });
    this.expiration = creds.expiration
    return this.client
  }

  async putObject(fileName: string, file: File, config: PutObjectConfig = {}): Promise<ReturnType<typeof formatResponse>> {
    try {
      await this.init();
      const rename = config.hasOwnProperty('rename')
                      ? config?.rename
                      : this.opts.rename
      const key = generateFilename({
          fileName,
          rename,
          rootPath: this.opts.rootPath ?? '',
      })
      const result = await this.client!.putObject({
        key,
        body: file,
        bucket: config.bucket || this.opts.bucket,
        headers: {
          'Content-Type': file.type,
          ...(this.opts.config?.headers || {}),
        }
      });
      return(
        formatResponse({
          relationPath: key,
          data: result,
          enableCdn: this.opts?.enableCdn,
          cdnUrl: this.opts?.cdnUrl,
          bucket: config.bucket || this.opts.bucket,
          endpoint: this.opts.endpoint,
        })
      )
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 添加分片上传任务
   * @param {*} file
   * @param {{}} [options={}] 
   * @returns {Sting} taskId
   */
  addMultipartUpload(fileName: string, file: File, options: Partial<Task> = {}, oldTaskId?: string) {
    if (oldTaskId && this.tasks.has(oldTaskId)) {
      const controller = new AbortController();
      let cancelTokenSource = TOS.CancelToken.source();
      this.tasks.set(oldTaskId, {
        ...this.tasks.get(oldTaskId),
        ...options,
        abortSignal: controller.signal,
        cancelTokenSource,
      } as Task)
      return oldTaskId
    }
    const taskId = guid();
    const controller = new AbortController();
    let cancelTokenSource = TOS.CancelToken.source();
    const task: Task = {
      id: taskId,
      file,
      status: 'pending', // pending, uploading, paused, success, failed, cancelled
      controller,
      ...options,
      partSize: options.partSize ?? this.opts.partSize ?? 5 * 1024 * 1024, // 默认 5MB
      progress: options.progress || null,
      abortSignal: controller.signal,
      fileName,
      // 内部状态
      uploadedBytes: 0,
      totalBytes: file.size,
      rename: options.rename ?? this.opts.rename ?? true, // 添加这个用于后续生成 key
      key: null,
      cancelTokenSource,
    };

    this.tasks.set(taskId, task);
    return taskId;
  }

  async startUpload(taskId: string): Promise<any> { 
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'cancelled') return;

    task.status = 'uploading';

    await this.init();

    try {
      const rename = task.rename ?? this.opts.rename;
      let key
      if (task.checkpoint) {
        key = task.checkpoint.key
      } else {
        key = generateFilename({
          fileName: task.fileName,
          rename,
          rootPath: this.opts.rootPath?? '',
        })
      }

      task.key = key; // 记录 key
      let checkpoint: any | undefined = task?.checkpoint ?? undefined;

      const abortSignal = task.controller.signal;
      // 使用 uploadFile（支持断点续传 + 并发）
      const result = await this.client!.uploadFile({
        bucket: this.opts.bucket,
        key,
        file: task.file,
        partSize: task.partSize,
        checkpoint: checkpoint as any | undefined, // 恢复点
        progress: task.sprogress,
        // signal: abortSignal, // 支持 AbortController 暂停/取消
        cancelToken: task.cancelTokenSource.token
      });

      // 成功完成
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
    } catch (error) {
      throw error;
    }
  }

  pause(taskId: string): void {
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

  async cancel(key: string | undefined, uploadId: string | undefined, taskId?: string): Promise<void> {
    if (taskId) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.cancelTokenSource.cancel()
        task.controller.abort();
        task.status = 'cancelled';
        this.tasks.delete(taskId);
      }
    }
    
    // 1. 中断当前上传（触发 CancelError）
    await this.init();
    if (uploadId && key) {
      try {
        await this.client!.abortMultipartUpload({
          bucket: this.opts.bucket,
          key,
          uploadId,
        });
        console.log(`✅ 已清理服务端分片上传: ${uploadId}`);
      } catch (err: any) {
        if (err.statusCode === 404) {
          console.warn(`⚠️ 分片上传已被清除或不存在: ${uploadId}`);
        } else {
          console.error(`❌ 清理失败，请手动处理 uploadId: ${uploadId}`, err);
        }
      }
    } else {
      console.warn(`[Task ${taskId}] 缺少 uploadId，无法清理服务端资源`);
    }    
  }
}