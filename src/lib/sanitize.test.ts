import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, sanitizeUrl, sanitizeJson } from './sanitize';

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeHtml(input);
      expect(output).toContain('<p>');
      expect(output).toContain('<strong>');
      expect(output).toContain('Hello');
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert');
      expect(output).toContain('Hello');
    });

    it('should remove onclick handlers', () => {
      const input = '<p onclick="alert(\'XSS\')">Click me</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onclick');
      expect(output).toContain('Click me');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('javascript:');
    });

    it('should allow safe links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('href="https://example.com"');
      expect(output).toContain('Link');
    });
  });

  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeText(input);
      expect(output).not.toContain('<p>');
      expect(output).not.toContain('<strong>');
      expect(output).toContain('Hello');
      expect(output).toContain('world');
    });

    it('should remove script tags and content', () => {
      const input = 'Hello<script>alert("XSS")</script>World';
      const output = sanitizeText(input);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow https URLs', () => {
      const input = 'https://example.com';
      const output = sanitizeUrl(input);
      expect(output).toBe('https://example.com');
    });

    it('should allow http URLs', () => {
      const input = 'http://example.com';
      const output = sanitizeUrl(input);
      expect(output).toBe('http://example.com');
    });

    it('should allow relative URLs', () => {
      const input = '/path/to/page';
      const output = sanitizeUrl(input);
      expect(output).toBe('/path/to/page');
    });

    it('should block javascript: URLs', () => {
      const input = 'javascript:alert("XSS")';
      const output = sanitizeUrl(input);
      expect(output).toBe('#');
    });

    it('should block data: URLs', () => {
      const input = 'data:text/html,<script>alert("XSS")</script>';
      const output = sanitizeUrl(input);
      expect(output).toBe('#');
    });
  });

  describe('sanitizeJson', () => {
    it('should parse and sanitize valid JSON', () => {
      const input = '{"name": "John", "age": 30}';
      const output = sanitizeJson<{ name: string; age: number }>(input);
      expect(output).toEqual({ name: 'John', age: 30 });
    });

    it('should remove HTML from JSON strings', () => {
      const input = '{"name": "<script>alert(\\"XSS\\")</script>John"}';
      const output = sanitizeJson<{ name: string }>(input);
      expect(output?.name).not.toContain('<script>');
    });

    it('should return null for invalid JSON', () => {
      const input = 'invalid json';
      const output = sanitizeJson(input);
      expect(output).toBeNull();
    });

    it('should handle nested objects', () => {
      const input = '{"user": {"name": "John", "email": "john@example.com"}}';
      const output = sanitizeJson<{ user: { name: string; email: string } }>(input);
      expect(output?.user.name).toBe('John');
      expect(output?.user.email).toBe('john@example.com');
    });
  });
});
