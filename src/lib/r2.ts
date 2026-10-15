import { DOMParser, Node } from '@xmldom/xmldom';

// Ensure DOMParser and Node are available globally in all Node environments for AWS SDK XML parsing
if (typeof (globalThis as any).DOMParser === 'undefined') {
  (globalThis as any).DOMParser = DOMParser;
}
if (typeof (globalThis as any).Node === 'undefined') {
  (globalThis as any).Node = Node;
}

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { R2Config } from '../types.ts';

let cachedS3Client: S3Client | null = null;
let cachedKey = '';

export function getR2Client(config?: Partial<R2Config>): S3Client | null {
  const accountId = config?.accountId || (typeof process !== 'undefined' ? process.env?.R2_ACCOUNT_ID : undefined);
  const accessKeyId = config?.accessKeyId || (typeof process !== 'undefined' ? process.env?.R2_ACCESS_KEY_ID : undefined);
  const secretAccessKey = config?.secretAccessKey || (typeof process !== 'undefined' ? process.env?.R2_SECRET_ACCESS_KEY : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const key = `${accountId}::${accessKeyId}`;
  if (cachedS3Client && cachedKey === key) {
    return cachedS3Client;
  }

  try {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    cachedKey = key;
    return cachedS3Client;
  } catch (err) {
    console.error('Failed to initialize Cloudflare R2 client:', err);
    return null;
  }
}

export function getR2BucketName(config?: Partial<R2Config>): string | null {
  return config?.bucketName || (typeof process !== 'undefined' ? process.env?.R2_BUCKET_NAME : undefined) || null;
}

/**
 * Returns the public URL for an R2 object key.
 * If a custom public domain is configured, it prepends the domain (e.g. https://cdn.domain.com/key).
 * If NO public domain is configured, it falls back to the internal proxy endpoint (/api/r2/file/key).
 * NEVER defaults to bucket.r2.dev which is inactive by default in Cloudflare.
 */
export function getR2ObjectUrl(key: string, publicDomain?: string | null): string {
  const cleanKey = key.replace(/^\/+/, '');
  const domain = (publicDomain || (typeof process !== 'undefined' ? process.env?.R2_PUBLIC_DOMAIN : ''))
    ?.trim()
    .replace(/\/+$/, '');

  if (domain) {
    return `${domain}/${cleanKey}`;
  }

  // Fallback endpoint to serve file through API
  return `/api/r2/file/${cleanKey}`;
}

/**
 * Normalizes an existing URL (e.g. previously saved with .r2.dev or relative path)
 * to use the custom public domain if present, or fallback /api/r2/file/:key if not.
 */
export function resolveFileUrl(url: string | null | undefined, publicDomain?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) return trimmed;

  // Check if it's an r2.dev domain (e.g. https://my-bucket.r2.dev/branding/logo.png)
  const r2DevMatch = trimmed.match(/^https?:\/\/[^/]+\.r2\.dev\/(.+)$/i);
  if (r2DevMatch) {
    const key = r2DevMatch[1];
    return getR2ObjectUrl(key, publicDomain);
  }

  // Check if it's already an API fallback (/api/r2/file/key or /api/r2/object/key)
  const apiFileMatch = trimmed.match(/^\/api\/r2\/(?:file|object)\/(.+)$/i);
  if (apiFileMatch) {
    const key = apiFileMatch[1];
    return getR2ObjectUrl(key, publicDomain);
  }

  // If public domain is configured and the url is a relative key
  if (publicDomain && publicDomain.trim() && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const cleanKey = trimmed.replace(/^\/+/, '');
    return `${publicDomain.trim().replace(/\/+$/, '')}/${cleanKey}`;
  }

  return trimmed;
}

export function getContentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html; charset=utf-8';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'css':
      return 'text/css; charset=utf-8';
    case 'js':
    case 'mjs':
      return 'application/javascript; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function uploadTemplateToR2(
  s3: S3Client,
  bucketName: string,
  key: string,
  content: string | Uint8Array,
  publicDomain?: string,
  contentType = 'text/html; charset=utf-8'
): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3.send(command);

    const publicUrl = getR2ObjectUrl(key, publicDomain);

    return {
      success: true,
      key,
      url: publicUrl,
    };
  } catch (err: any) {
    console.error('Failed to upload template to Cloudflare R2:', err);
    return {
      success: false,
      key,
      url: '',
      error: err?.message || 'R2 upload failed',
    };
  }
}

