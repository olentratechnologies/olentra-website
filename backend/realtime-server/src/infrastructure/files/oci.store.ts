import { InstancePrincipalsAuthenticationDetailsProviderBuilder, SessionAuthDetailProvider, Region, MaxAttemptsTerminationStrategy } from "oci-common";
import { ObjectStorageClient, models } from "oci-objectstorage";
import { createApiKeyProvider } from "./oci-auth";

export interface ObjectStore {
  issue(key: string, expires: Date): Promise<{ id: string; url: string }>;
  revoke(id: string): Promise<void>;
  read(key: string, maximum: number): Promise<Uint8Array>;
  promote(key: string, bytes: Uint8Array, type: string): Promise<void>;
  remove(key: string, clean?: boolean): Promise<void>;
  download(key: string): Promise<ReadableStream>;
}

export async function createOciStore(): Promise<ObjectStore> {
  const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; };
  const namespaceName = required("OCI_STORAGE_NAMESPACE");
  const bucketName = required("OCI_QUARANTINE_BUCKET");
  const cleanBucket = required("OCI_STORAGE_BUCKET");
  if (bucketName === cleanBucket) throw new Error("Use separate quarantine and clean buckets");
  const region = required("OCI_STORAGE_REGION");
  const mode = process.env.OCI_AUTH_MODE || "instance_principal";
  if (!["session", "api_key", "instance_principal"].includes(mode)) throw new Error("OCI_AUTH_MODE must be api_key, session, or instance_principal.");
  const session = mode === "session";
  if (session && process.env.NODE_ENV === "production") throw new Error("Production uploads require instance principals or API key authentication");
  const provider = mode === "api_key" ? createApiKeyProvider() : session ? new SessionAuthDetailProvider(undefined, process.env.OCI_CLI_PROFILE || "OLENTRA") : await new InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
  if (provider instanceof SessionAuthDetailProvider) {
    const token = await provider.getSecurityToken();
    let expiresAt = 0;
    try {
      expiresAt = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp;
    } catch { /* Missing or malformed tokens require a new CLI session. */ }
    if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
      throw new Error(`OCI session is missing, invalid, or expired. Run oci session authenticate --profile-name ${process.env.OCI_CLI_PROFILE || "OLENTRA"} and restart the realtime server.`);
    }
  }
  const client = new ObjectStorageClient({ authenticationDetailsProvider: provider }, { httpOptions: { get signal() { return AbortSignal.timeout(30_000); } }, retryConfiguration: { terminationStrategy: new MaxAttemptsTerminationStrategy(2) } });
  client.region = Region.fromRegionId(region);
  const base = { namespaceName, bucketName };
  const ignoreMissing = async (task: Promise<unknown>) => { try { await task; } catch (error: any) { if (error.statusCode !== 404) throw error; } };
  const stream = (value: any): ReadableStream<Uint8Array> => {
    if (typeof value?.getReader === "function") return value;
    return new Response(value).body!;
  };
  // Confirm both buckets are private before allowing issuance.
  for (const name of [bucketName, cleanBucket]) {
    const result = await client.getBucket({ ...base, bucketName: name });
    if (result.bucket.publicAccessType !== "NoPublicAccess") throw new Error("OCI upload buckets must be private");
  }
  return {
    async issue(objectName, timeExpires) {
      const result = await client.createPreauthenticatedRequest({ ...base, createPreauthenticatedRequestDetails: { name: "olentra-upload", objectName, timeExpires, accessType: models.CreatePreauthenticatedRequestDetails.AccessType.ObjectWrite } });
      const par = result.preauthenticatedRequest;
      return { id: par.id, url: `https://objectstorage.${region}.oraclecloud.com${par.accessUri}` };
    },
    revoke: id => ignoreMissing(client.deletePreauthenticatedRequest({ ...base, parId: id })),
    async read(objectName, maximum) {
      const result = await client.getObject({ ...base, objectName });
      const reader = stream(result.value).getReader();
      const chunks: Uint8Array[] = []; let length = 0;
      try {
        if (Number(result.contentLength) > maximum) throw new Error("FILE_SIZE");
        while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > maximum) throw new Error("FILE_SIZE"); chunks.push(part.value); }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return bytes;
    },
    async promote(objectName, bytes, contentType) { await client.putObject({ ...base, bucketName: cleanBucket, objectName, putObjectBody: bytes, contentLength: bytes.length, contentType }); },
    remove: (objectName, clean = false) => ignoreMissing(client.deleteObject({ ...base, bucketName: clean ? cleanBucket : bucketName, objectName })),
    async download(objectName) { return stream((await client.getObject({ ...base, bucketName: cleanBucket, objectName })).value); },
  };
}
