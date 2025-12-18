import TOS from '@volcengine/tos-sdk';
import { formatResponse } from './utils/format';
import type { QyxVolcegineTosOptions, Task, PutObjectConfig } from './types/index';
export declare class QyxVolcegineTos {
    opts: QyxVolcegineTosOptions;
    client: TOS | null;
    tasks: Map<string, Task>;
    refreshTimer: NodeJS.Timeout | null;
    expiration: number | undefined;
    constructor(options: Partial<QyxVolcegineTosOptions>);
    init(): Promise<TOS>;
    putObject(fileName: string, file: File, config?: PutObjectConfig): Promise<ReturnType<typeof formatResponse>>;
    addMultipartUpload(fileName: string, file: File, options?: Partial<Task>, oldTaskId?: string): string;
    startUpload(taskId: string): Promise<any>;
    pause(taskId: string): void;
    cancel(key: string | undefined, uploadId: string | undefined, taskId?: string): Promise<void>;
}
