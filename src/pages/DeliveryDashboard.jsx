import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { deductOrderStock } from '../utils/inventoryHelpers';
import SEO from '../components/SEO';
import { Package, MapPin, CheckCircle, Navigation } from 'lucide-react';

const DeliveryDashboard = () => {
  const { currentUser } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myActiveOrders, setMyActiveOrders] = useState([]);
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to all online orders that are either ready or assigned to this driver
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      let available = [];
      let active = [];
      let countToday = 0;

      snapshot.forEach(d => {
        const data = d.data();
        const ordDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
        
        // Count today's delivered explicitly for this driver
        if (data.deliveryBoyId === currentUser.uid && data.status === 'delivered' && ordDate >= todayStart && ordDate <= todayEnd) {
          countToday++;
        }

        // Only process Online orders for assignment
        if (data.orderType !== 'Online') return;

        const orderObj = { id: d.id, ...data };

        if (data.status === 'ready' && !data.deliveryBoyId) {
          // Available for pickup
          available.push(orderObj);
        } else if (data.status === 'out_for_delivery' && data.deliveryBoyId === currentUser.uid) {
          // Currently driving
          active.push(orderObj);
        }
      });

      setAvailableOrders(available.sort((a,b) => b.createdAt - a.createdAt));
      setMyActiveOrders(active);
      setDailyCount(countToday);
    });

    return () => unsubscribeOrders();
  }, [currentUser]);

  const takeOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'out_for_delivery',
        deliveryBoyId: currentUser.uid
      });
    } catch (err) {
      console.error("Error taking order:", err);
      alert("Could not take this order. Someone else might have grabbed it.");
    }
  };

  const markDelivered = async (order) => {
    try {
      // Run the complex inventory deduction!
      if (!order.stockDeducted) {
        await deductOrderStock(order.items);
      }
      
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'delivered',
        stockDeducted: true
      });
      alert('Order Marked Delivered Successfully!');
    } catch (err) {
      console.error("Error marking delivered:", err);
      alert("An error occurred during delivery completion.");
    }
  };

  const openMaps = (order) => {
    if (order.customer?.coords) {
      const { lat, lng } = order.customer.coords;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customer?.address)}`);
    }
  };

  return (
    <div className="section-padding container pt-5 mt-5">
      <SEO title="Delivery Pilot | Pak Burger House" description="Delivery team tracking portal." />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Navigation size={32}/> Pilot Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Drive safe, deliver fresh.</p>
        </div>
        <div className="glass-panel" style={{ padding: '15px 25px', textAlign: 'center', borderColor: 'var(--highlight)' }}>
          <div style={{ fontSize: '2rem', color: 'var(--highlight)', fontWeight: 'bold' }}>{dailyCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', textTransform: 'uppercase' }}>Orders Today</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '30px', alignItems: 'start' }}>
        
        {/* Active Deliveries */}
        <div className="glass-panel">
          <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin color="var(--highlight)"/> Driving Now
          </h2>
          {myActiveOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>You have no active deliveries.</p>
          ) : (
            myActiveOrders.map(order => (
              <div key={order.id} style={{ border: '1px solid var(--highlight)', borderRadius: '12px', padding: '15px', marginBottom: '15px', background: 'rgba(255, 179, 71, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>{order.invoiceId}</strong>
                  {order.customer?.phone && (
                    <a href={`tel:${order.customer.phone}`} style={{ color: 'var(--highlight)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📞 {order.customer.phone}
                    </a>
                  )}
                </div>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem' }}>
                  <div><strong>Customer:</strong> {order.customer?.name}</div>
                  <div><strong>Address:</strong> {order.customer?.address}</div>
                  {order.deliveryFee > 0 && <div style={{ color: 'var(--highlight)', marginTop: '5px' }}>Delivery Fee: Rs. {order.deliveryFee}</div>}
                  <div style={{ marginTop: '5px' }}><strong>Collect:</strong> Rs. {order.total}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => openMaps(order)} className="btn-outline w-100" style={{ padding: '12px', flex: 1 }}>Navigate</button>
                  <button onClick={() => markDelivered(order)} className="btn-highlight w-100" style={{ padding: '12px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><CheckCircle size={18}/> Mark Delivered</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Available Orders */}
        <div className="glass-panel">
          <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package /> Ready for Pickup
          </h2>
          {availableOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No orders waiting right now.</p>
          ) : (
            availableOrders.map(order => (
              <div key={order.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', marginBottom: '15px', background: 'rgba(0, 0, 0, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <strong>{order.invoiceId}</strong>
                  <span style={{ background: '#333', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{order.items?.length} items</span>
                </div>
                <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#ccc' }}>
                  Near {order.customer?.address?.substring(0, 25)}...
                </div>
                <button onClick={() => takeOrder(order.id)} className="btn-primary w-100" style={{ padding: '10px' }}>Take Delivery</button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default DeliveryDashboard;
