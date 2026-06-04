interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export const logger = {
  error(message: string, metadata?: LogMetadata): void {
    console.error(JSON.stringify({ level: "error", message, ...metadata }));
  },
  warn(message: string, metadata?: LogMetadata): void {
    console.warn(JSON.stringify({ level: "warn", message, ...metadata }));
  },
};
