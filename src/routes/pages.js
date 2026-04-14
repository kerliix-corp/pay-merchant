import { Router } from "express";
import {
  renderHome,
  renderRetailers,
  renderOrders,
  renderAccount,
  renderAddresses,
  renderPayment,
  renderPreferences,
  renderProfile,
  renderSearch,
  renderSecurity,
  renderCart,
  renderNotifications,
  renderProductDetails,
  renderCategory,
  renderWishlist,
  renderCheckoutSuccess,
  renderCheckoutCancel,
  renderRetailerDashboard,
  renderRetailerProducts,
  renderRetailerOrders,
  renderRetailerPayouts
} from "../controllers/pages.js";

import { requireSSO, optionalSSO } from "../middleware/ssoAuth.js";

const router = Router();

router.get("/", optionalSSO, renderHome);
router.get("/search", optionalSSO, renderSearch);
router.get("/product/:productId", optionalSSO, renderProductDetails);
router.get("/category/:categoryName", optionalSSO, renderCategory);
router.get("/retailers", optionalSSO, renderRetailers);
router.get("/cart", optionalSSO, renderCart);
router.get("/wishlist", requireSSO, renderWishlist);
router.get("/user/orders", requireSSO, renderOrders);
router.get("/user/profile", requireSSO, renderProfile);
router.get("/user/addresses", requireSSO, renderAddresses);
router.get("/user/payment", requireSSO, renderPayment);
router.get("/user/security", requireSSO, renderSecurity);
router.get("/user/preferences", requireSSO, renderPreferences);
router.get("/user/account", requireSSO, renderAccount);
router.get("/retailer/dashboard", requireSSO, renderRetailerDashboard);
router.get("/retailer/products", requireSSO, renderRetailerProducts);
router.get("/retailer/orders", requireSSO, renderRetailerOrders);
router.get("/retailer/payouts", requireSSO, renderRetailerPayouts);
router.get("/user/notifications", requireSSO, renderNotifications);
router.get("/checkout/success", requireSSO, renderCheckoutSuccess);
router.get("/checkout/cancel", requireSSO, renderCheckoutCancel);

export default router;
