const express = require('express');
const router = express.Router();
const legalController = require('../controllers/legalController');

router.get('/privacy-policy', legalController.getPrivacyPolicy);
router.get('/terms-of-service', legalController.getTermsOfService);
router.get('/return-policy', legalController.getReturnPolicy);
router.get('/refund-policy', legalController.getRefundPolicy);

module.exports = router;

