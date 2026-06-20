import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import SEO from '../components/SEO';
import './Menu.css';

const MOCK_MENU = [
  { id: '1', name: 'Zinger Burger', price: 450, category: 'Burgers', subCategory: 'Regular', stock: 20, description: 'Crispy chicken fillet with secret sauce.' },
  { id: '2', name: 'Beef Smash Burger', price: 650, category: 'Burgers', subCategory: 'Special', stock: 15, description: 'Double smash patty with melted cheese.' },
  { id: '3', name: 'Chicken Fajita Pizza', price: 1200, category: 'Pizza', stock: 10, description: 'Spicy fajita chicken, olives, and bell peppers.' },
];
const DEAL_SUBCATS = ['Simple Deals', 'Yari Deals', 'Family Deals', 'Birthday deals'];
const BURGER_SUBCATS = ['Regular', 'Special'];
const ROLL_SUBCATS = ['Regular', 'Special'];
const CATEGORIES = ['All', 'Pizza', 'Burgers', 'Rolls', 'Pasta', 'Bites', 'Drinks', 'Deals'];

const TOPPING_PRICES = {
  'Personal (6")': { chicken: 80, cheese: 80, vegetable: 60 },
  'Small (7")': { chicken: 100, cheese: 100, vegetable: 80 },
  'Medium (10")': { chicken: 150, cheese: 150, vegetable: 120 },
  'Large (13")': { chicken: 250, cheese: 250, vegetable: 200 },
  'XL (16")': { chicken: 350, cheese: 350, vegetable: 300 },
  'XXL (21")': { chicken: 450, cheese: 450, vegetable: 400 },
};

const CATEGORY_CARDS = [
  { id: 'Deals', title: 'Exciting Deals', img: '/deal5.png', span: 2, hasSub: true },
  { id: 'Burgers', title: 'Special Burgers', img: '/tower1.png', span: 1, hasSub: true },
  { id: 'Pizza', title: 'Pak Special Pizzas', img: '/tikka_pizza.jpeg', span: 1 },
  { id: 'Rolls', title: 'Crispy Rolls', img: '/roll.png', span: 1, hasSub: true },
  { id: 'Pasta', title: 'Creamy Pasta', img: '/pasta.png', span: 1 },
  { id: 'Bites', title: 'Snacks & Bites', img: '/nuggets.png', span: 1 },
  { id: 'Drinks', title: 'Cold Drinks & Water', img: '/drinks_banner.jpeg', span: 1 },
];

const MENU_BANNER_SLIDES = [
  { id: 1, title: 'Pak Special Pizza', sub: 'Double the meat, double the heat!', img: '/pizza_banner.jpeg', tag: 'Chef Choice', link: 'Pizza' },
  { id: 2, title: 'Roll, Snacks & Bites', sub: 'Perfect for your gathering!', img: '/bites_banner.jpeg', tag: 'Limited Time', link: 'Rolls' },
  { id: 3, title: 'Premium Burgers', sub: 'The crunch you crave.', img: '/burger_banner.jpeg', tag: 'Fan Favorite', link: 'Burgers' },
  { id: 4, title: 'Sizzling Pasta Bowls', sub: 'Creamy, spicy, and divine.', img: '/pasta_banner.jpeg', tag: 'New Arrival', link: 'Pasta' },
  { id: 5, title: 'Chilled Cold Drinks', sub: 'Quench your thirst with our refreshing selection.', img: '/drinks_banner.jpeg', tag: 'Best Seller', link: 'Drinks' },
];

