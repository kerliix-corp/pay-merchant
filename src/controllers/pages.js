import { products } from "../data/catalog.js";
import { getOrder } from "../services/orderStore.js";
import Order from "../models/Order.js";
import {
  convertUsdToUgx,
  formatCurrency,
  formatUgxFromUsd,
  getRetailerName,
  getUserView
} from "../utils/viewHelpers.js";

const merchantName = process.env.MERCHANT_NAME || "Kerliix Merchant";
const paymentAppUrl = process.env.PAYMENT_APP_URL || "http://localhost:1000";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

function getViewModel() {
  return {
    merchantName,
    paymentAppUrl,
    appBaseUrl,
    products,
    currencyCode: "UGX",
    currencyRate: Number(process.env.USD_TO_UGX_RATE || 3700),
    formatCurrency,
    formatUgxFromUsd
  };
}

function getUser(req) {
  return req.ssoUser || req.user || null;
}

async function getUserOrders(user) {
  const email = user?.email;
  if (!email) {
    return [];
  }

  return Order.find({ customerEmail: email }).sort({ createdAt: -1 }).lean();
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

export const renderOrderDetails = (req, res) => {
  const user = getUser(req);
  res.render("order-details", {
    ...getViewModel(),
    title: `${merchantName} | Order Details`,
    user: getUserView(user)
  });
};

export const renderRetailers = (req, res) => {
  res.render("retailers", {
    ...getViewModel(),
    title: `${merchantName} | Retailers`
  });
};

export const renderOrders = (req, res) => {
  const user = getUser(req);
  getUserOrders(user)
    .then((orders) => {
      res.render("orders", {
        ...getViewModel(),
        title: `${merchantName} | Your Orders`,
        user: getUserView(user),
        orders
      });
    })
    .catch(() => {
      res.render("orders", {
        ...getViewModel(),
        title: `${merchantName} | Your Orders`,
        user: getUserView(user),
        orders: []
      });
    });
};

export const renderOrderStatus = async (req, res) => {
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId }).lean();

  res.render("order-status", {
    ...getViewModel(),
    title: `${merchantName} | Order Status`,
    order
  });
};