export async function getObjectFromR2(
  s3: S3Client,
  bucketName: string,
  key: string
): Promise<{
  success: boolean;
  data?: Uint8Array;
  contentType?: string;
  cacheControl?: string;
  error?: string;
}> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await s3.send(command);
    if (!response.Body) {
      return { success: false, error: 'Empty response body from R2' };
    }
    const byteArray = await response.Body.transformToByteArray();
    return {
      success: true,
      data: byteArray,
      contentType: response.ContentType || getContentTypeFromKey(key),
      cacheControl: response.CacheControl || 'public, max-age=86400',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to retrieve object from Cloudflare R2',
    };
  }
}

export async function listR2Objects(
  s3: S3Client,
  bucketName: string,
  prefix = '',
  maxKeys = 50,
  publicDomain?: string
): Promise<{
  success: boolean;
  files?: Array<{ key: string; size: number; lastModified?: string; url: string }>;
  error?: string;
}> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });
    const response = await s3.send(command);
    const files = (response.Contents || []).map((obj) => {
      const key = obj.Key || '';
      return {
        key,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString(),
        url: getR2ObjectUrl(key, publicDomain),
      };
    });
    return { success: true, files };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list R2 objects' };
  }
}

export async function deleteTemplateFromR2(
  s3: S3Client,
  bucketName: string,
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3.send(command);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete object from Cloudflare R2:', err);
    return { success: false, error: err?.message || 'R2 delete failed' };
  }
}

export async function testR2Connection(
  s3: S3Client,
  bucketName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1,
    });
    await s3.send(listCmd);

    return {
      success: true,
      message: `Successfully connected to Cloudflare R2 bucket: "${bucketName}".`,
    };
  } catch (err: any) {
    let msg = err?.message || 'Failed to verify Cloudflare R2 bucket access.';
    if (err?.name && err.name !== 'Error' && !msg.includes(err.name)) {
      msg = `${err.name}: ${msg}`;
    }
    // Remove internal AWS SDK hint suffix if present
    msg = msg.replace(/\n\s*Deserialization error:.*/gi, '').trim();
    return {
      success: false,
      message: msg,
    };
  }
}

// Native Cloudflare Pages R2 bucket binding support (env.BUCKET or env.R2_BUCKET)
export async function uploadNativeR2(
  bucket: any,
  key: string,
  content: string | Uint8Array,
  publicDomain?: string,
  contentType = 'text/html; charset=utf-8'
): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  try {
    await bucket.put(key, content, {
      httpMetadata: { contentType },
    });
    const url = getR2ObjectUrl(key, publicDomain);
    return { success: true, key, url };
  } catch (err: any) {
    return { success: false, key, url: '', error: err?.message || 'Native R2 upload failed' };
  }
}

export async function getObjectNativeR2(
  bucket: any,
  key: string
): Promise<{
  success: boolean;
  data?: Uint8Array;
  contentType?: string;
  cacheControl?: string;
  error?: string;
}> {
  try {
    const object = await bucket.get(key);
    if (!object) {
      return { success: false, error: 'Object not found in native Cloudflare R2 bucket' };
    }
    const arrayBuffer = await object.arrayBuffer();
    return {
      success: true,
      data: new Uint8Array(arrayBuffer),
      contentType: object.httpMetadata?.contentType || getContentTypeFromKey(key),
      cacheControl: object.httpMetadata?.cacheControl || 'public, max-age=86400',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to get native R2 object' };
  }
}

export async function listNativeR2Objects(
  bucket: any,
  prefix = '',
  maxKeys = 50,
  publicDomain?: string
): Promise<{
  success: boolean;
  files?: Array<{ key: string; size: number; lastModified?: string; url: string }>;
  error?: string;
}> {
  try {
    const listing = await bucket.list({ prefix, limit: maxKeys });
    const files = (listing.objects || []).map((obj: any) => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded ? new Date(obj.uploaded).toISOString() : undefined,
      url: getR2ObjectUrl(obj.key, publicDomain),
    }));
    return { success: true, files };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to list native R2 objects' };
  }
}

export async function deleteNativeR2(bucket: any, key: string): Promise<boolean> {
  try {
    await bucket.delete(key);
    return true;
  } catch {
    return false;
  }
}

export async function testNativeR2(bucket: any): Promise<{ success: boolean; message: string }> {
  try {
    await bucket.list({ limit: 1 });
    return { success: true, message: 'Successfully connected via Cloudflare Native R2 Binding.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Native R2 test failed.' };
  }
}
