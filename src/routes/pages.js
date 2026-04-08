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

const router = Router();

router.get("/", renderHome);
router.get("/search", renderSearch);
router.get("/cart", renderCart);
router.get("/retailers", renderRetailers);
router.get("/user/orders", renderOrders);
router.get("/user/account", renderAccount);
router.get("/user/notifications", renderNotifications);
router.get("/user/profile", renderProfile);
router.get("/product/:productId", renderProductDetails);
router.get("/category/:categoryName", renderCategory);
router.get("/wishlist", renderWishlist);
router.get("/checkout/success", renderCheckoutSuccess);
router.get("/checkout/cancel", renderCheckoutCancel);

export default router;
