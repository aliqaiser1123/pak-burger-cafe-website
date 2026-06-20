import { useCart } from '../context/CartContext';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CartNotification.css';

const CartNotification = () => {
  const { toast } = useCart();
  const navigate = useNavigate();

  if (!toast.visible) return null;

  return (
    <div
      className="cart-notification-toast glass-panel"
      onClick={() => navigate('/cart')}
      style={{ cursor: 'pointer' }}
    >
      <div className="toast-icon">
        <ShoppingCart size={20} />
      </div>
      <div className="toast-content">
        <p>{toast.message}</p>
        <span style={{ fontSize: '0.75rem', color: 'black', marginTop: '2px', display: 'block' }}>Tap to view cart</span>
      </div>
    </div>
  );
};

export default CartNotification;
