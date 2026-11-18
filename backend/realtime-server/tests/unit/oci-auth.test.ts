import { expect, test } from "bun:test";
import { createApiKeyProvider } from "../../src/infrastructure/files/oci-auth";

const credentials = {
  OCI_TENANCY_OCID: "tenancy", OCI_USER_OCID: "user", OCI_FINGERPRINT: "fingerprint",
  OCI_STORAGE_REGION: "ap-hyderabad-1", OCI_PRIVATE_KEY: "line1\\nline2",
};
test("API key credentials do not require a CLI profile and normalize PEM newlines", async () => {
  const provider = createApiKeyProvider(credentials);
  expect(await provider.getKeyId()).toBe("tenancy/user/fingerprint");
  expect(provider.getPrivateKey()).toBe("line1\nline2");
});
test("API key configuration rejects missing and ambiguous credentials", () => {
  expect(() => createApiKeyProvider({})).toThrow("OCI_TENANCY_OCID");
  expect(() => createApiKeyProvider({ ...credentials, OCI_PRIVATE_KEY_FILE: "key.pem" })).toThrow("only one");
  expect(() => createApiKeyProvider({ ...credentials, OCI_PRIVATE_KEY: "", OCI_PRIVATE_KEY_FILE: "/nonexistent/oci-key.pem" })).toThrow("Cannot read OCI_PRIVATE_KEY_FILE");
});
