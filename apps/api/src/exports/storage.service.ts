import { createReadStream, existsSync, mkdirSync, type ReadStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';

/**
 * Local-disk file storage for generated documents. The path is configurable via
 * UPLOADS_DIR; swap this implementation for S3 in production without touching
 * callers (same write/stream interface).
 */
@Injectable()
export class StorageService {
  private readonly root = resolve(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'));

  private ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /** Writes a buffer under <root>/<orgId>/<filename>; returns a relative URL key. */
  async save(orgId: string, filename: string, data: Buffer): Promise<string> {
    const dir = join(this.root, orgId);
    this.ensureDir(dir);
    await writeFile(join(dir, filename), data);
    return `${orgId}/${filename}`;
  }

  absolutePath(urlKey: string): string {
    return join(this.root, urlKey);
  }

  exists(urlKey: string): boolean {
    return existsSync(this.absolutePath(urlKey));
  }

  stream(urlKey: string): ReadStream {
    return createReadStream(this.absolutePath(urlKey));
  }
}
