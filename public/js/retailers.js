const retailersGrid = document.getElementById('retailersGrid');
const retailerProductsContainer = document.getElementById('retailerProducts');
let allProducts = window.__STORE_PRODUCTS__ || [];

function getUniqueRetailersWithCount() {
    const retailerMap = new Map();
    
    allProducts.forEach(product => {
        const retailer = product.retailer || 'Direct';
        if (!retailerMap.has(retailer)) {
            retailerMap.set(retailer, {
                name: retailer,
                count: 0,
                products: []
            });
        }
        const retailerData = retailerMap.get(retailer);
        retailerData.count++;
        retailerData.products.push(product);
    });
    
    return Array.from(retailerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getRandomGradient(index) {
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ];
    return gradients[index % gradients.length];
}

function renderRetailers() {
    if (!retailersGrid) return;
    
    const retailers = getUniqueRetailersWithCount();
    
    if (retailers.length === 0) {
        retailersGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No retailers found.</p>
            </div>
        `;
        return;
    }
    
    retailersGrid.innerHTML = retailers.map((retailer, index) => `
        <div class="retailer-card" data-retailer="${retailer.name}">
            <div class="retailer-card-inner">
                <div class="retailer-icon" style="background: ${getRandomGradient(index)}">
                    <i class="fas fa-store"></i>
                </div>
                <h3 class="retailer-name">${retailer.name}</h3>
                <p class="retailer-count">${retailer.count} product${retailer.count !== 1 ? 's' : ''}</p>
                <button class="view-retailer-btn" data-retailer="${retailer.name}">
                    Browse Products
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.retailer-card, .view-retailer-btn').forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            const retailer = element.closest('.retailer-card')?.dataset.retailer || 
                           element.dataset.retailer;
            if (retailer) {
                showRetailerProducts(retailer);
            }
        });
    });
}

function showRetailerProducts(retailerName) {
    if (!retailerProductsContainer) return;
    
    const retailer = getUniqueRetailersWithCount().find(r => r.name === retailerName);
    if (!retailer) return;
    
    retailerProductsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    retailerProductsContainer.innerHTML = `
        <div class="retailer-products-header">
            <button class="back-to-retailers" id="backToRetailers">
                <i class="fas fa-arrow-left"></i>
                Back to all retailers
            </button>
            <div class="retailer-products-title">
                <div class="retailer-products-icon" style="background: ${getRandomGradient(retailer.name.length)}">
                    <i class="fas fa-store"></i>
                </div>
                <div>
                    <h2>${retailer.name}</h2>
                    <p class="retailer-products-count">${retailer.count} product${retailer.count !== 1 ? 's' : ''}</p>
                </div>
            </div>
        </div>
        <div class="horizontal-scroll-container">
            <div class="product-grid-horizontal">
                ${retailer.products.map(product => `
                    <article class="product-card-horizontal" data-product-id="${product.id}">
                        <div class="product-image-wrap">
                            <span class="product-badge">
                                <i class="fas fa-star"></i>
                                ${product.badge}
                            </span>
                            <img src="${product.imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
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
                                <span>${product.retailer || 'Direct'}</span>
                            </div>
                            <h3>${product.name}</h3>
                            <p>${product.description.substring(0, 60)}...</p>
                        </div>
                        <button class="primary-button add-to-cart-btn" data-product-id="${product.id}">
                            <i class="fas fa-cart-plus"></i>
                            Add to cart
                        </button>
                    </article>
                `).join('')}
            </div>
        </div>
    `;
    
    const backButton = document.getElementById('backToRetailers');
    if (backButton) {
        backButton.addEventListener('click', () => {
            retailerProductsContainer.innerHTML = '';
            retailerProductsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    attachAddToCartEvents();
    attachProductClickEvents();
    attachHorizontalScrollEvents();
}

function attachAddToCartEvents() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach((button) => {
        button.removeEventListener('click', handleAddToCartClick);
        button.addEventListener('click', handleAddToCartClick);
    });
}

function handleAddToCartClick(e) {
    e.stopPropagation();
    const button = e.currentTarget;
    const productId = button.getAttribute('data-product-id');
    
    if (typeof addToCart === 'function') {
        addToCart(productId);
    } else {
        console.log('Add to cart:', productId);
    }
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Added';
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 900);
}

function attachProductClickEvents() {
    const productCards = document.querySelectorAll('.product-card-horizontal');
    productCards.forEach(card => {
        card.removeEventListener('click', handleProductClick);
        card.addEventListener('click', handleProductClick);
    });
}

function handleProductClick(e) {
    if (e.target.closest('.add-to-cart-btn')) {
        return;
    }
    
    const card = e.currentTarget;
    const productId = card.getAttribute('data-product-id');
    if (productId) {
        window.location.href = `/product/${productId}`;
    }
}

function attachHorizontalScrollEvents() {
    const scrollContainers = document.querySelectorAll('.horizontal-scroll-container');
    scrollContainers.forEach(container => {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });
        
        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
        
        container.style.cursor = 'grab';
    });
}

function initRetailersPage() {
    renderRetailers();
    
    if (typeof syncCartBadge === 'function') {
        syncCartBadge();
    }
    
    if (typeof initMobileMenu === 'function') {
        initMobileMenu();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRetailersPage);
} else {
    initRetailersPage();
}
