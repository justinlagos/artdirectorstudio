import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize user input for display (strips all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
  const sanitized = DOMPurify.sanitize(url, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  // Only allow http(s) and relative URLs
  if (sanitized.match(/^(https?:\/\/|\/)/)) {
    return sanitized;
  }
  
  return '#';
}

/**
 * Sanitize JSON string to prevent XSS in JSON payloads
 */
export function sanitizeJson<T>(jsonString: string): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    const sanitized = JSON.parse(
      DOMPurify.sanitize(JSON.stringify(parsed), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
    );
    return sanitized;
  } catch (e) {
    console.error('Failed to sanitize JSON:', e);
    return null;
  }
}

/**
 * Configure DOMPurify with custom hooks
 */
export function configureDOMPurify() {
  // Add hook to enforce rel="noopener noreferrer" on external links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      if (href && href.startsWith('http')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

// Initialize DOMPurify configuration
configureDOMPurify();