export const renderAccount = (req, res) => {
  const user = getUser(req);
  res.render("account", {
    ...getViewModel(),
    title: `${merchantName} | Account`,
    user: getUserView(user),
    activeAccountTab: "account"
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
  const user = getUser(req);
  getUserOrders(user)
    .then((orders) => {
      res.render("profile", {
        ...getViewModel(),
        title: `${merchantName} | Profile`,
        user: getUserView(user),
        orders
      });
    })
    .catch(() => {
      res.render("profile", {
        ...getViewModel(),
        title: `${merchantName} | Profile`,
        user: getUserView(user),
        orders: []
      });
    });
};

export const renderAddresses = (req, res) => {
  const user = getUser(req);
  res.render("addresses", {
    ...getViewModel(),
    title: `${merchantName} | Addresses`,
    user: getUserView(user),
    accountData: getUserView(user)
  });
};

export const renderPayment = (req, res) => {
  const user = getUser(req);
  res.render("payment", {
    ...getViewModel(),
    title: `${merchantName} | Payment Methods`,
    user: getUserView(user),
    accountData: getUserView(user)
  });
};

export const renderCheckout = async (req, res) => {
  const user = getUser(req);
  const order = await Order.findOne({ merchantOrderId: req.params.merchantOrderId }).lean();

  if (!order) {
    return res.status(404).render("404", {
      ...getViewModel(),
      title: `${merchantName} | Order Not Found`
    });
  }

  res.render("checkout", {
    ...getViewModel(),
    title: `${merchantName} | Checkout`,
    user: getUserView(user),
    order,
    seerbitPublicKey: process.env.SEERBIT_PUBLIC_KEY || "",
    seerbitCountry: process.env.SEERBIT_COUNTRY || "UG",
    seerbitRedirectUrl: `${appBaseUrl}/orders/${encodeURIComponent(order.merchantOrderId)}`
  });
};

export const renderSecurity = (req, res) => {
  const user = getUser(req);
  res.render("security", {
    ...getViewModel(),
    title: `${merchantName} | Security`,
    user: getUserView(user),
    accountData: getUserView(user)
  });
};

export const renderPreferences = (req, res) => {
  const user = getUser(req);
  res.render("preferences", {
    ...getViewModel(),
    title: `${merchantName} | Preferences`,
    user: getUserView(user),
    accountData: getUserView(user)
  });
};

export const renderRetailerDashboard = async (req, res) => {
  const rawUser = getUser(req);
  const user = getUserView(rawUser);
  const retailerName = getRetailerName(rawUser);
  const retailerProducts = products.filter((product) => product.retailer === retailerName);
  const orders = await Order.find({ "items.retailer": retailerName }).sort({ createdAt: -1 }).lean();
  const retailerSummary = buildRetailerSummary(retailerName, retailerProducts, orders);

  res.render("retailer/dashboard", {
    ...getViewModel(),
    title: `${merchantName} | Retailer Dashboard`,
    user,
    retailerName,
    retailerProducts,
    retailerOrders: orders,
    retailerMetrics: retailerSummary.metrics,
    retailerPayouts: retailerSummary.payouts,
    retailerHighlights: retailerSummary.highlights,
    activeRetailerTab: "dashboard"
  });
};

export const renderRetailerProducts = async (req, res) => {
  const rawUser = getUser(req);
  const user = getUserView(rawUser);
  const retailerName = getRetailerName(rawUser);
  const retailerProducts = products.filter((product) => product.retailer === retailerName);
  const orders = await Order.find({ "items.retailer": retailerName }).sort({ createdAt: -1 }).lean();
  const retailerSummary = buildRetailerSummary(retailerName, retailerProducts, orders);

  res.render("retailer/products", {
    ...getViewModel(),
    title: `${merchantName} | Retailer Products`,
    user,
    retailerName,
    retailerProducts,
    retailerMetrics: retailerSummary.metrics,
    activeRetailerTab: "products"
  });
};

export const renderRetailerOrders = async (req, res) => {
  const rawUser = getUser(req);
  const user = getUserView(rawUser);
  const retailerName = getRetailerName(rawUser);
  const retailerProducts = products.filter((product) => product.retailer === retailerName);
  const orders = await Order.find({ "items.retailer": retailerName }).sort({ createdAt: -1 }).lean();
  const retailerSummary = buildRetailerSummary(retailerName, retailerProducts, orders);

  res.render("retailer/orders", {
    ...getViewModel(),
    title: `${merchantName} | Retailer Orders`,
    user,
    retailerName,
    retailerOrders: orders,
    retailerMetrics: retailerSummary.metrics,
    activeRetailerTab: "orders"
  });
};

export const renderRetailerPayouts = async (req, res) => {
  const rawUser = getUser(req);
  const user = getUserView(rawUser);
  const retailerName = getRetailerName(rawUser);
  const retailerProducts = products.filter((product) => product.retailer === retailerName);
  const orders = await Order.find({ "items.retailer": retailerName }).sort({ createdAt: -1 }).lean();
  const retailerSummary = buildRetailerSummary(retailerName, retailerProducts, orders);

  res.render("retailer/payouts", {
    ...getViewModel(),
    title: `${merchantName} | Retailer Payouts`,
    user,
    retailerName,
    retailerOrders: orders,
    retailerMetrics: retailerSummary.metrics,
    retailerPayouts: retailerSummary.payouts,
    retailerHighlights: retailerSummary.highlights,
    activeRetailerTab: "payouts"
  });
};

function getRetailerOrderItems(order, retailerName) {
  return (order.items || []).filter((item) => item.retailer === retailerName);
}

function getRetailerOrderValue(order, retailerName) {
  return getRetailerOrderItems(order, retailerName).reduce((sum, item) => {
    return sum + convertUsdToUgx(Number(item.price || 0) * Number(item.quantity || 0));
  }, 0);
}

function getRetailerAllocation(order, retailerName) {
  return (order.metadata?.split?.allocations || []).find((entry) => entry.retailerName === retailerName) || null;
}

function buildRetailerSummary(retailerName, retailerProducts, orders) {
  const paidOrders = orders.filter((order) => order.status === "paid");
  const paidRevenue = paidOrders.reduce((sum, order) => {
    const allocation = getRetailerAllocation(order, retailerName);
    return sum + (allocation?.retailerAmount || getRetailerOrderValue(order, retailerName));
  }, 0);
  const totalUnitsSold = orders.reduce((sum, order) => {
    return sum + getRetailerOrderItems(order, retailerName).reduce((count, item) => count + Number(item.quantity || 0), 0);
  }, 0);
  const lowStockCount = retailerProducts.filter((product) => Number(product.stockCount || 0) <= 20).length;
  const topProduct = [...retailerProducts].sort((a, b) => Number(b.stockCount || 0) - Number(a.stockCount || 0))[0] || null;
  const settlementMethods = paidOrders.reduce((acc, order) => {
    const method = getRetailerAllocation(order, retailerName)?.settlementMethod || "manual_review";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const primarySettlementMethod = Object.entries(settlementMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || "manual_review";

  return {
    metrics: {
      productCount: retailerProducts.length,
      orderCount: orders.length,
      paidOrderCount: paidOrders.length,
      paidRevenue,
      totalUnitsSold,
      lowStockCount
    },
    payouts: {
      available: Math.round(paidRevenue * 0.74),
      processing: Math.round(paidRevenue * 0.2),
      reserves: Math.round(paidRevenue * 0.06)
    },
    highlights: {
      topProduct,
      latestOrder: orders[0] || null,
      primarySettlementMethod
    }
  };
}

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
