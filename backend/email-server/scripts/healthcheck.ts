const port = Number(process.env.PORT || 3001);
const host = process.env.HEALTHCHECK_HOST || "127.0.0.1";
const response = await fetch(`http://${host}:${port}/health`).catch(() => null);
if (!response?.ok) process.exit(1);

export {};
