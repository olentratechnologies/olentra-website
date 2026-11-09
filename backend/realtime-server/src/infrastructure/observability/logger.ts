type LogFields = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const SECRET_KEYS = /token|secret|password|authorization|cookie|api[-_]?key|access/i;

function safe(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEYS.test(key) ? REDACTED : safe(item)]));
  return value;
}

function write(level: "info" | "warn" | "error", message: string, fields: LogFields = {}) {
  const payload = { level, service: "realtime-server", message, ...safe(fields) as LogFields };
  console[level](JSON.stringify(payload));
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
