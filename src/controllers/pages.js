import { products } from "../data/catalog.js";
import { getOrder } from "../services/orderStore.js";

const merchantName = process.env.MERCHANT_NAME || "Kerliix Merchant";
const paymentAppUrl = process.env.PAYMENT_APP_URL || "http://localhost:1000";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

function getViewModel() {
  return { merchantName, paymentAppUrl, appBaseUrl, products };
}

export const renderHome = (req, res) => {
  res.render("index", {
    ...getViewModel(),
    title: `${merchantName} | Items`
  });
};

export const renderSearch = (req, res) => {
  const query = req.query.q || "";
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  res.render("search", {
    ...getViewModel(),
    title: `${merchantName} | Search Results`,
    query,
    products: filtered
  });
};

export const renderCart = (req, res) => {
  res.render("cart", {
    ...getViewModel(),
    title: `${merchantName} | Cart`
  });
};

export const renderRetailers = (req, res) => {
  res.render("retailers", {
    ...getViewModel(),
    title: `${merchantName} | Retailers`
  });
};

export const renderOrders = (req, res) => {
  // Example: fetch orders from session or DB
  const orders = req.session?.orders || [];
  res.render("orders", {
    ...getViewModel(),
    title: `${merchantName} | Your Orders`,
    orders
  });
};

export const renderAccount = (req, res) => {
  res.render("account", {
    ...getViewModel(),
    title: `${merchantName} | Account`,
    user: req.user || null
  });
};

export const renderNotifications = (req, res) => {
  const notifications = req.session?.notifications || [];
  res.render("notifications", {
    ...getViewModel(),
    title: `${merchantName} | Notifications`,
    notifications
  });
};

export const renderProfile = (req, res) => {
  res.render("profile", {
    ...getViewModel(),
    title: `${merchantName} | Profile`,
    user: req.user || null
  });
};

export const renderProductDetails = (req, res) => {
  const product = products.find(p => p.id === req.params.productId);
  if (!product) {
    return res.status(404).render("product-details", {
      ...getViewModel(),
      title: `${merchantName} | Product Not Found`,
      product: null
    });
  }

  res.render("product-details", {
    ...getViewModel(),
    title: `${merchantName} | ${product.name}`,
    product
  });
};

export const renderCategory = (req, res) => {
  const category = req.params.categoryName;
  const filtered = products.filter(p => p.category === category);

  res.render("category", {
    ...getViewModel(),
    title: `${merchantName} | Category: ${category}`,
    category,
    products: filtered
  });
};

export const renderWishlist = (req, res) => {
  const wishlist = req.session?.wishlist || [];
  res.render("wishlist", {
    ...getViewModel(),
    title: `${merchantName} | Wishlist`,
    products: wishlist
  });
};

export const renderCheckoutSuccess = (req, res) => {
  res.render("checkout-success", {
    ...getViewModel(),
    title: `${merchantName} | Checkout Successful`
  });
};

export const renderCheckoutCancel = (req, res) => {
  res.render("checkout-cancel", {
    ...getViewModel(),
    title: `${merchantName} | Checkout Cancelled`
  });
};