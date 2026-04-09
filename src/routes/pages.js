import { Router } from "express";
import {
  renderHome,
  renderRetailers,
  renderOrders,
  renderAccount,
  renderSearch,
  renderCart,
  renderNotifications,
  renderProfile,
  renderProductDetails,
  renderCategory,
  renderWishlist,
  renderCheckoutSuccess,
  renderCheckoutCancel
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
router.get("/user/account", requireSSO, renderAccount);
router.get("/user/notifications", requireSSO, renderNotifications);
router.get("/user/profile", requireSSO, renderProfile);
router.get("/checkout/success", requireSSO, renderCheckoutSuccess);
router.get("/checkout/cancel", requireSSO, renderCheckoutCancel);

export default router;

