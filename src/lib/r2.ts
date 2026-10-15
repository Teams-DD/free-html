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

    let publicUrl = '';
    const domain = publicDomain || (typeof process !== 'undefined' ? process.env?.R2_PUBLIC_DOMAIN : '');
    if (domain) {
      const cleanDomain = domain.replace(/\/+$/, '');
      publicUrl = `${cleanDomain}/${key}`;
    } else {
      publicUrl = `https://${bucketName}.r2.dev/${key}`;
    }

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
    const domain = publicDomain?.replace(/\/+$/, '') || '';
    const url = domain ? `${domain}/${key}` : `/${key}`;
    return { success: true, key, url };
  } catch (err: any) {
    return { success: false, key, url: '', error: err?.message || 'Native R2 upload failed' };
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
