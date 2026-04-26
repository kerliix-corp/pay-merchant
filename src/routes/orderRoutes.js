import { Router } from "express";
import {
  createCheckoutSession,
  getOrderById,
  startMobileMoneyPayment,
  verifyOrderPayment,
  getSeerbitConfig,
  handleKerliixWebhook,
  healthCheck
} from "../controllers/orderController.js";

const router = Router();

router.post("/checkout-sessions", createCheckoutSession);
router.get("/seerbit/config", getSeerbitConfig);
router.get("/orders/:merchantOrderId", getOrderById);
router.post("/orders/:merchantOrderId/mobile-money", startMobileMoneyPayment);
router.post("/orders/:merchantOrderId/verify-payment", verifyOrderPayment);
router.post("/payment-webhooks/kerliix-pay", handleKerliixWebhook);
router.get("/health", healthCheck);

export default router;
