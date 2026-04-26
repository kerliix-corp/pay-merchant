const SEERBIT_API_BASE_URL = process.env.SEERBIT_API_BASE_URL || "https://seerbitapi.com";
const SEERBIT_PUBLIC_KEY = process.env.SEERBIT_PUBLIC_KEY || "";
const SEERBIT_BEARER_TOKEN = process.env.SEERBIT_BEARER_TOKEN || process.env.SEERBIT_ENCRYPTED_KEY || "";
const DEFAULT_COUNTRY = process.env.SEERBIT_COUNTRY || "UG";

function getJsonHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SEERBIT_BEARER_TOKEN}`
  };
}

function ensureConfig({ requireBearer = true } = {}) {
  if (!SEERBIT_PUBLIC_KEY) {
    throw new Error("Missing SEERBIT_PUBLIC_KEY.");
  }

  if (requireBearer && !SEERBIT_BEARER_TOKEN) {
    throw new Error("Missing SEERBIT_BEARER_TOKEN.");
  }
}

async function parseJsonResponse(response) {
  return response.json().catch(() => ({}));
}

export function getSeerbitClientConfig() {
  return {
    publicKey: SEERBIT_PUBLIC_KEY,
    country: DEFAULT_COUNTRY
  };
}

export async function initializeStandardCheckout(payload) {
  ensureConfig();

  const response = await fetch(`${SEERBIT_API_BASE_URL}/api/v2/payments`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      publicKey: SEERBIT_PUBLIC_KEY,
      ...payload
    })
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.data?.message || "Failed to initialize SeerBit checkout.");
  }

  return data;
}

export async function initiateMobileMoney(payload) {
  ensureConfig();

  const response = await fetch(`${SEERBIT_API_BASE_URL}/api/v2/payments/initiates`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({
      publicKey: SEERBIT_PUBLIC_KEY,
      paymentType: "MOMO",
      country: DEFAULT_COUNTRY,
      currency: "UGX",
      ...payload
    })
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.data?.message || "Failed to initiate mobile money payment.");
  }

  return data;
}

export async function verifyPayment(paymentReference) {
  ensureConfig();

  const response = await fetch(`${SEERBIT_API_BASE_URL}/api/v3/payments/query/${encodeURIComponent(paymentReference)}`, {
    method: "GET",
    headers: getJsonHeaders()
  });

  const data = await parseJsonResponse(response);

  if (!response.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.data?.message || "Failed to verify SeerBit payment.");
  }

  return data;
}
