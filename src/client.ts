import { TOS } from '@volcengine/tos-sdk-js';
import { Readable } from 'stream';
import { TOSUploaderConfig, UploadOptions, MultipartUploadState } from './types';
import { generateFilename } from './utils/util';
export class QyxVolcegineTos {
  private config: TOSUploaderConfig;
  private opts: {
    rename: boolean;
    rootPath: string;
  };
  constructor(config: TOSUploaderConfig) {
    this.config = config;
    this.opts = {
      rename: true,
      rootPath: ''
    }
  }

  private async init() {
    const creds = await this.config.credentials();
    return new TOS({
      accessKeyId: creds.accessKeyId,
      accessKeySecret: creds.accessKeySecret,
      sessionToken: creds.securityToken, // 临时密钥支持
      endpoint: this.config.endpoint,
      region: this.config.region,
    });
  }

  async putObject(fileName: string, data: any, config: any = {}) {
    return new Promise((resolve, reject) => async () => {
      try {
        const client = await this.init();
        const rename = config.hasOwnProperty('rename')
                        ? config?.rename
                        : this.opts.rename
        const key = generateFilename({
            fileName,
            rename,
            rootPath: this.opts.rootPath,
        })
        const result = await client.putObject({
          key,
          ...data,
          bucket: this.config.bucket,
        });
        resolve(
          {
            code: result.statusCode,
            data: result.data
          }
        )
      } catch (error) {
        reject(error);
      }
    })
  }
  /**
   * 删除对象
   */
  async deleteObject(key: string) {
    const client = await this.init();
    await client.deleteObject({ Key: key });
  }

  /**
   * 分片上传（支持断点续传）
   */
  async multipartUpload(
    fileName: string,
    stream: Readable,
    options: UploadOptions = {}
  ): Promise<MultipartUploadState> {
    return new Promise(async (resolve, reject) => {
      try {
        const { partSize = 5 * 1024 * 1024, onProgress, resumeState } = options;
        let uploadId: string;
        let uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];

        const client = await this.init();
        
        const rename = options.hasOwnProperty('rename') 
                        ? options?.rename 
                        : this.opts.rename;
        const key = generateFilename({
          filename: fileName,
          rename,
          rootPath: this.opts.rootPath,
        });

        // 恢复上传？
        if (resumeState) {
          if (resumeState.key !== key) throw new Error('Resume state key mismatch');
          uploadId = resumeState.uploadId;
          uploadedParts = [...resumeState.uploadedParts];
        } else {
          // 初始化上传
          const res = await client.createMultipartUpload({ 
            Bucket: this.config.bucket,
            Key: key 
          });
          uploadId = res.UploadId!;
        }

        // 读取整个流（生产环境建议流式或并发处理）
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const totalSize = buffer.length;

        let start = uploadedParts.length > 0
          ? uploadedParts[uploadedParts.length - 1].PartNumber * partSize
          : 0;

        while (start < totalSize) {
          const partNumber = Math.floor(start / partSize) + 1;

          // 跳过已上传分片
          if (uploadedParts.some(p => p.PartNumber === partNumber)) {
            start += partSize;
            onProgress?.(Math.min(1, start / totalSize));
            continue;
          }

          const chunk = buffer.slice(start, start + partSize);

          try {
            const res = await client.uploadPart({
              Bucket: this.config.bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: chunk
            });

            uploadedParts.push({
              PartNumber: partNumber,
              ETag: res.ETag!
            });

            uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

            start += partSize;
            onProgress?.(Math.min(1, start / totalSize));
          } catch (err: any) {
            // 上传失败时返回当前状态，供外部保存用于恢复
            const state: MultipartUploadState = {
              uploadId,
              key,
              bucket: this.config.bucket,
              uploadedParts: [...uploadedParts]
            };
            throw Object.assign(new Error(`Upload failed at part ${partNumber}: ${err.message}`), {
              code: 'UPLOAD_PAUSED',
              state
            });
          }
        }

        // 完成上传
        const result = await client.completeMultipartUpload({
          Bucket: this.config.bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: uploadedParts }
        });

        // 成功后返回最终状态（可用于清理外部存储）
        resolve({
          uploadId,
          key,
          bucket: this.config.bucket,
          uploadedParts,
          data: result
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}