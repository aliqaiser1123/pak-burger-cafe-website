import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import './Home.css';

const Home = () => {
  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "Pak Burger House Khanewal",
    "image": "https://pakburger.com/logo.png",
    "url": "https://pakburger.com/",
    "telephone": "+923284403205",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Main Road",
      "addressLocality": "Khanewal",
      "addressRegion": "Punjab",
      "addressCountry": "PK"
    },
    "servesCuisine": "Burgers, Pizza, Fast Food",
    "priceRange": "₨ 150 - ₨ 2500"
  };

  return (
    <div className="home-page">
      <SEO
        title="Pak Burger & Fresh Pizza Khanewal"
        description="Looking for the best Pak Burger Shop in Khanewal? Visit Pak Burger House for premium burgers, cheesy pizzas, and deals. The #1 fast food cafe and restaurant for quality and taste."
        keywords="Pak Burger Shop Khanewal, Best Fast Food Cafe Khanewal, Best Restaurant in Khanewal, Pak Burger House, Pizza Khanewal, Fast Food Delivery, Burger Shop Khanewal"
        canonical="https://pakburger.com/"
        schemaMarkup={homeSchema}
      />
      {/* Hero Section */}
      <section className="hero-section splash-theme split-layout">
        <div className="container hero-content-split">

          {/* Left Column: Text & CTA */}
          <div className="hero-text-left">
            <div className="hero-brand-area">
              <img src="/logo.png" alt="Pak Burger House Khanewal Logo" className='logo-image' />
              <h1 className="title-main">PAK</h1>
              <h2 className="title-sub">BURGER & FRESH PIZZA</h2>
            </div>

            <h4 className="hero-description">
              Taste, Quality & Quantity At One Place <br />
              <span style={{ fontSize: '0.85em', color: '#ffb347', display: 'block', marginTop: '5px' }}>ذائقہ، معیار اور مقدار ایک ہی جگہ</span>
            </h4>
            <p className="hero-subtitle">
              <strong>Make your order now. <br /> <span style={{ fontSize: '0.9em', fontWeight: 'normal' }}>ابھی اپنا آرڈر کریں۔</span></strong>
            </p>

            <div className="hero-cta">
              <Link to="/menu" className="btn-primary-splash">Order Now | ابھی آرڈر کریں</Link>
              <Link to="/menu" className="btn-secondary-splash">View Menu | مینو دیکھیں</Link>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="hero-visual-right">
            <div className="hero-burger-container">
              <div className="burger-glow"></div>
              <div className="floating-decorations">
                <span className="leaf l1">🍃</span>
                <span className="leaf l2">🌿</span>
                <span className="leaf l3">🍃</span>
              </div>
              <img src="/logo1.png" alt="Spicy Splashing Burger" className="main-burger-img" height="400" width="400" />
            </div>
          </div>

        </div>
      </section>

      {/* SEO Content Section for Local Ranking */}
      <section className="seo-about-section container glass-panel" style={{ padding: '60px 40px', marginTop: '0px', marginBottom: '20px', borderRadius: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ color: '#818181ff', marginBottom: '20px', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)' }}>
          The Best Burger & Pizza directly in <span className="text-gradient">Khanewal</span>
          <br /><span style={{ fontSize: '0.7em', display: 'block', marginTop: '10px' }}>خانیوال میں بہترین برگر اور پیزا</span>
        </h2>
        <p style={{ color: '#ff6600ff', lineHeight: '1.8', fontSize: '1.1rem', maxWidth: '850px', margin: '0 auto' }}>
          Located in the heart of Block 16, Khanewal, <strong>Pak Burger & Fresh Pizza</strong> has been serving the crispiest Zinger Burgers and the cheesiest handcrafted pizzas in the city. Whether you are craving a spicy late-night snack, looking for value family deals, or want fast and fresh food delivery right to your doorstep, we are the top-rated local dining and takeaway choice. Taste the premium difference today!
          <br /><br />
          <span style={{ color: '#ffb347', fontSize: '0.95rem' }} dir="rtl">
            خانیوال کے بلاک 16 میں واقع پاک برگر اینڈ فریش پیزا شہر کے بہترین اور کرسپی زنگر برگر اور چیز سے بھرپور پیزا پیش کر رہا ہے۔ چاہے آپ کو رات گئے کچھ چٹپٹا کھانے کی طلب ہو، فیملی ڈیلز کی تلاش ہو، یا گھر کی دہلیز پر گرما گرم اور تازہ کھانا منگوانا ہو، ہم مقامی لوگوں کی پہلی پسند ہیں۔ آج ہی پریمیم ذائقے کا تجربہ کریں!
          </span>
        </p>
      </section>

      {/* Features Section */}
      <section className="features-section container">
        <div className="feature-card glass-panel">
          <div className="feature-icon">🍔</div>
          <h3>Premium Beef <br /><span style={{ fontSize: '0.75em', color: 'var(--highlight)' }}>پریمیم بیف</span></h3>
          <p>100% halal, grass-fed beef patties grilled to perfection.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">🚀</div>
          <h3>Fast Delivery <br /><span style={{ fontSize: '0.75em', color: 'var(--highlight)' }}>تیز ڈلیوری</span></h3>
          <p>Order via WhatsApp for lightning-fast local delivery.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon">🔥</div>
          <h3>Secret Sensations <br /><span style={{ fontSize: '0.75em', color: 'var(--highlight)' }}>خاص ذائقہ</span></h3>
          <p>Drenched in our signature homemade sauces.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
