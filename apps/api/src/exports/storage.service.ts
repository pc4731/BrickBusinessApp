import { Readable } from 'node:stream';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AppConfig } from '../config/configuration';

/**
 * S3-compatible object storage for generated documents (Cloudflare R2 by
 * default). Vercel's filesystem is ephemeral, so PDFs must live in object
 * storage rather than on local disk. Keys are namespaced by orgId.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: S3Client;
  private bucket!: string;
  private publicUrl!: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    const s = this.config.get('storage', { infer: true });
    this.bucket = s.bucket;
    this.publicUrl = s.publicUrl;
    if (!s.accessKeyId || !s.secretAccessKey || !s.endpoint) {
      this.logger.warn(
        'S3 storage is not fully configured (S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY). Document generation will fail until set.',
      );
    }
    this.client = new S3Client({
      region: s.region,
      endpoint: s.endpoint || undefined,
      // R2 and most S3-compatible providers require path-style addressing.
      forcePathStyle: true,
      credentials: {
        accessKeyId: s.accessKeyId,
        secretAccessKey: s.secretAccessKey,
      },
    });
  }

  /** Uploads a buffer under <orgId>/<filename>; returns the object key. */
  async save(orgId: string, filename: string, data: Buffer): Promise<string> {
    const key = `${orgId}/${filename}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      }),
    );
    return key;
  }

  /** Streams an object's body for proxied downloads (same-origin, no CORS). */
  async stream(key: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return res.Body as Readable;
  }

  /** A time-limited download URL, or a public/CDN URL when configured. */
  async signedUrl(key: string, expiresIn = 300): Promise<string> {
    if (this.publicUrl) return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }
}
