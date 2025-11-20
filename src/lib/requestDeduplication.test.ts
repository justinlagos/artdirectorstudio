import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deduplicate,
  createRequestKey,
  clearAllPendingRequests,
  getDeduplicationState,
} from './requestDeduplication';

describe('requestDeduplication', () => {
  beforeEach(() => {
    clearAllPendingRequests();
  });

  describe('deduplicate', () => {
    it('should execute function once for concurrent calls', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      
      const [result1, result2, result3] = await Promise.all([
        deduplicate('test-key', mockFn),
        deduplicate('test-key', mockFn),
        deduplicate('test-key', mockFn),
      ]);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(result3).toBe('result');
    });

    it('should execute function again after TTL expires', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const ttl = 100;

      await deduplicate('test-key', mockFn, ttl);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50));

      await deduplicate('test-key', mockFn, ttl);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle different keys independently', async () => {
      const mockFn1 = vi.fn().mockResolvedValue('result1');
      const mockFn2 = vi.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        deduplicate('key1', mockFn1),
        deduplicate('key2', mockFn2),
      ]);

      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should handle errors correctly', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(deduplicate('test-key', mockFn)).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should clean up after completion', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const ttl = 100;

      await deduplicate('test-key', mockFn, ttl);
      
      const stateBefore = getDeduplicationState();
      expect(stateBefore.keys).toContain('test-key');

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, ttl + 50));

      const stateAfter = getDeduplicationState();
      expect(stateAfter.keys).not.toContain('test-key');
    });
  });

  describe('createRequestKey', () => {
    it('should create stable key from primitives', () => {
      const key1 = createRequestKey('generate', 123, true);
      const key2 = createRequestKey('generate', 123, true);
      expect(key1).toBe(key2);
    });

    it('should create stable key from objects', () => {
      const key1 = createRequestKey('generate', { prompt: 'test', size: 1024 });
      const key2 = createRequestKey('generate', { prompt: 'test', size: 1024 });
      expect(key1).toBe(key2);
    });

    it('should create different keys for different values', () => {
      const key1 = createRequestKey('generate', 'prompt1');
      const key2 = createRequestKey('generate', 'prompt2');
      expect(key1).not.toBe(key2);
    });

    it('should handle mixed types', () => {
      const key = createRequestKey('action', 123, true, { nested: 'value' });
      expect(key).toContain('action');
      expect(key).toContain('123');
      expect(key).toContain('true');
      expect(key).toContain('nested');
    });
  });

  describe('clearAllPendingRequests', () => {
    it('should clear all pending requests', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      deduplicate('key1', mockFn);
      deduplicate('key2', mockFn);

      const stateBefore = getDeduplicationState();
      expect(stateBefore.activeCount).toBeGreaterThan(0);

      clearAllPendingRequests();

      const stateAfter = getDeduplicationState();
      expect(stateAfter.activeCount).toBe(0);
      expect(stateAfter.keys).toEqual([]);
    });
  });

  describe('getDeduplicationState', () => {
    it('should return current state', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      deduplicate('key1', mockFn);
      deduplicate('key2', mockFn);

      const state = getDeduplicationState();
      expect(state.activeCount).toBe(2);
      expect(state.keys).toContain('key1');
      expect(state.keys).toContain('key2');
    });
  });
});
