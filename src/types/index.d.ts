import type TOS from '@volcengine/tos-sdk';

export interface Credentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken?: string;
  sessionToken?: string;
  endpoint: string;
  region: string;
  bucket?: string;
  rootPath?: string;
  cdnUrl?: string;
  enableCdn?: boolean;
  expiration?: number;
}


export interface UploadProgress {
  percent: number; // Add this line
  [key: string]: any; // Optional: allow additional properties
}


export interface QyxVolcegineTosConfig {
  headers?: Record<string, string>;
}
// In your types/index.ts or relevant type declaration file
export interface QyxVolcegineTosOptions {
  async?: boolean;
  rootPath?: string;
  rename?: boolean;
  enableCdn?: boolean;
  requestTimeout?: number;
  connectionTimeout?: number;
  cdnUrl?: string;
  maxRetryCount?: number;
  partSize?: number;
  parallel?: number;
  refreshSTSTokenInterval?: number;
  config?: {
    headers?: Record<string, string>;
  };
  getOptions: () => Promise<{
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
  }>;
  bucket?: string;
  endpoint?: string;
  expiration?: number;
  region?: string;
}
export interface Task {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'paused' | 'success' | 'failed' | 'cancelled';
  controller: AbortController;
  partSize: number;
  progress?: ((progress: UploadProgress) => void) | null | undefined;
  abortSignal: AbortSignal;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  rename: boolean;
  key: string | null;
  cancelTokenSource: ReturnType<typeof TOS.CancelToken.source>;
  checkpoint?: Checkpoint;
  [key: string]: any;
}

export interface PutObjectConfig {
  rename?: boolean;
  bucket?: string;
}
