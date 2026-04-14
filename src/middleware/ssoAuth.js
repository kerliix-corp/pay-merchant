import jwt from 'jsonwebtoken';
import { getUserView } from "../utils/viewHelpers.js";

const APP_SOURCE = 'Kerliix shop';

function normalizeBaseUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/+$/, '');
  }

  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${normalized}`.replace(/\/+$/, '');
}

function getAccountsBaseUrl() {
  if (process.env.AUTH_BASE_URL) {
    return normalizeBaseUrl(process.env.AUTH_BASE_URL);
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://accounts.kerliix.com'
    : 'http://localhost:3000';
}

function getRequestBaseUrl(req) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const forwardedProtoHeader = req.get('x-forwarded-proto');
  const forwardedHostHeader = req.get('x-forwarded-host');
  const forwardedProto = forwardedProtoHeader?.split(',')[0]?.trim();
  const forwardedHost = forwardedHostHeader?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');

  return normalizeBaseUrl(`${protocol}://${host}`);
}

function buildReturnUrl(req) {
  return new URL(req.originalUrl, `${getRequestBaseUrl(req)}/`).toString();
}

function buildLoginUrl(req) {
  const redirect = encodeURIComponent(buildReturnUrl(req));
  return `${getAccountsBaseUrl()}/auth/login?redirect=${redirect}&source=${APP_SOURCE}`;
}

async function fetchCurrentUser(token) {
  const response = await fetch(`${getAccountsBaseUrl()}/auth/me`, {
    headers: {
      Cookie: `token=${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.authenticated ? data.user : null;
}

export async function requireSSO(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect(buildLoginUrl(req));
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const user = await fetchCurrentUser(token);
    if (!user) {
      return res.redirect(buildLoginUrl(req));
    }

    req.ssoUser = user;
    res.locals.ssoUser = user;
    res.locals.currentUser = getUserView(user);
    next();
  } catch (error) {
    return res.redirect(buildLoginUrl(req));
  }
}

export async function optionalSSO(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.locals.ssoUser = null;
      res.locals.currentUser = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const user = await fetchCurrentUser(token);
    req.ssoUser = user;
    res.locals.ssoUser = user;
    res.locals.currentUser = getUserView(user);
    next();
  } catch (error) {
    res.locals.ssoUser = null;
    res.locals.currentUser = null;
    next();
  }
}

export function redirectToCentralLogout(req, res) {
  const returnTo = encodeURIComponent(new URL('/', `${getRequestBaseUrl(req)}/`).toString());
  return res.redirect(`${getAccountsBaseUrl()}/auth/logout?returnTo=${returnTo}`);
}
