export type ContactEnvironment = {
  port: number;
  host: string;
  apiKey?: string;
  sender?: string;
  receiver?: string;
  token?: string;
};

export function readContactEnvironment(env: NodeJS.ProcessEnv = process.env): ContactEnvironment {
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer from 0 to 65535.");
  const configuration = {
    port,
    host: env.HOST || "127.0.0.1",
    apiKey: env.RESEND_API_KEY,
    sender: env.CONTACT_SENDER_EMAIL,
    receiver: env.CONTACT_RECEIVER_EMAIL,
    token: env.CONTACT_BACKEND_TOKEN,
  };
  if (env.NODE_ENV === "production") {
    const missing = ["RESEND_API_KEY", "CONTACT_SENDER_EMAIL", "CONTACT_RECEIVER_EMAIL", "CONTACT_BACKEND_TOKEN"]
      .filter(name => !env[name]);
    if (missing.length) throw new Error(`Missing required email-server production configuration: ${missing.join(", ")}.`);
  }
  return configuration;
}
