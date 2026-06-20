import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { ShoppingCart, User, Menu as MenuIcon, X, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { getCartCount } = useCart();
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  const prevCartCount = useRef(0);

  const cartCount = getCartCount();

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setIsCartAnimating(true);
      const timer = setTimeout(() => setIsCartAnimating(false), 2000); // 2 seconds pulse
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container container">
        <Link to="/" className="navbar-logo">
          <img src="/logo.png" alt="Pak Burger Logo" className="logo-img" />
          <span className="logo-text">Pak Burger & Fresh Pizza</span>
        </Link>
        {/* Desktop Menu */}
        <div className="navbar-links desktop-only">
          <Link to="/" className="nav-link">Home | ہوم</Link>
          <Link to="/menu" className="nav-link">Menu | مینو</Link>

          <Link to="/cart" className="nav-link cart-link">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {currentUser ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (userRole === 'staff') navigate('/receptionist');
                  else navigate('/admin');
                }}
                className="nav-icon-btn"
                title="Dashboard"
              >
                <User size={20} />
              </button>
              <button onClick={handleLogout} className="nav-icon-btn" title="Logout">
                <LogOut size={20} color="#ff4444" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-link login-link">Login | لاگ ان</Link>
          )}
        </div>

        {/* Mobile Actions (Visible on Mobile Only) */}
        <div className="mobile-navbar-actions mobile-only">
          <Link to="/cart" className={`nav-link cart-link mobile-cart-btn ${isCartAnimating ? 'cart-pop-anim' : ''}`}>
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <button className="mobile-toggle" onClick={toggleMenu}>
            {isMobileMenuOpen ? <X size={26} /> : <MenuIcon size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-nav-link" onClick={toggleMenu}>Home | ہوم</Link>
          <Link to="/menu" className="mobile-nav-link" onClick={toggleMenu}>Menu | مینو</Link>
          <Link to="/cart" className="mobile-nav-link cart-link" onClick={toggleMenu}>
            Cart | کارٹ {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          {currentUser ? (
            <>
              <Link
                to={userRole === 'staff' ? '/receptionist' : '/admin'}
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                Dashboard | ڈیش بورڈ
              </Link>
              <button onClick={() => { handleLogout(); toggleMenu(); }} className="mobile-nav-link" style={{ background: 'none', border: 'none', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: '#ff4444', width: '100%', cursor: 'pointer' }}>Logout | لاگ آؤٹ</button>
            </>
          ) : (
            <Link to="/login" className="mobile-nav-link" onClick={toggleMenu}>Login | لاگ ان</Link>
          )}
        </div>
      )}
    </nav>
  );
};
export default Navbar;