const SUB_CATEGORY_CARDS = {
  Burgers: [
    { id: 'Regular', title: 'Regular Burgers', img: '/cs.png' },
    { id: 'Special', title: 'Special Burgers', img: '/grill.png' }
  ],
  Rolls: [
    { id: 'Regular', title: 'Regular Rolls', img: '/roll.png' },
    { id: 'Special', title: 'Special Rolls', img: '/bihari.png' },
  ],
  Deals: [
    { id: 'Simple Deals', title: 'Simple Deals', img: '/deal1.png' },
    { id: 'Yari Deals', title: 'Yari Deals', img: '/yd1.png' },
    { id: 'Family Deals', title: 'Family Deals', img: '/fd1.png' },
    { id: 'Birthday deals', title: 'Birthday deals', img: '/bd1.png' },
  ]
};

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' or 'items'
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [dbError, setDbError] = useState(false);

  // Modal state for items with sizes or meal addons
  const [selectedConfigItem, setSelectedConfigItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [makeItMeal, setMakeItMeal] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState({ chicken: false, cheese: false, vegetable: false });
  const [dealSelections, setDealSelections] = useState({});
  const [pizzaFlavorSelections, setPizzaFlavorSelections] = useState({});

  const { addToCart } = useCart();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Pizza': return '🍕';
      case 'Burgers': return '🍔';
      case 'Rolls': return '🌯';
      case 'Pasta': return '🍝';
      case 'Bites': return '🍟';
      case 'Drinks': return '🥤';
      case 'Deals': return '🔥';
      default: return '🍔';
    }
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'menu'));
        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });

        // Use mock data if database is empty for now
        if (items.length === 0) {
          setMenuItems(MOCK_MENU);
        } else {
          setMenuItems(items);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
        setDbError(true);
        setMenuItems(MOCK_MENU); // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Carousel Auto-play
  useEffect(() => {
    if (viewMode === 'categories') {
      const timer = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % MENU_BANNER_SLIDES.length);
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [viewMode]);

  const categories = CATEGORIES;

  const filteredItems = activeCategory === 'All'
    ? menuItems
    : (activeCategory === 'Deals' && activeSubCategory !== 'All')
      ? menuItems.filter(item => item.category === 'Deals' && (item.subCategory === activeSubCategory || (!item.subCategory && activeSubCategory === 'Simple Deals')))
      : (activeCategory === 'Burgers' && activeSubCategory !== 'All')
        ? menuItems.filter(item => item.category === 'Burgers' && (item.subCategory === activeSubCategory || (!item.subCategory && activeSubCategory === 'Regular')))
        : (activeCategory === 'Rolls' && activeSubCategory !== 'All')
          ? menuItems.filter(item => item.category === 'Rolls' && (item.subCategory === activeSubCategory || (!item.subCategory && activeSubCategory === 'Regular')))
          : menuItems.filter(item => item.category === activeCategory);

  filteredItems.sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999));

  if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}><h2>Loading Menu...</h2></div>;

  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "name": "Pak Burger House Menu",
    "description": "Explosive flavors with the best burgers, pizzas, and deals in Khanewal.",
    "hasMenuItem": menuItems.slice(0, 10).map(item => ({
      "@type": "MenuItem",
      "name": item.name,
      "description": item.description || "Premium fast food item.",
      "offers": {
        "@type": "Offer",
        "price": item.price,
        "priceCurrency": "PKR"
      }
    }))
  };

  const pageTitle = activeCategory === 'All' ? "Our Full Menu" : `${activeCategory} Menu`;
  const pageDescription = activeCategory === 'All'
    ? "Explore the full menu of Pak Burger House Khanewal. From spicy Zinger burgers to cheesy pizzas and value family deals."
    : `Order the best ${activeCategory} in Khanewal. High-quality ingredients and explosive taste from Pak Burger House.`;

  return (
    <div className="menu-page">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical="/menu"
        keywords={`Pak Burger ${activeCategory}, Best ${activeCategory} Khanewal, Fast Food Menu`}
        schemaMarkup={menuSchema}
      />
      <div className="menu-header">
        {viewMode === 'items' && (
          <button className="back-to-categories-btn" onClick={() => {
            const currentCat = CATEGORY_CARDS.find(c => c.id === activeCategory);
            if (currentCat?.hasSub) {
              setViewMode('subcategories');
            } else {
              setViewMode('categories');
            }
          }}>
            ← Back
          </button>
        )}
        {viewMode === 'subcategories' && (
          <button className="back-to-categories-btn" onClick={() => setViewMode('categories')}>
            ← Back to Menu
          </button>
        )}
      </div>

      {dbError && (
        <div className="container" style={{ marginTop: '20px' }}>
          <div className="glass-panel" style={{ border: '1px solid rgba(255, 77, 77, 0.5)', background: 'rgba(255, 77, 77, 0.1)', padding: '15px' }}>
            <p style={{ color: '#FF4D4D', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
              ⚠️ <strong>Database Access Restricted:</strong> Your Firebase permissions are blocking menu data. Showing offline items.
              <br /><em>Please update Firestore Security Rules to allow public read access.</em>
            </p>
          </div>
        </div>
      )}

      <div className="container">
        {viewMode === 'categories' ? (
          // --- CATEGORY BANNER CAROUSEL ---
          <div className="menu-landing-content">
            {/* 1. Feature Carousel */}
            <div className="menu-carousel-wrapper">
              <div className="menu-carousel-container" style={{ transform: `translateX(-${carouselIndex * 100}%)` }}>
                {MENU_BANNER_SLIDES.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`carousel-slide ${carouselIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveCategory(slide.link);
                      setActiveSubCategory('All');
                      const catData = CATEGORY_CARDS.find(c => c.id === slide.link);
                      if (catData?.hasSub) {
                        setViewMode('subcategories');
                      } else {
                        setViewMode('items');
                      }
                    }}
                  >
                    <img src={slide.img} alt={slide.title} className="carousel-bg-img" onError={(e) => { e.target.src = '/logo1.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '40px'; }} />
                    <div className="carousel-info-overlay">
                      <span className="carousel-cat-tag">{slide.tag}</span>
                      <h2>{slide.title}</h2>
                      <p className="carousel-subtext">{slide.sub}</p>
                      <button className="carousel-explore-btn">Order Now | ابھی آرڈر کریں →</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="carousel-dots">
                {MENU_BANNER_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    className={`dot ${carouselIndex === idx ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }}
                  />
                ))}
              </div>
            </div>
            <h1 style={{ marginTop: '-30px', marginBottom: '0px', textAlign: 'center' }}>Our <span className="text-gradient">Menu</span> <br/><span style={{ fontSize: '0.5em', color: '#ffb347', display: 'block', marginTop: '5px' }}>ہمارا مینو</span></h1>
            {/* 2. Visual Category Grid */}
            <div className="category-landing-grid">
              {CATEGORY_CARDS.map((cat, idx) => (
                <div
                  key={idx}
                  className={`category-landing-card ${cat.span === 2 ? 'span-2' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setActiveSubCategory('All');
                    if (cat.hasSub) {
                      setViewMode('subcategories');
                    } else {
                      setViewMode('items');
                    }
                  }}
                >
                  <img src={cat.img} alt={cat.title} className="category-bg-img" onError={(e) => { e.target.src = '/logo1.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; }} />
                  <div className="category-overlay">
                    <h2>{cat.title}</h2>
                  </div>
                </div>
              ))}
              <div className="category-landing-card span-2" onClick={() => { setActiveCategory('All'); setActiveSubCategory('All'); setViewMode('items'); }}>
                <div className="category-overlay all-items-overlay">
                  <h2>View All Menu Items | تمام مینو دیکھیں →</h2>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'subcategories' ? (
          // --- SUB-CATEGORY GRID LANDING ---
          <div className="category-landing-grid sub-category-grid">
            {SUB_CATEGORY_CARDS[activeCategory]?.map((sub, idx) => (
              <div
                key={idx}
                className="category-landing-card"
                onClick={() => {
                  setActiveSubCategory(sub.id);
                  setViewMode('items');
                }}
              >
                <img src={sub.img} alt={sub.title} className="category-bg-img" onError={(e) => { e.target.src = '/logo1.png'; e.target.style.objectFit = 'contain'; e.target.style.padding = '20px'; }} />
                <div className="category-overlay">
                  <h2>{sub.title}</h2>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // --- ITEMS LISTING ---
          <>
            {/* Category Filters */}
            <div className="category-filters">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    setActiveSubCategory('All');
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Deal Sub-Filters */}
            {activeCategory === 'Deals' && (
              <div className="category-filters sub-filters" style={{ marginBottom: '30px', transform: 'scale(0.9)', marginTop: '-20px' }}>
                <button
                  className={`filter-btn ${activeSubCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setActiveSubCategory('All')}
                  style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  All Deals
                </button>
                {DEAL_SUBCATS.map(sub => (
                  <button
                    key={sub}
                    className={`filter-btn ${activeSubCategory === sub ? 'active' : ''}`}
                    onClick={() => setActiveSubCategory(sub)}
                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Burger Sub-Filters */}
            {activeCategory === 'Burgers' && (
              <div className="category-filters sub-filters" style={{ marginBottom: '30px', transform: 'scale(0.9)', marginTop: '-20px' }}>
                <button
                  className={`filter-btn ${activeSubCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setActiveSubCategory('All')}
                  style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  All Burgers
                </button>
                {BURGER_SUBCATS.map(sub => (
                  <button
                    key={sub}
                    className={`filter-btn ${activeSubCategory === sub ? 'active' : ''}`}
                    onClick={() => setActiveSubCategory(sub)}
                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Roll Sub-Filters */}
            {activeCategory === 'Rolls' && (
              <div className="category-filters sub-filters" style={{ marginBottom: '30px', transform: 'scale(0.9)', marginTop: '-20px' }}>
                <button
                  className={`filter-btn ${activeSubCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setActiveSubCategory('All')}
                  style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                >
                  All Rolls
                </button>
                {ROLL_SUBCATS.map(sub => (
                  <button
                    key={sub}
                    className={`filter-btn ${activeSubCategory === sub ? 'active' : ''}`}
                    onClick={() => setActiveSubCategory(sub)}
                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Grid */}
            <div className="menu-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="menu-card glass-panel h-100">
                  <div className="menu-item-left">
                    {item.imagePath ? (
                      <div className="menu-item-icon-container">
                        <img src={item.imagePath} alt={item.name} className="menu-item-icon" />
                      </div>
                    ) : (
                      <div className="menu-item-icon-placeholder">
                        {getCategoryIcon(item.category)}
                      </div>
                    )}
                  </div>
                  <div className="menu-item-right">
                    <div className="menu-title-row">
                      <h3>{item.name}</h3>
                      <span className="menu-price">{item.hasSizes ? `From Rs. ${item.price}` : `Rs. ${item.price}`}</span>
                    </div>
                    <p className="menu-desc">{item.description || 'Premium fast food experience.'}</p>
                    <div className="menu-action">
                      <span className="stock-info">{item.inStock === false ? 'Out of Stock' : 'In Stock'}</span>
                      <button
                        className="btn-highlight"
                        onClick={() => {
                          if (item.hasSizes || item.hasMealOption || (item.category === 'Deals' && item.selections?.length > 0) || (item.category === 'Pizza' && item.flavorSlots > 0)) {
                            setSelectedConfigItem(item);
                            setDealSelections({});
                            setPizzaFlavorSelections({});
                            if (item.hasSizes && item.sizes && item.sizes.length > 0) {
                              setSelectedSize(item.sizes[0]);
                            } else {
                              setSelectedSize(null);
                            }
                            setMakeItMeal(false);
                            setSelectedToppings({ chicken: false, cheese: false, vegetable: false });
                          } else {
                            addToCart({ ...item, itemId: item.id });
                          }
                        }}
                        disabled={item.inStock === false}

                      >
                        {item.inStock === false ? 'Out of Stock | ختم' : (item.hasSizes ? 'Select Size | سائز' : '+')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Configuration Modal (Sizes & Meals) */}
      {selectedConfigItem && (
        <div className="modal-overlay" onClick={() => setSelectedConfigItem(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>Configure | ترتیب دیں<br /><span className="text-gradient">{selectedConfigItem.name}</span></h2>

            {/* Size Selection */}
            {selectedConfigItem.hasSizes || selectedConfigItem.category === 'Drinks' ? (
              <div className="size-options-list">
                {(selectedConfigItem.sizes && selectedConfigItem.sizes.length > 0 ? selectedConfigItem.sizes : (
                  // Default sizes for drinks if none defined
                  [{ size: '300ml', price: selectedConfigItem.price }, { size: '350ml', price: selectedConfigItem.price }]
                )).map((sz, idx) => (
                  <label key={idx} className={`size-btn ${selectedSize?.size === sz.size ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="itemSize"
                      value={sz.size}
                      checked={selectedSize?.size === sz.size}
                      onChange={() => setSelectedSize(sz)}
                      style={{ display: 'none' }}
                    />
                    <span className="sz-name">{sz.size}</span>
                    <span className="sz-price text-gradient">Rs. {sz.price}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {/* Extra Toppings Section for Pizza */}
            {selectedConfigItem.category === 'Pizza' && selectedSize && (
              <div className="toppings-section" style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--accent-color)', fontSize: '1rem' }}>Extra Toppings | اضافی ٹاپنگز 🧀🍖</h4>
                <div className="toppings-grid" style={{ display: 'grid', gap: '10px' }}>
                  {['chicken', 'cheese', 'vegetable'].map(top => {
                    const price = TOPPING_PRICES[selectedSize.size]?.[top] || 0;
                    return (
                      <label key={top} className={`size-btn ${selectedToppings[top] ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedToppings[top]}
                            onChange={() => setSelectedToppings(prev => ({ ...prev, [top]: !prev[top] }))}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{top}</span>
                        </div>
                        <span className="text-gradient">Rs. {price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pizza Flavor Selection */}
            {selectedConfigItem.category === 'Pizza' && selectedConfigItem.flavorSlots > 0 && (
              <div className="pizza-flavors-section" style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--highlight)', fontSize: '1rem' }}>Choose Your Flavors</h4>
                {Array.from({ length: selectedConfigItem.flavorSlots }).map((_, idx) => (
                  <div key={idx} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Flavor {idx + 1}</label>
                    <select
                      className="recipe-select flavor-dropdown-premium"
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        background: 'rgba(255, 179, 71, 0.05)',
                        border: '1px solid rgba(255, 179, 71, 0.2)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}
                      value={pizzaFlavorSelections[idx] || ''}
                      onChange={e => setPizzaFlavorSelections(prev => ({ ...prev, [idx]: e.target.value }))}
                    >
                      <option value="" style={{ background: '#ffffff' }}>Select Flavor...</option>
                      <option value="Shahi Tikka Chicken" style={{ background: '#ffffff' }}>🍗 Shahi Tikka Chicken</option>
                      <option value="Bar BQ Chicken" style={{ background: '#ffffff' }}>🔥 Bar BQ Chicken</option>
                      <option value="Fajita Chicken" style={{ background: '#ffffff' }}>🌶️ Fajita Chicken</option>
                      <option value="Achari Chicken" style={{ background: '#ffffff' }}>🍋 Achari Chicken</option>
                      <option value="Afghani Chicken" style={{ background: '#ffffff' }}>🫓 Afghani Chicken</option>
                    </select>
                  </div>
                ))}
                {Object.keys(pizzaFlavorSelections).length < selectedConfigItem.flavorSlots && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '8px' }}>* Please select all flavors</p>
                )}
              </div>
            )}

            {/* Meal Add-on Selection */}
            {selectedConfigItem.hasMealOption && (
              <div className="meal-addon-section" style={{ marginTop: '15px', marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: 'var(--text-color)' }}>Make it a Meal! | ڈیل بنائیں 🍟🥤</h4>
                <label className={`size-btn ${makeItMeal ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={makeItMeal}
                    onChange={e => setMakeItMeal(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Add Fries & Drink <strong className="text-gradient">(+ Rs. {selectedConfigItem.mealPrice})</strong></span>
                </label>
              </div>
            )}

            {/* Deal Flavor Selection */}
            {selectedConfigItem.category === 'Deals' && selectedConfigItem.selections && selectedConfigItem.selections.length > 0 && (
              <div className="deal-selections" style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--highlight)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Customise Your Deal</h3>
                {selectedConfigItem.selections.map((sel, slotIdx) => {
                  const itemsCount = Number(sel.qty) || 1;
                  return Array.from({ length: itemsCount }).map((_, itemIdx) => {
                    const selectionKey = `${slotIdx}-${itemIdx}`;
                    return (
                      <div key={selectionKey} style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {sel.label} {itemsCount > 1 ? `#${itemIdx + 1}` : ''}
                        </label>
                        <select
                          className="recipe-select"
                          style={{ width: '100%', padding: '10px' }}
                          value={dealSelections[selectionKey]?.id || ''}
                          onChange={e => {
                            const found = menuItems.find(i => i.id === e.target.value);
                            if (found) {
                              setDealSelections(prev => ({
                                ...prev,
                                [selectionKey]: {
                                  id: found.id,
                                  name: found.name,
                                  category: found.category,
                                  size: sel.size,
                                  qty: 1
                                }
                              }));
                            } else {
                              const newSelections = { ...dealSelections };
                              delete newSelections[selectionKey];
                              setDealSelections(newSelections);
                            }
                          }}
                        >
                          <option value="">Select Flavor...</option>
                          {menuItems
                            .filter(i => {
                              if (i.category !== sel.category) return false;
                              if (!sel.size) return true;

                              // Handle items with sizes (Pizza, Pasta, Drinks)
                              if (i.hasSizes && i.sizes) {
                                return i.sizes.some(s => s.size === sel.size || s.size.includes(sel.size));
                              }

                              // Handle items with sub-categories (Rolls, Burgers)
                              if (i.subCategory) {
                                return i.subCategory === sel.size;
                              }

                              return true;
                            })
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(i => <option key={i.id} value={i.id} style={{ background: '#ffffff' }}>{i.name}</option>)
                          }
                        </select>
                      </div>
                    );
                  });
                })}
                {Object.keys(dealSelections).length < selectedConfigItem.selections.reduce((sum, s) => sum + (Number(s.qty) || 1), 0) && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '8px' }}>* Please make all selections</p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn-outline w-100"
                style={{ padding: '12px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setSelectedConfigItem(null)}
              >
                Cancel | منسوخ کریں
              </button>
              <button
                className="btn-highlight w-100"
                style={{ flex: 2 }}
                onClick={() => {
                  let finalPrice = selectedConfigItem.hasSizes && selectedSize ? selectedSize.price : selectedConfigItem.price;
                  let finalName = selectedConfigItem.hasSizes && selectedSize ? `${selectedConfigItem.name} - ${selectedSize.size}` : selectedConfigItem.name;
                  let finalId = (selectedConfigItem.hasSizes && selectedSize) ? `${selectedConfigItem.id}-${selectedSize.size}` : selectedConfigItem.id;

                  // Add Deal selections to ID to ensure unique cart items if different flavors
                  if (selectedConfigItem.category === 'Deals' && Object.keys(dealSelections).length > 0) {
                    const selectionIds = Object.values(dealSelections).map(s => s.id).join('-');
                    finalId += `-${selectionIds}`;
                  }

                  // Add Pizza Flavors to ID
                  if (selectedConfigItem.category === 'Pizza' && selectedConfigItem.flavorSlots > 0 && Object.keys(pizzaFlavorSelections).length > 0) {
                    const flavorIds = Object.values(pizzaFlavorSelections).join('-');
                    finalId += `-${flavorIds}`;
                  }

                  // Add Toppings logic
                  if (selectedConfigItem.category === 'Pizza' && selectedSize) {
                    const prices = TOPPING_PRICES[selectedSize.size];
                    if (selectedToppings.chicken) {
                      finalPrice += prices.chicken;
                      finalName += " + Extra Chicken";
                      finalId += "-extra-chicken";
                    }
                    if (selectedToppings.cheese) {
                      finalPrice += prices.cheese;
                      finalName += " + Extra Cheese";
                      finalId += "-extra-cheese";
                    }
                    if (selectedToppings.vegetable) {
                      finalPrice += prices.vegetable;
                      finalName += " + Extra Vegetable";
                      finalId += "-extra-veg";
                    }
                  }

                  if (selectedConfigItem.hasMealOption && makeItMeal) {
                    finalPrice += Number(selectedConfigItem.mealPrice);
                    finalName += " (with Fries & Drink)";
                    finalId += "-meal";
                  }

                  addToCart({
                    ...selectedConfigItem,
                    itemId: selectedConfigItem.id,
                    id: finalId,
                    name: finalName,
                    price: finalPrice,
                    selectedSize: selectedSize,
                    selectedFlavors: Object.values(dealSelections),
                    selectedPizzaFlavors: Object.values(pizzaFlavorSelections)
                  });
                  setSelectedConfigItem(null);
                }}
                disabled={
                  (selectedConfigItem.category === 'Deals' && selectedConfigItem.selections?.length > 0 && Object.keys(dealSelections).length < selectedConfigItem.selections.reduce((sum, s) => sum + (Number(s.qty) || 1), 0)) ||
                  (selectedConfigItem.category === 'Pizza' && selectedConfigItem.flavorSlots > 0 && Object.keys(pizzaFlavorSelections).length < selectedConfigItem.flavorSlots)
                }
              >
                Confirm Add | شامل کریں
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Menu;
