import { Router } from "express";
import {
  createCheckoutSession,
  getOrderById,
  handleKerliixWebhook,
  healthCheck
} from "../controllers/orderController.js";

const router = Router();

router.post("/checkout-sessions", createCheckoutSession);
router.get("/orders/:merchantOrderId", getOrderById);
router.post("/payment-webhooks/kerliix-pay", handleKerliixWebhook);
router.get("/health", healthCheck);

export default router;