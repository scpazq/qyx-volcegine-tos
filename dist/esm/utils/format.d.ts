interface FormatResponseParams {
    data: any;
    enableCdn?: boolean;
    cdnUrl?: string;
    relationPath?: string;
    bucket?: string;
    endpoint?: string;
    uploadId?: string;
    key?: string;
}
interface FormatResponseResult {
    code: number;
    data: {
        url: string;
        suffix: string;
        meta: any;
        uploadId?: string;
    };
}
interface GenerateUrlParams {
    url: string;
    cdnUrl?: string;
}
export declare function formatResponse({ data, enableCdn, cdnUrl, relationPath, bucket, endpoint, uploadId }: FormatResponseParams): FormatResponseResult;
export declare function generateUrl({ url, cdnUrl }: GenerateUrlParams): string;
export declare function formatPath(path: string): string;
export {};
