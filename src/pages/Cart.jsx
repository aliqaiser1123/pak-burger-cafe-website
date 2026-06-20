import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, MapPin, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';
import './Cart.css';

const SHOP_COORDS = { lat: 30.2962, lng: 71.9219 }; // Precise Pak Burger & Pizza Location

// Removed KHANEWAL_AREAS as it's replaced by address geocoding

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [isOrdering, setIsOrdering] = useState(false);
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({ distance: null, fee: 0, coords: null });
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('gps'); // 'gps' or 'address'
  const [searchAddress, setSearchAddress] = useState('');
  const navigate = useNavigate();

  const calculateDrivingDistance = async (lat, lng) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${SHOP_COORDS.lng},${SHOP_COORDS.lat}?overview=false`);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        return data.routes[0].distance;
      }
      return getHaversineDistance(lat, lng, SHOP_COORDS.lat, SHOP_COORDS.lng);
    } catch (e) {
      return getHaversineDistance(lat, lng, SHOP_COORDS.lat, SHOP_COORDS.lng);
    }
  };

  const handleCheckoutClick = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setShowDeliveryConfirm(true);
  };

  const calculateDelivery = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsCalculatingDistance(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      const distanceInMeters = await calculateDrivingDistance(latitude, longitude);
      const distanceInKm = (distanceInMeters / 1000).toFixed(2);

      // Delivery fee: 50 Rs for up to 500m, +5 Rs for every additional 100m
      let fee = 50;
      if (distanceInMeters > 500) {
        fee = 50 + Math.ceil((distanceInMeters - 500) / 100) * 5;
      }

      setDeliveryDetails({
        distance: distanceInKm,
        fee: fee,
        coords: { lat: latitude, lng: longitude },
        method: 'gps'
      });
    } catch (error) {
      console.error("GPS Error:", error);
      alert("GPS failed. Please enter your address manually instead.");
      setDeliveryMethod('address');
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const calculateFromAddress = async () => {
    if (!searchAddress.trim()) {
      alert("Please enter your address first.");
      return;
    }
    // Don't calculate fee here. Let restaurant do it.
    setDeliveryDetails({
      distance: null,
      fee: 0,
      coords: null,
      method: 'address',
      addressName: searchAddress + (searchAddress.toLowerCase().includes('khanewal') ? '' : ', Khanewal')
    });
  };

  const proceedWithOrder = async () => {
    setShowDeliveryConfirm(false);
    setIsOrdering(true);
    try {
      const invoiceId = `PKB-O-${Date.now()}`;
      const subtotal = getCartTotal();
      const finalTotal = subtotal + deliveryDetails.fee;

      // Ensure 'Khanewal' is appended to the final address
      let finalAddress = customerInfo.address;
      if (deliveryMethod === 'address' && searchAddress.trim()) {
        finalAddress = searchAddress;
      }
      if (!finalAddress.toLowerCase().includes('khanewal')) {
        finalAddress += ', Khanewal';
      }

      const orderData = {
        invoiceId,
        orderType: 'Online',
        customer: { ...customerInfo, address: finalAddress, coords: deliveryDetails.coords },
        items: cart.map(item => ({
          itemId: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          selectedSize: item.selectedSize || null,
          selectedFlavors: item.selectedFlavors || [],
          selectedPizzaFlavors: item.selectedPizzaFlavors || []
        })),
        subtotal,
        deliveryFee: deliveryDetails.fee,
        distance: deliveryDetails.distance,
        total: finalTotal,
        status: 'pending',
        stockDeducted: false,
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // ----- Automated Stock Deduction REMOVED FROM HERE -----
      // Stock is now deducted only when the receptionist marks the order as 'delivered'

      // Setup WhatsApp message
      const itemsList = cart.map(item => {
        let text = `${item.qty}x ${item.name}`;
        if (item.selectedFlavors && item.selectedFlavors.length > 0) {
          const flavors = item.selectedFlavors.map(f => `${(f.qty && f.qty > 1) ? f.qty + 'x ' : ''}${f.name}`).join(', ');
          text += ` (Flavors: ${flavors})`;
        }
        if (item.selectedPizzaFlavors && item.selectedPizzaFlavors.length > 0) {
          text += ` (Flavors: ${item.selectedPizzaFlavors.join(', ')})`;
        }
        return text;
      }).join('%0A');
      const waText = `*New Order: ${invoiceId}*%0A%0A*Name:* ${customerInfo.name}%0A*Phone:* ${customerInfo.phone}%0A*Address:* ${finalAddress}%0A*Distance:* ${deliveryDetails.distance} km%0A%0A*Items:*%0A${itemsList}%0A%0A*Subtotal: Rs. ${subtotal}*%0A*Delivery: Rs. ${deliveryDetails.fee}*%0A*Total: Rs. ${finalTotal}*`;

      const PHONE_NUMBER = '923365356535'; // Replace with actual number
      const waUrl = `https://wa.me/${PHONE_NUMBER}?text=${waText}`;

      // Open WhatsApp & Clear cart
      window.open(waUrl, '_blank');
      clearCart();
      navigate('/');

      alert('Order placed successfully! Redirecting to WhatsApp...');

    } catch (error) {
      console.error("Error placing order:", error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsOrdering(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container empty-cart">
        <h2>Your Cart is Empty | آپ کی کارٹ خالی ہے</h2>
        <p>Looks like you haven't added any premium burgers yet.</p>
        <Link to="/menu" className="btn-primary mt-4" style={{ display: 'inline-block' }}>Browse Menu | مینو دیکھیں</Link>
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <SEO
        title="Your Shopping Cart"
        description="Review your burger and pizza order before checkout at Pak Burger House Khanewal."
        canonical="/cart"
        noindex={true}
      />
      <h1 className="mb-4">Your <span className="text-gradient">Cart</span> <br /><span style={{ fontSize: '0.5em', color: '#ffb347', display: 'block', marginTop: '5px' }}>آپ کی کارٹ</span></h1>

      <div className="cart-layout">
        <div className="cart-items-section">
          {cart.map(item => (
            <div key={item.id} className="cart-item glass-panel">
              <div className="item-info">
                <h3>{item.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="item-price">Rs. {item.price}</span>
                  {item.selectedPizzaFlavors && item.selectedPizzaFlavors.length > 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--highlight)' }}>
                      Flavors: {item.selectedPizzaFlavors.join(', ')}
                    </span>
                  )}
                  {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--highlight)' }}>
                      Included: {item.selectedFlavors.map(f => f.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="item-controls">
                <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="qty-btn" disabled={item.qty <= 1}>
                  <Minus size={16} />
                </button>
                <span className="item-qty">{item.qty}</span>
                <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="qty-btn">
                  <Plus size={16} />
                </button>
                <button onClick={() => removeFromCart(item.id)} className="remove-btn ml-3">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="checkout-section glass-panel">
          <h2>Order Summary | آرڈر کی تفصیل</h2>
          <div className="summary-row mt-3">
            <span>Subtotal | کل رقم</span>
            <span>Rs. {getCartTotal()}</span>
          </div>
          <div className="summary-row" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span>Delivery {deliveryDetails.distance && `(${deliveryDetails.distance} km)`} | ڈلیوری چارجز</span>
            <span style={{ color: '#ffb347' }}>{deliveryDetails.distance ? `Rs. ${deliveryDetails.fee}` : 'To Be Checked'}</span>
          </div>

          <div className="summary-row total-row mt-3 mb-4">
            <span>Total | کل</span>
            <span className="text-gradient">Rs. {getCartTotal() + deliveryDetails.fee}</span>
          </div>

          <form onSubmit={handleCheckoutClick} className="checkout-form">
            <h3 className="mb-3">Delivery Details | ڈلیوری کی تفصیلات</h3>
            <input
              type="text"
              placeholder="Full Name / پورا نام"
              required
              className="form-input"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            />
            <input
              type="tel"
              placeholder="Phone Number / فون نمبر"
              required
              className="form-input"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
            />

            <textarea
              placeholder="Complete Delivery Address (e.g. Block 15, Near Jamia Masjid) / مکمل پتہ"
              required
              className="form-input"
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              style={{ minHeight: '80px', marginBottom: '10px' }}
            />

            <button type="submit" className="btn-highlight w-100 mt-2" disabled={isOrdering}>
              {isOrdering ? 'Processing...' : 'Proceed to Delivery | آگے بڑھیں'}
            </button>
          </form>
        </div>
      </div>

      {/* Hybrid Delivery Setup Modal */}
      {showDeliveryConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'rgba(26, 17, 13, 0.98)', padding: '30px', borderRadius: '24px',
            maxWidth: '450px', width: '100%', textAlign: 'center',
            border: '1px solid rgba(255, 179, 71, 0.3)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ color: '#ffb347', marginBottom: '5px', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              📍 Delivery Fees
            </h2>
            <p style={{ color: '#d1b8a7', fontSize: '0.9rem', marginBottom: '20px' }}>
              How should we calculate your delivery fee?
            </p>

            {/* Method Toggle */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(16, 15, 15, 0.05)', padding: '5px', borderRadius: '12px' }}>
              <button
                type="button"
                onClick={() => setDeliveryMethod('gps')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: deliveryMethod === 'gps' ? 'var(--highlight)' : 'transparent',
                  color: deliveryMethod === 'gps' ? 'white' : 'white', fontWeight: 'bold', fontSize: '0.85rem',
                }}
              >
                Auto (GPS) | آٹو
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMethod('address')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: deliveryMethod === 'address' ? 'var(--highlight)' : 'transparent',
                  color: deliveryMethod === 'address' ? 'white' : 'white', fontWeight: 'bold', fontSize: '0.85rem'
                }}
              >
                Enter Address | پتہ لکھیں
              </button>
            </div>

            {deliveryMethod === 'gps' ? (
              <button
                type="button"
                className="btn-highlight w-100"
                style={{ padding: '16px', borderRadius: '15px', marginBottom: '20px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                onClick={calculateDelivery}
                disabled={isCalculatingDistance}
              >
                {isCalculatingDistance ? (
                  <><Loader2 className="animate-spin" size={20} /> Calculating...</>
                ) : (
                  <><MapPin size={22} /> Detect My Location | میری لوکیشن</>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Enter your address"
                  className="form-input"
                  style={{ width: '100%', background: 'transparent', color: 'white', border: '1px solid var(--glass-border)', padding: '12px' }}
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-highlight w-100"
                  style={{ padding: '12px', borderRadius: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  onClick={calculateFromAddress}
                  disabled={isCalculatingDistance || !searchAddress.trim()}
                >
                  {isCalculatingDistance ? (
                    <><Loader2 className="animate-spin" size={20} /> Calculating...</>
                  ) : (
                    <><MapPin size={22} /> Search & Calculate | تلاش کریں</>
                  )}
                </button>
              </div>
            )}

            {deliveryDetails.method && (
              <div style={{ background: 'rgba(255, 179, 71, 0.1)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255, 179, 71, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: 'white' }}>Method:</span>
                  <span style={{ color: 'var(--highlight)', fontSize: '0.9rem' }}>{deliveryDetails.method === 'gps' ? `GPS (${deliveryDetails.distance}km)` : `Address`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'white' }}>Delivery Fee:</span>
                  <span style={{ color: 'var(--highlight)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {deliveryDetails.fee > 0 ? `Rs. ${deliveryDetails.fee}` : 'To be calculated'}
                  </span>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.85rem', direction: 'rtl', color: '#ffb347', marginBottom: '20px', opacity: 0.8 }}>
              ڈلیوری چارجز: 5 روپے فی 100 میٹر (کم از کم 50 روپے)۔
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="button"
                onClick={() => setShowDeliveryConfirm(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#d1b8a7', borderRadius: '50px', cursor: 'pointer' }}
              >
                Cancel | منسوخ کریں
              </button>
              <button
                type="button"
                onClick={proceedWithOrder}
                className="btn-highlight"
                style={{ flex: 2, padding: '12px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={isCalculatingDistance || !deliveryDetails.method}
              >
                Confirm & Order | آرڈر کنفرم کریں
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
