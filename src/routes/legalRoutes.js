import { Router } from "express";
import legalController from "../controllers/legalController.js";

const legalRouter = Router();

legalRouter.get("/privacy-policy", legalController.getPrivacyPolicy);
legalRouter.get("/terms-of-service", legalController.getTermsOfService);
legalRouter.get("/return-policy", legalController.getReturnPolicy);
legalRouter.get("/refund-policy", legalController.getRefundPolicy);

export default legalRouter;
