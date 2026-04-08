const getCurrentDate = () => {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

exports.getPrivacyPolicy = (req, res) => {
  const { paymentAppUrl, merchantName, appBaseUrl } = req.app.locals;
  
  res.render('privacy-policy', {
    title: 'Privacy Policy',
    paymentAppUrl: paymentAppUrl || process.env.PAYMENT_APP_URL || 'http://localhost:3001',
    merchantName: merchantName || process.env.MERCHANT_NAME || 'Kerliix Shop',
    appBaseUrl: appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3000',
    lastUpdated: getCurrentDate()
  });
};

exports.getTermsOfService = (req, res) => {
  const { paymentAppUrl, merchantName, appBaseUrl } = req.app.locals;
  
  res.render('terms-of-service', {
    title: 'Terms of Service',
    paymentAppUrl: paymentAppUrl || process.env.PAYMENT_APP_URL || 'http://localhost:3001',
    merchantName: merchantName || process.env.MERCHANT_NAME || 'Kerliix Shop',
    appBaseUrl: appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3000',
    lastUpdated: getCurrentDate()
  });
};

exports.getReturnPolicy = (req, res) => {
  const { paymentAppUrl, merchantName, appBaseUrl } = req.app.locals;
  
  res.render('return-policy', {
    title: 'Return Policy',
    paymentAppUrl: paymentAppUrl || process.env.PAYMENT_APP_URL || 'http://localhost:3001',
    merchantName: merchantName || process.env.MERCHANT_NAME || 'Kerliix Shop',
    appBaseUrl: appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3000',
    lastUpdated: getCurrentDate()
  });
};

exports.getRefundPolicy = (req, res) => {
  const { paymentAppUrl, merchantName, appBaseUrl } = req.app.locals;
  
  res.render('refund-policy', {
    title: 'Refund Policy',
    paymentAppUrl: paymentAppUrl || process.env.PAYMENT_APP_URL || 'http://localhost:3001',
    merchantName: merchantName || process.env.MERCHANT_NAME || 'Kerliix Shop',
    appBaseUrl: appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:3000',
    lastUpdated: getCurrentDate()
  });
};

