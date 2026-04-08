const searchProducts = window.__STORE_PRODUCTS__ || [];

function logTrace(event, details = {}) {
  console.log(`[search] ${event}`, details);
}

function performSearch(query, filterType = 'all') {
  if (!query.trim()) {
    return { products: [], categories: [], retailers: [] };
  }

  const lowerQuery = query.toLowerCase();
  
  const matchedProducts = searchProducts.filter(product => {
    if (filterType === 'products') {
      return product.name.toLowerCase().includes(lowerQuery) || 
             product.description.toLowerCase().includes(lowerQuery);
    }
    return product.name.toLowerCase().includes(lowerQuery) || 
           product.description.toLowerCase().includes(lowerQuery) ||
           product.sku.toLowerCase().includes(lowerQuery);
  });

  const matchedCategories = [];
  const matchedRetailers = [];
  
  if (filterType === 'all' || filterType === 'categories') {
    const categoriesSet = new Set();
    searchProducts.forEach(product => {
      if (product.category && product.category.toLowerCase().includes(lowerQuery)) {
        categoriesSet.add(product.category);
      }
    });
    matchedCategories.push(...Array.from(categoriesSet));
  }
  
  if (filterType === 'all' || filterType === 'retailers') {
    const retailersSet = new Set();
    searchProducts.forEach(product => {
      if (product.retailer && product.retailer.toLowerCase().includes(lowerQuery)) {
        retailersSet.add(product.retailer);
      }
    });
    matchedRetailers.push(...Array.from(retailersSet));
  }
  
  return {
    products: matchedProducts,
    categories: matchedCategories,
    retailers: matchedRetailers
  };
}

function renderResults(results, query, activeFilter) {
  const resultsContainer = document.getElementById('searchResults');
  const noResultsDiv = document.getElementById('noResults');
  
  const hasProducts = results.products.length > 0;
  const hasCategories = results.categories.length > 0;
  const hasRetailers = results.retailers.length > 0;
  
  if (!hasProducts && !hasCategories && !hasRetailers) {
    resultsContainer.innerHTML = '';
    noResultsDiv.style.display = 'block';
    return;
  }
  
  noResultsDiv.style.display = 'none';
  
  let html = '';
  
  if (activeFilter === 'all' || activeFilter === 'products') {
    if (hasProducts) {
      html += `
        <div class="result-section">
          <h2><i class="fas fa-box"></i> Products (${results.products.length})</h2>
          <div class="result-grid">
            ${results.products.map(product => `
              <div class="result-card" data-product-id="${product.id}">
                <h3>${product.name}</h3>
                <p>${product.description.substring(0, 80)}...</p>
                <div class="product-price" style="margin-top: 12px; font-weight: 600;">
                  $${product.price.toFixed(2)}
                </div>
                <div class="result-category">${product.category || 'Uncategorized'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
  
  if (activeFilter === 'all' || activeFilter === 'categories') {
    if (hasCategories) {
      html += `
        <div class="result-section">
          <h2><i class="fas fa-tag"></i> Categories (${results.categories.length})</h2>
          <div class="result-grid">
            ${results.categories.map(category => `
              <div class="result-card" data-category="${category}">
                <h3>${category}</h3>
                <p>Browse all products in ${category}</p>
                <div class="result-category">${searchProducts.filter(p => p.category === category).length} items</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
  
  if (activeFilter === 'all' || activeFilter === 'retailers') {
    if (hasRetailers) {
      html += `
        <div class="result-section">
          <h2><i class="fas fa-store"></i> Retailers (${results.retailers.length})</h2>
          <div class="result-grid">
            ${results.retailers.map(retailer => `
              <div class="result-card" data-retailer="${retailer}">
                <h3>${retailer}</h3>
                <p>Shop products from ${retailer}</p>
                <div class="result-retailer">${searchProducts.filter(p => p.retailer === retailer).length} products</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
  
  resultsContainer.innerHTML = html;
  
  document.querySelectorAll('.result-card[data-product-id]').forEach(card => {
    card.addEventListener('click', () => {
      const productId = card.dataset.productId;
      window.location.href = `/product/${productId}`;
    });
  });
  
  document.querySelectorAll('.result-card[data-category]').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      document.getElementById('searchInput').value = category;
      document.getElementById('categoryFilter').value = category;
      performSearchAndRender();
    });
  });
  
  document.querySelectorAll('.result-card[data-retailer]').forEach(card => {
    card.addEventListener('click', () => {
      const retailer = card.dataset.retailer;
      document.getElementById('searchInput').value = retailer;
      performSearchAndRender();
    });
  });
}

function performSearchAndRender() {
  const searchInput = document.getElementById('searchInput');
  const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
  const query = searchInput.value;
  
  const clearBtn = document.getElementById('clearSearch');
  if (query) {
    clearBtn.style.display = 'block';
  } else {
    clearBtn.style.display = 'none';
  }
  
  const results = performSearch(query, activeFilter);
  renderResults(results, query, activeFilter);
  
  logTrace('search_performed', { query, activeFilter, resultsCount: {
    products: results.products.length,
    categories: results.categories.length,
    retailers: results.retailers.length
  }});
}

function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  const filterChips = document.querySelectorAll('.filter-chip');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      performSearchAndRender();
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      performSearchAndRender();
      searchInput.focus();
    });
  }
  
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      performSearchAndRender();
    });
  });
  
  performSearchAndRender();
}

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
});

