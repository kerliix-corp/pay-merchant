import crypto from "node:crypto";

export function signPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function isValidSignature(payload, secret, signature) {
  if (!secret || !signature) {
    return false;
  }

  const expected = signPayload(payload, secret);

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
