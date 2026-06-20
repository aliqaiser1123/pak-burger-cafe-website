import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer glass-panel">
      <div className="container footer-content">
        <div className="footer-brand">
          <img src="/logo.png" alt="Pak Burger Footer" className="footer-logo" />
          <h3 style={{ color: 'white', marginBottom: '5px' }}>Pak Burger & Fresh Pizza</h3>
          <p style={{ fontStyle: 'italic', marginBottom: '10px' }}>"Simply The Best In Town"</p>
          <p className="delivery-policy">Delivery Policy: Minimum Rs: 50 and Rs: 10 on every 100 meter afterwards.</p>
        </div>
        <div className="footer-links">
          <h4>Navigation</h4>
          <Link to="/">Home</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/cart">Cart</Link>
        </div>
        <div className="footer-contact">
          <h4>Contact Us</h4>
          <p><strong>Address:</strong> Block No 16, Chowk Ahl-e-Hadees, Khanewal.</p>
          <p><strong>Phones:</strong></p>
          <ul>
            <li>0336-5356535</li>
            <li>0333-6219705</li>
            <li>0308-7576224</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} PAK BURGER. All rights reserved.</p>
        <p>Developed by Muhammad Ali from Classics Matrix Lab.</p>
        <p><strong>Contact: 0310-6643436</strong></p>
      </div>
    </footer>
  );
};
export default Footer;