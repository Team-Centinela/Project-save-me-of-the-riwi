// infrastructure/storage/local-storage-adapter.spec.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LocalStorageAdapter,
  LocalStoragePermissionError,
  LocalStorageQuotaError,
  LocalStorageUnavailableError,
} from './local-storage-adapter';

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when storage is available', () => {
    let adapter: LocalStorageAdapter;

    beforeEach(() => {
      adapter = new LocalStorageAdapter();
    });

    it('returns `absent` for a missing key', () => {
      expect(adapter.read('missing')).toEqual({ kind: 'absent' });
    });

    it('returns `present` with the stored value', () => {
      window.localStorage.setItem('k', 'hello');
      expect(adapter.read('k')).toEqual({ kind: 'present', value: 'hello' });
    });

    it('writes a value', () => {
      adapter.write('k', 'value');
      expect(window.localStorage.getItem('k')).toBe('value');
    });

    it('removes a value when an empty string is written', () => {
      window.localStorage.setItem('k', 'value');
      adapter.write('k', '');
      expect(window.localStorage.getItem('k')).toBeNull();
    });

    it('removes a value when remove is called', () => {
      window.localStorage.setItem('k', 'value');
      adapter.remove('k');
      expect(window.localStorage.getItem('k')).toBeNull();
    });

    it('is idempotent on remove of a missing key', () => {
      expect(() => {
        adapter.remove('missing');
      }).not.toThrow();
    });

    it('throws LocalStoragePermissionError when the underlying call throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(() => {
        adapter.read('k');
      }).toThrow(LocalStoragePermissionError);
      spy.mockRestore();
    });

    it('throws LocalStorageQuotaError on a quota-exceeded write', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      });
      expect(() => {
        adapter.write('k', 'v');
      }).toThrow(LocalStorageQuotaError);
      spy.mockRestore();
    });
  });

  describe('when storage is not available', () => {
    it('throws LocalStorageUnavailableError on read', () => {
      const adapter = new LocalStorageAdapter(false);
      expect(() => {
        adapter.read('k');
      }).toThrow(LocalStorageUnavailableError);
    });

    it('throws LocalStorageUnavailableError on write', () => {
      const adapter = new LocalStorageAdapter(false);
      expect(() => {
        adapter.write('k', 'v');
      }).toThrow(LocalStorageUnavailableError);
    });

    it('throws LocalStorageUnavailableError on remove', () => {
      const adapter = new LocalStorageAdapter(false);
      expect(() => {
        adapter.remove('k');
      }).toThrow(LocalStorageUnavailableError);
    });
  });
});
