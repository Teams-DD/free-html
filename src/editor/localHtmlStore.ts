export interface LocalHtmlRecord {
  schemaVersion: 1;
  slug: string;
  html: string;
  savedAt: string;
}

export type LocalHtmlReadResult =
  | { kind: 'missing' }
  | { kind: 'valid'; record: LocalHtmlRecord }
  | { kind: 'error'; reason: 'corrupt' | 'unavailable' };

export type LocalHtmlWriteResult =
  | { kind: 'saved'; record: LocalHtmlRecord }
  | { kind: 'error'; reason: 'unavailable' | 'quota' };

const STORAGE_PREFIX = 'free-html:editor:v1:';

export class LocalHtmlStore {
  private readonly getStorage: () => Storage;

  constructor(getStorage: () => Storage = () => window.localStorage) {
    this.getStorage = getStorage;
  }

  private keyFor(slug: string) {
    return `${STORAGE_PREFIX}${encodeURIComponent(slug)}`;
  }

  read(slug: string): LocalHtmlReadResult {
    let serialized: string | null;
    try {
      serialized = this.getStorage().getItem(this.keyFor(slug));
    } catch {
      return { kind: 'error', reason: 'unavailable' };
    }
    if (serialized === null) return { kind: 'missing' };

    try {
      const value: unknown = JSON.parse(serialized);
      if (!value || typeof value !== 'object') return { kind: 'error', reason: 'corrupt' };
      const record = value as Partial<LocalHtmlRecord>;
      if (record.schemaVersion !== 1 || record.slug !== slug || typeof record.html !== 'string' || typeof record.savedAt !== 'string') {
        return { kind: 'error', reason: 'corrupt' };
      }
      return { kind: 'valid', record: record as LocalHtmlRecord };
    } catch {
      return { kind: 'error', reason: 'corrupt' };
    }
  }

  write(slug: string, html: string): LocalHtmlWriteResult {
    const record: LocalHtmlRecord = {
      schemaVersion: 1,
      slug,
      html,
      savedAt: new Date().toISOString(),
    };
    try {
      this.getStorage().setItem(this.keyFor(slug), JSON.stringify(record));
      return { kind: 'saved', record };
    } catch (error) {
      return {
        kind: 'error',
        reason: error instanceof Error && error.name === 'QuotaExceededError' ? 'quota' : 'unavailable',
      };
    }
  }

  remove(slug: string): boolean {
    try {
      this.getStorage().removeItem(this.keyFor(slug));
      return true;
    } catch {
      return false;
    }
  }
}