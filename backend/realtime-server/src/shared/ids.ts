import { createHash, randomBytes, randomUUID } from "node:crypto";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export const id = (prefix: string) => `${prefix}-${randomUUID()}`;
export const stringValue = (value: unknown) => typeof value === "string" ? value.trim() : "";
export const emailValue = (value: unknown) => stringValue(value).toLowerCase();
