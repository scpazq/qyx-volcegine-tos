interface GenerateFilenameParams {
    fileName?: string;
    rename?: boolean;
    rootPath: string;
}
export declare function guid(): string;
export declare function getSuffix(filename: string): string;
export declare function formatPath(path: string): string;
export declare function generateFilename({ fileName, rename, rootPath }: GenerateFilenameParams): string;
export declare function deepMerge<T extends Record<string, any>>(src?: T, target?: Record<string, any>): T;
export declare function is(val: any, type: string): boolean;
export declare function isObject(val: any): boolean;
export {};
