import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const tokenEncryptionEnvSchema = z.object({
  PLATFORM_TOKEN_ENCRYPTION_KEY: z.string().min(32),
});

const tokenPrefix = "enc:v1:";

export function encryptConnectedAccountToken(token: string, source: EnvSource = process.env) {
  const key = getTokenEncryptionKey(source);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${tokenPrefix}${[
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")}`;
}

export function decryptConnectedAccountToken(token: string, source: EnvSource = process.env) {
  if (!token.startsWith(tokenPrefix)) {
    return token;
  }

  const key = getTokenEncryptionKey(source);
  const [iv, tag, ciphertext] = token.slice(tokenPrefix.length).split(".");

  if (!iv || !tag || !ciphertext) {
    throw new Error("Connected account token payload is invalid.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getTokenEncryptionKey(source: EnvSource) {
  const env = tokenEncryptionEnvSchema.parse(source);
  return createHash("sha256").update(env.PLATFORM_TOKEN_ENCRYPTION_KEY).digest();
}
