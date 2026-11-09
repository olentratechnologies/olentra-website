export type ContactLogger = {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
};

function write(level: string, message: string, fields?: Record<string, unknown>) {
  const payload = { level, service: "email-server", message, ...(fields || {}) };
  console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](JSON.stringify(payload));
}

export const logger: ContactLogger = {
  info: (message, fields) => write("info", message, fields),
  warn: (message, fields) => write("warn", message, fields),
  error: (message, fields) => write("error", message, fields),
};
