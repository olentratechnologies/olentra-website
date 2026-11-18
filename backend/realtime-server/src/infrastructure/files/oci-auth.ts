import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { SimpleAuthenticationDetailsProvider, Region } from "oci-common";

/** API signing credentials supplied by the backend environment, without a CLI session. */
export function createApiKeyProvider(env: NodeJS.ProcessEnv = process.env) {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Set ${name} when OCI_AUTH_MODE=api_key.`);
    return value;
  };
  const tenancy = required("OCI_TENANCY_OCID");
  const user = required("OCI_USER_OCID");
  const fingerprint = required("OCI_FINGERPRINT");
  const region = required("OCI_STORAGE_REGION");
  if (env.OCI_PRIVATE_KEY && env.OCI_PRIVATE_KEY_FILE) {
    throw new Error("Set only one of OCI_PRIVATE_KEY or OCI_PRIVATE_KEY_FILE.");
  }
  let privateKey = env.OCI_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey) {
    const path = required("OCI_PRIVATE_KEY_FILE");
    try {
      privateKey = readFileSync(path.startsWith("~/") ? `${homedir()}/${path.slice(2)}` : path, "utf8");
    } catch {
      throw new Error("Cannot read OCI_PRIVATE_KEY_FILE. Check the path and file permissions.");
    }
  }
  return new SimpleAuthenticationDetailsProvider(tenancy, user, fingerprint, privateKey,
    env.OCI_PRIVATE_KEY_PASSPHRASE || null, Region.fromRegionId(region));
}
