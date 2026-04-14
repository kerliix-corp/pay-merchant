const USD_TO_UGX_RATE = Number(process.env.USD_TO_UGX_RATE || 3700);
const DEFAULT_CURRENCY_CODE = "UGX";

function pickFirstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function convertUsdToUgx(amount) {
  return Number(amount || 0) * USD_TO_UGX_RATE;
}

export function formatCurrency(amount, currency = DEFAULT_CURRENCY_CODE, locale = "en-UG") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

export function formatUgxFromUsd(amount) {
  return formatCurrency(convertUsdToUgx(amount));
}

export function getDisplayName(user) {
  if (!user) {
    return "Guest User";
  }

  const metadata = user.metadata || {};
  const fullName = pickFirstValue(
    user.fullName,
    metadata.fullName,
    [user.firstName, user.lastName].filter(Boolean).join(" "),
    metadata.name,
    metadata.displayName,
    metadata.businessName,
    metadata.storeName
  );

  return fullName || "Guest User";
}

export function getUserEmail(user) {
  if (!user) {
    return "";
  }

  const metadata = user.metadata || {};
  return pickFirstValue(user.email, metadata.email, metadata.contactEmail);
}

export function getUserPhone(user) {
  if (!user) {
    return "";
  }

  const metadata = user.metadata || {};
  return pickFirstValue(user.phone, user.phoneNumber, metadata.phone, metadata.phoneNumber, metadata.contactPhone);
}

export function getUserInitials(user) {
  const base = getDisplayName(user);
  const parts = base.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length) {
    return parts.map((part) => part[0].toUpperCase()).join("");
  }

  const email = getUserEmail(user);
  return email ? email[0].toUpperCase() : "G";
}

export function getUserAddresses(user) {
  const metadata = user?.metadata || {};
  return asArray(metadata.addresses).filter(Boolean);
}

export function getUserPaymentMethods(user) {
  const metadata = user?.metadata || {};
  return asArray(metadata.paymentMethods).filter(Boolean);
}

export function getUserPreferences(user) {
  const metadata = user?.metadata || {};
  return {
    newsletter: Boolean(metadata.preferences?.newsletter),
    orderUpdates: metadata.preferences?.orderUpdates !== false,
    currency: DEFAULT_CURRENCY_CODE
  };
}

export function getRetailerName(user) {
  const metadata = user?.metadata || {};
  return pickFirstValue(
    metadata.storeName,
    metadata.businessName,
    metadata.retailerName,
    metadata.shopName,
    metadata.companyName,
    getDisplayName(user)
  );
}

export function getUserView(user) {
  if (!user) {
    return null;
  }

  return {
    id: user._id || user.id || user.ssoId || "",
    email: getUserEmail(user),
    fullName: getDisplayName(user),
    phone: getUserPhone(user),
    initials: getUserInitials(user),
    retailerName: getRetailerName(user),
    addresses: getUserAddresses(user),
    paymentMethods: getUserPaymentMethods(user),
    preferences: getUserPreferences(user),
    metadata: user.metadata || {}
  };
}
