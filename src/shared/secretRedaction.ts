const REDACTED = '[REDACTED]';

interface SecretPattern {
  name: string;
  pattern: RegExp;
}

const PATTERNS: SecretPattern[] = [
  { name: 'Short sk-style Secret', pattern: /sk-[a-zA-Z0-9_-]*/g },
  { name: 'OpenAI/Claude API Key', pattern: /sk-[a-zA-Z0-9_-]{16,}/g },
  { name: 'LocalAI Nexus Gateway Key', pattern: /lnx_\d{8}_[a-zA-Z0-9_-]+/g },
  { name: 'Bearer Token', pattern: /Bearer\s+([a-zA-Z0-9_.=:+/-]{8,})/gi },
  { name: 'Authorization Header', pattern: /authorization\s*[=:]\s*['"]?([^'"\s]{4,})['"]?/gi },
  { name: 'API Key Assignment', pattern: /api[_-]?key\s*[=:]\s*['"]?([^'"\s]{4,})['"]?/gi },
  { name: 'Password Assignment', pattern: /password\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/gi },
  { name: 'Secret Assignment', pattern: /secret\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/gi },
  { name: 'Access Token', pattern: /access[_-]?token\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/gi },
  { name: 'Refresh Token', pattern: /refresh[_-]?token\s*[=:]\s*['"]?([^'"\s]{3,})['"]?/gi },
  { name: 'Generic Token Assignment', pattern: /(?:^|[\s,{])token\s*[=:]\s*['"]?([^'"\s]{4,})['"]?/gi },
  { name: 'Generic Key/Token', pattern: /(?:private_key|client_secret|secret_key|auth_token)\s*[=:]\s*['"]?([^'"\s]{4,})['"]?/gi },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'HuggingFace Token', pattern: /hf_[a-zA-Z0-9]{25,}/g },
  { name: 'Database Connection String', pattern: /(?:mongodb|mysql|postgres|postgresql|sqlite|redis):\/\/[^:\s]+:([^@\s]+)@/gi },
];

const SENSITIVE_KEY_PATTERN =
  /(?:^|[_-])(?:api[_-]?key|authorization|bearer|token|auth[_-]?token|access[_-]?token|refresh[_-]?token|password|secret|client[_-]?secret|private[_-]?key)$/i;

export function containsSecret(text?: string | null): boolean {
  if (!text) return false;
  return PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function redactSecrets(text?: string | null): string {
  if (!text) return '';

  let result = text;
  for (const { pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match, ...args: unknown[]) => {
      const secretValue = args[0] as string | undefined;
      if (typeof secretValue === 'string' && secretValue.length > 0) {
        const groupStart = match.indexOf(secretValue);
        if (groupStart >= 0) {
          return `${match.slice(0, groupStart)}${REDACTED}${match.slice(groupStart + secretValue.length)}`;
        }
      }
      return REDACTED;
    });
  }
  return result;
}

export function detectSecretTypes(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) found.push(name);
  }
  return found;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

export function sanitizeValue<T>(value: T, seen = new WeakMap<object, unknown>(), keyHint = ''): T {
  if (typeof value === 'string') {
    return (keyHint && isSensitiveKey(keyHint) ? REDACTED : redactSecrets(value)) as T;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]' as T;
  }

  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    for (const item of value) {
      result.push(sanitizeValue(item, seen));
    }
    return result as T;
  }

  const result: Record<string, unknown> = {};
  seen.set(value as object, result);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(child, seen, key);
  }
  return result as T;
}

export function sanitizeObject<T>(obj: T): T {
  return sanitizeValue(obj);
}

export { REDACTED };
