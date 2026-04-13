import jwt from 'jsonwebtoken';

const APP_SOURCE = 'Kerliix shop';

function getAccountsBaseUrl() {
  if (process.env.AUTH_BASE_URL) {
    return process.env.AUTH_BASE_URL;
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://accounts.kerliix.com'
    : 'http://localhost:3000';
}

function buildReturnUrl(req) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
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
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET);

    const user = await fetchCurrentUser(token);
    req.ssoUser = user;
    res.locals.ssoUser = user;
    next();
  } catch (error) {
    res.locals.ssoUser = null;
    next();
  }
}

export function redirectToCentralLogout(req, res) {
  const returnTo = encodeURIComponent(`${req.protocol}://${req.get('host')}/`);
  return res.redirect(`${getAccountsBaseUrl()}/auth/logout?returnTo=${returnTo}`);
}
