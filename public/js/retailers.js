const retailersProducts = window.__STORE_PRODUCTS__ || [];

function logTrace(event, details = {}) {
  console.log(`[retailers] ${event}`, details);
}

function getUniqueRetailers() {
  const retailersMap = new Map();
  
  retailersProducts.forEach(product => {
    if (product.retailer) {
      if (!retailersMap.has(product.retailer)) {
        retailersMap.set(product.retailer, {
          name: product.retailer,
          productCount: 0,
          products: []
        });
      }
      const retailer = retailersMap.get(product.retailer);
      retailer.productCount++;
      retailer.products.push(product);
    }
  });
  
  return Array.from(retailersMap.values());
}

function renderRetailers() {
  const retailersGrid = document.getElementById('retailersGrid');
  const retailers = getUniqueRetailers();
  
  if (!retailersGrid) return;
  
  retailersGrid.innerHTML = retailers.map(retailer => `
    <div class="retailer-card" data-retailer="${retailer.name}">
      <div class="retailer-icon">
        <i class="fas fa-store"></i>
      </div>
      <h3>${retailer.name}</h3>
      <p>${retailer.productCount} product${retailer.productCount !== 1 ? 's' : ''}</p>
    </div>
  `).join('');
  
  document.querySelectorAll('.retailer-card').forEach(card => {
    card.addEventListener('click', () => {
      const retailerName = card.dataset.retailer;
      showRetailerProducts(retailerName);
    });
  });
}

function showRetailerProducts(retailerName) {
  const retailers = getUniqueRetailers();
  const retailer = retailers.find(r => r.name === retailerName);
  
  if (!retailer) return;
  
  const retailerProductsDiv = document.getElementById('retailerProducts');
  const retailersGrid = document.getElementById('retailersGrid');
  
  retailersGrid.style.display = 'none';
  
  retailerProductsDiv.innerHTML = `
    <button class="back-to-retailers" id="backToRetailers">
      <i class="fas fa-arrow-left"></i> Back to all retailers
    </button>
    <h2>
      <i class="fas fa-store"></i>
      ${retailer.name}
    </h2>
    <div class="product-grid">
      ${retailer.products.map(product => `
        <article class="product-card">
          <div class="product-image-wrap">
            <span class="product-badge">
              <i class="fas fa-star"></i>
              ${product.badge}
            </span>
            <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
          </div>
          <div class="product-copy">
            <div class="product-meta">
              <p class="product-sku">
                <i class="fas fa-barcode"></i>
                ${product.sku}
              </p>
              <p class="product-price">
                <i class="fas fa-dollar-sign"></i>
                ${product.price.toFixed(2)}
              </p>
            </div>
            <div class="product-retailer">
              <i class="fas fa-store"></i>
              <span>${product.retailer}</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
          </div>
          <button
            class="primary-button add-to-cart-btn"
            data-product-id="${product.id}"
          >
            <i class="fas fa-cart-plus"></i>
            Add to cart
          </button>
        </article>
      `).join('')}
    </div>
  `;
  
  retailerProductsDiv.style.display = 'block';
  
  document.getElementById('backToRetailers').addEventListener('click', () => {
    retailersGrid.style.display = 'grid';
    retailerProductsDiv.style.display = 'none';
    retailerProductsDiv.innerHTML = '';
  });
  
  document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      if (window.addToCart) {
        window.addToCart(productId);
      } else {
        window.location.href = `/add-to-cart/${productId}`;
      }
    });
  });
  
  logTrace('view_retailer_products', { retailer: retailerName, productCount: retailer.products.length });
}

function initRetailers() {
  renderRetailers();
}

document.addEventListener('DOMContentLoaded', () => {
  initRetailers();
});

