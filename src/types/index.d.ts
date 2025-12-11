import { UploadPart } from '@volcengine/tos-sdk-js';
// 外部提供一个函数，返回当前的认证配置（支持异步刷新）
export type CredentialsProvider = () => Promise<{
  accessKeyId: string;
  accessKeySecret: string;
  region: string; // 填写 Bucket 所在地域。
  endpoint: string; // 填写域名地址
  sessionToken?: string;
}>;

// 外部可持久化的断点状态
export interface MultipartUploadState {
  uploadId: string;
  key: string;
  bucket: string;
  uploadedParts: UploadPart[]; // 官方类型：{ PartNumber: number, ETag: string }
}

export interface UploadOptions {
  partSize?: number; // 分片大小，默认 5MB
  onProgress?: (percent: number) => void;
  resumeState?: MultipartUploadState; // 可选：用于断点续传
}

export interface ResumeUploadOptions extends UploadOptions {
  resumeState?: MultipartUploadState;
}

// 初始化配置
export interface TOSUploaderConfig {
  credentials: CredentialsProvider; // 动态获取密钥的方法
  endpoint: string;
  region: string;
  bucket: string;
}