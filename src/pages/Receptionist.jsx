import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, increment, query, where, runTransaction, setDoc } from 'firebase/firestore';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { deductOrderStock } from '../utils/inventoryHelpers';
import './Receptionist.css';

const ReceptionistPanel = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [activePosCategory, setActivePosCategory] = useState('All');
  const [activePosSubCategory, setActivePosSubCategory] = useState('All');
  const [posOrderType, setPosOrderType] = useState('Takeaway'); // 'Service' or 'Takeaway'

  const [selectedConfigItem, setSelectedConfigItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [makeItMeal, setMakeItMeal] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState({ chicken: false, cheese: false, vegetable: false });
  const [dealSelections, setDealSelections] = useState({});
  const [pizzaFlavorSelections, setPizzaFlavorSelections] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'not-in', ['delivered', 'cancelled']));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ords = [];
      snapshot.forEach(d => {
        ords.push({ id: d.id, ...d.data() });
      });
      setOrders(ords);
    });

    const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() }));
      setMenuItems(items);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, []);

  const updateStatus = async (order, newStatus) => {
    try {
      // If moving to ready and not already deducted, perform deduction
      if (newStatus === 'ready' && !order.stockDeducted) {
        try {
          await deductOrderStock(order.items);
        } catch (itemErr) {
          console.error("Error deducting stock:", itemErr);
        }

        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus,
          stockDeducted: true
        });
        alert('Order Marked Ready & Stock Deducted!');
      } else {
        await updateDoc(doc(db, 'orders', order.id), {
          status: newStatus
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert('Failed to update status');
    }
  };

  const handleAddDeliveryFee = async (order) => {
    const feeStr = prompt(`Enter delivery fee (Rs) for ${order.customer.name}\nAddress: ${order.customer.address}`);
    if (!feeStr && feeStr !== '0') return;

    const fee = parseInt(feeStr, 10);
    if (isNaN(fee) || fee < 0) {
      alert("Invalid fee amount");
      return;
    }

    try {
      const currentFee = order.deliveryFee || 0;
      const newTotal = order.total - currentFee + fee;

      await updateDoc(doc(db, 'orders', order.id), {
        deliveryFee: fee,
        total: newTotal
      });
      alert(`Delivery fee of Rs. ${fee} applied successfully!`);
    } catch (error) {
      console.error("Error adding delivery fee:", error);
      alert("Failed to add delivery fee.");
    }
  };

  const handlePrint = (order) => {
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
    const formattedDate = orderDate.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const deliveryFee = order.deliveryFee || 0;

    const commonStyles = `
        @page { margin: 0; size: 3in auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Arimo', sans-serif;
          width: 4in;
          max-width: 4in;
          margin: 0 auto;
          padding: 6mm 4mm;
          font-size: 16px;
          font-weight: 700;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        .divider-bold { border: none; border-top: 2px solid #000; margin: 8px 0; }
        .divider-double { border: none; border-top: 3px double #000; margin: 10px 0; }
      `;

    // COMBINED SLIP HTML
    const combinedHtml = `
      <html>
        <head>
          <title>Print - ${order.invoiceId}</title>
          <link href="https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&display=swap" rel="stylesheet">
          <style>
            ${commonStyles}
            /* Counter Styles */
            .header { text-align: center; padding-bottom: 6px; }
            .info-table { width: 100%; font-size: 15px; margin: 4px 0; font-weight: 700; }
            .info-table td { padding: 2px 0; vertical-align: top; }
            .info-label { font-weight: 700; width: 75px; }
            .items-header { display: flex; justify-content: space-between; font-weight: 900; font-size: 13px; padding: 4px 0; border-bottom: 1px solid #000; border-top: 1px solid #000; text-transform: uppercase; letter-spacing: 1px; }
            .item-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; align-items: flex-start; }
            .item-row.kitchen { border-bottom: 2px dashed #000; padding: 10px 0; font-size: 20px; font-weight: 900; }
            .item-name { flex: 1; font-size: 15px; font-weight: 700; line-height: 1.3; padding-right: 4px; }
            .item-name.kitchen { font-size: 20px; }
            .item-qty { width: 30px; text-align: center; font-size: 15px; font-weight: 700; }
            .item-qty.kitchen { width: 55px; font-size: 26px; font-weight: 900; color: #000; }
            .item-price { width: 65px; text-align: right; font-size: 15px; font-weight: 700; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; padding: 3px 0; font-weight: 700; }
            .total-row.grand { font-size: 20px; font-weight: 900; padding: 6px 0; letter-spacing: 1px; }
            .footer { text-align: center; margin-top: 10px; padding-bottom: 10px; }
            
            /* Kitchen Styles */
            .kitchen-header { text-align: center; border: 2px dashed #000; padding: 8px; margin-bottom: 12px; }
            .kitchen-title { font-size: 26px; font-weight: 900; letter-spacing: 1px; }
            .item-detail { font-size: 15px; font-weight: 700; display: block; margin-top: 5px; color: #333; }
            
            /* Page Break */
            .page-break {
              page-break-after: always;
              break-after: page;
              margin-top: 15px;
              margin-bottom: 15px;
              border-bottom: 1px dashed #ccc;
              text-align: center;
              font-size: 10px;
              color: #999;
              padding-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <!-- 1. COUNTER RECEIPT -->
          <div class="receipt">
            <div class="header">
              <img src="/slip_logo.png" style="width: 50mm; height: auto; margin-bottom: 5px;" alt="Logo" />
              <div style="font-size: 17px; text-align: center; margin-bottom: 5px;">
                Pak Burger House<br/>Block No 16, Chowk Ahl-e-Hadees, Khanewal<br/>Contact: 03106643436
              </div>
              <hr class="divider" />
            </div>
            <table class="info-table">
              <tr><td class="info-label">Invoice:</td><td><strong>${order.invoiceId}</strong></td></tr>
              <tr><td class="info-label">Customer:</td><td style="font-size: 15px; font-weight: 900;">${order.customer?.name || 'Walk-in'}</td></tr>
              <tr><td class="info-label">Date:</td><td>${formattedDate}  ${formattedTime}</td></tr>
            </table>
            <hr class="divider-bold" />
            <div class="items-header"><span>Item</span><span>Qty</span><span>Amount</span></div>
            <div class="items-list">
              ${order.items.map(item => {
                let flavors = '';
                if (item.selectedPizzaFlavors && item.selectedPizzaFlavors.length > 0) {
                  flavors = `<div style="font-size: 10px; color: #333; font-weight: normal;">Flavors: ${item.selectedPizzaFlavors.join(', ')}</div>`;
                } else if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                  flavors = `<div style="font-size: 10px; color: #333; font-weight: normal;">Included: ${item.selectedFlavors.map(f => f.name).join(', ')}</div>`;
                }
                return `
                  <div class="item-row" style="flex-wrap: wrap;">
                    <div class="item-name" style="width: 100%;">
                      ${item.name}
                      ${flavors}
                    </div>
                    <div class="item-qty" style="width: 30px; text-align: center;">${item.qty}</div>
                    <div class="item-price" style="width: 65px; text-align: right;">Rs.${(item.price * item.qty).toLocaleString()}</div>
                  </div>
                `;
              }).join('')}
            </div>
            <hr class="divider-bold" />
            <div class="totals-section">
              <div class="total-row"><span>Subtotal</span><span>Rs.${subtotal.toLocaleString()}</span></div>
              ${deliveryFee > 0 ? `<div class="total-row"><span>Delivery</span><span>Rs.${deliveryFee.toLocaleString()}</span></div>` : ''}
              <hr class="divider-double" />
              <div class="total-row grand"><span>TOTAL DUE</span><span>Rs.${order.total.toLocaleString()}</span></div>
            </div>
            <hr class="divider-double" />
            <div class="footer">
              <div style="font-weight: 900; font-size: 15px; text-transform: uppercase;">pakburger.com</div>
              <div style="font-size: 12px; margin-top: 5px;">Developed by Muhammad Ali 03106643436</div>
            </div>
          </div>

          <div class="page-break">
            --- CUT HERE ---
          </div>

          <!-- 2. KITCHEN SLIP -->
          <div class="receipt" style="padding-top: 10px;">
            <div class="kitchen-header">
              <div class="kitchen-title">KITCHEN SLIP</div>
              <div style="font-size: 20px; font-weight: 900; margin-top: 5px;">INV: ${order.invoiceId}</div>
              <div style="font-size: 16px; font-weight: 900; margin-top: 5px;">Customer: ${order.customer?.name || 'Walk-in'}</div>
            </div>
            <div class="items-list">
              ${order.items.map(item => {
                let detail = '';
                if (item.selectedSize) {
                  detail = typeof item.selectedSize === 'object' ? item.selectedSize.size : item.selectedSize;
                }

                let flavors = '';
                if (item.selectedPizzaFlavors && item.selectedPizzaFlavors.length > 0) {
                  flavors = item.selectedPizzaFlavors.join(', ');
                } else if (item.selectedFlavors && item.selectedFlavors.length > 0) {
                  flavors = item.selectedFlavors.map(f => f.name).join(', ');
                }

                return `
                  <div class="item-row kitchen">
                    <div class="item-qty kitchen">${item.qty}x</div>
                    <div class="item-name kitchen">
                      ${item.name}
                      ${detail ? '<span class="item-detail">(' + detail + ')</span>' : ''}
                      ${flavors ? '<div class="item-detail" style="font-weight: 900; text-transform: uppercase;">FLAVORS: ' + flavors + '</div>' : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <script>
            setTimeout(function() { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `;

    // Open Single Window for Printing
    const printWin = window.open('', '_blank', 'width=400,height=800');
    printWin.document.write(combinedHtml);
    printWin.document.close();
  };

  // ----- POS Functions -----
  const addToPosCart = (item) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updatePosQty = (id, change) => {
    setPosCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + change } : i).filter(i => i.qty > 0));
  };

  const removePosItem = (id) => {
    setPosCart(prev => prev.filter(i => i.id !== id));
  };

  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handlePlacePosOrder = async () => {
    if (posCart.length === 0) return;
    try {
      const typePrefix = posOrderType === 'Service' ? 'PKB-S-' : 'PKB-T-';
      // Generate sequential invoice number using Firestore counter
      const counterRef = doc(db, 'counters', 'invoice');
      let invoiceNumber;
      await runTransaction(async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        if (!counterSnap.exists()) {
          transaction.set(counterRef, { count: 1 });
          invoiceNumber = 1;
        } else {
          const newCount = (counterSnap.data().count || 0) + 1;
          transaction.update(counterRef, { count: newCount });
          invoiceNumber = newCount;
        }
      });
      const invoiceId = `${typePrefix}${String(invoiceNumber).padStart(2, '0')}`;
      const orderData = {
        invoiceId,
        orderType: posOrderType,
        customer: { name: customerName || 'Walk-in Customer', phone: 'On-Site', address: posOrderType },
        items: posCart.map(item => ({
          itemId: item.itemId || item.id, // Save correct original menu ID
          name: item.name,
          price: item.price,
          qty: item.qty,
          selectedSize: item.selectedSize || null,
          selectedFlavors: item.selectedFlavors || []
        })),
        total: posTotal,
        status: 'pending', // Starts pending, receptionist can move to prep/ready
        stockDeducted: false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);

      // ----- Automated Stock Deduction REMOVED FROM HERE -----
      // We now deduct stock ONLY when the order is marked as 'delivered'

      // Reset
      setPosCart([]);
      setCustomerName('');
      setIsPosOpen(false);
      alert('Walk-in Order Placed!');
    } catch (e) {
      console.error(e);
      alert("Failed to place POS order");
    }
  };

  const POS_CATEGORIES = ['All', 'Pizza', 'Burgers', 'Rolls', 'Pasta', 'Bites', 'Drinks', 'Deals'];

  const TOPPING_PRICES = {
    'Personal (6")': { chicken: 80, cheese: 80, vegetable: 60 },
    'Small (7")': { chicken: 100, cheese: 100, vegetable: 80 },
    'Medium (10")': { chicken: 150, cheese: 150, vegetable: 120 },
    'Large (13")': { chicken: 250, cheese: 250, vegetable: 200 },
    'XL (16")': { chicken: 350, cheese: 350, vegetable: 300 },
    'XXL (21")': { chicken: 450, cheese: 450, vegetable: 400 },
  };
  const filteredMenuItems = activePosCategory === 'All'
    ? menuItems
    : (activePosCategory === 'Deals' && activePosSubCategory !== 'All')
      ? menuItems.filter(i => i.category === 'Deals' && (i.subCategory === activePosSubCategory || (!i.subCategory && activePosSubCategory === 'Simple Deals')))
      : (activePosCategory === 'Burgers' && activePosSubCategory !== 'All')
        ? menuItems.filter(i => i.category === 'Burgers' && (i.subCategory === activePosSubCategory || (!i.subCategory && activePosSubCategory === 'Regular')))
        : (activePosCategory === 'Rolls' && activePosSubCategory !== 'All')
          ? menuItems.filter(i => i.category === 'Rolls' && (i.subCategory === activePosSubCategory || (!i.subCategory && activePosSubCategory === 'Regular')))
          : menuItems.filter(i => i.category === activePosCategory);

  filteredMenuItems.sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999));

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;
  const outForDeliveryCount = orders.filter(o => o.status === 'out_for_delivery').length;

  return (
    <div className="receptionist-page container">
      <style>{`
        @keyframes twinklePulse {
          0%, 100% { opacity: 1; transform: scale(1) translateY(0); color: #ffb347; text-shadow: 0 0 10px #ffb347; }
          50% { opacity: 0.8; transform: scale(1.05) translateY(-3px); color: #fff; text-shadow: 0 0 20px #ffb347; }
        }
        .twinkle-alert {
          position: absolute; top: -20px; left: 0; right: 0; text-align: left; margin-left: 10px;
          font-size: 0.85rem; font-weight: bold; pointer-events: none;
          animation: twinklePulse 1.2s infinite ease-in-out; z-index: 10;
        }
        .dropdown-glow {
          box-shadow: 0 0 15px rgba(255, 179, 71, 0.8) !important;
          border-color: #ffb347 !important;
          animation: twinklePulse 2s infinite ease-in-out !important;
        }
      `}</style>
      <div className="rep-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1>Live <span className="text-gradient">Orders</span> Panel</h1>
          <p>Manage and process incoming customer orders.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '2 1 400px', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '8px 15px', borderRadius: '10px', textAlign: 'center', minWidth: '80px', border: '1px solid #ffb347' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffb347' }}>{pendingCount}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Pending</div>
          </div>
          <div className="glass-panel" style={{ padding: '8px 15px', borderRadius: '10px', textAlign: 'center', minWidth: '80px', border: '1px solid #ffd700' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700' }}>{preparingCount}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Preparing</div>
          </div>
          <div className="glass-panel" style={{ padding: '8px 15px', borderRadius: '10px', textAlign: 'center', minWidth: '80px', border: '1px solid #32cd32' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#32cd32' }}>{readyCount}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Ready</div>
          </div>
          <div className="glass-panel" style={{ padding: '8px 15px', borderRadius: '10px', textAlign: 'center', minWidth: '80px', border: '1px solid #00ced1' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00ced1' }}>{outForDeliveryCount}</div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Out for Del.</div>
          </div>
        </div>
        <button className="btn-highlight" onClick={() => setIsPosOpen(!isPosOpen)}>
          {isPosOpen ? 'Close POS' : 'New Walk-in Order (POS)'}
        </button>
      </div>

      {isPosOpen && (
        <div className="pos-section glass-panel">
          <h2>Point of Sale - <span>Walk-in Order</span></h2>
          <div className="pos-layout">
            <div className="pos-menu">
              <div className="pos-category-tabs pos-categories-scroll" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '10px' }}>
                {POS_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`pos-cat-btn ${activePosCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setActivePosCategory(cat);
                      setActivePosSubCategory('All');
                    }}
                    style={{
                      padding: '6px 15px',
                      borderRadius: '20px',
                      border: '1px solid var(--glass-border)',
                      background: activePosCategory === cat ? 'var(--highlight)' : 'black',
                      color: activePosCategory === cat ? 'black' : 'white',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {activePosCategory === 'Deals' && (
                <div className="pos-category-tabs sub-tabs pos-categories-scroll" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                  <button
                    className={`pos-cat-btn ${activePosSubCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setActivePosSubCategory('All')}
                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    All Deals
                  </button>
                  {['Simple Deals', 'Yari Deals', 'Family Deals', 'Birthday deals'].map(sub => (
                    <button
                      key={sub}
                      className={`pos-cat-btn ${activePosSubCategory === sub ? 'active' : ''}`}
                      onClick={() => setActivePosSubCategory(sub)}
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {activePosCategory === 'Burgers' && (
                <div className="pos-category-tabs sub-tabs pos-categories-scroll" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                  <button
                    className={`pos-cat-btn ${activePosSubCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setActivePosSubCategory('All')}
                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    All Burgers
                  </button>
                  {['Regular', 'Special'].map(sub => (
                    <button
                      key={sub}
                      className={`pos-cat-btn ${activePosSubCategory === sub ? 'active' : ''}`}
                      onClick={() => setActivePosSubCategory(sub)}
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {activePosCategory === 'Rolls' && (
                <div className="pos-category-tabs sub-tabs pos-categories-scroll" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                  <button
                    className={`pos-cat-btn ${activePosSubCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setActivePosSubCategory('All')}
                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    All Rolls
                  </button>
                  {['Regular', 'Special'].map(sub => (
                    <button
                      key={sub}
                      className={`pos-cat-btn ${activePosSubCategory === sub ? 'active' : ''}`}
                      onClick={() => setActivePosSubCategory(sub)}
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
              <div className="pos-menu-grid">
                {filteredMenuItems.map(item => (
                  <div
                    key={item.id}
                    className={`pos-menu-card ${item.inStock === false ? 'disabled' : ''}`}
                    onClick={() => {
                      if (item.inStock === false) return;
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
                      } else {
                        addToPosCart(item);
                      }
                    }}
                  >
                    <div className="pos-card-content">
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{item.name}</h4>
                      <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--highlight)', fontWeight: 'bold' }}>
                        {item.hasSizes ? `From Rs. ${item.price}` : `Rs. ${item.price}`}
                      </p>
                      <span className="stock-info" style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '5px', display: 'block' }}>
                        {item.inStock === false ? '❌ Out' : '✅ In Stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pos-cart">
              <h3>Current Order</h3>
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="pos-input"
              />
              <div className="pos-cart-items">
                {posCart.map(item => (
                  <div key={item.id} className="pos-cart-item">
                    <div className="pos-item-info">
                      <span>{item.name}</span>
                      <span>Rs. {item.price * item.qty}</span>
                    </div>
                    <div className="pos-item-controls">
                      <button onClick={() => updatePosQty(item.id, -1)}><Minus size={14} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updatePosQty(item.id, 1)}><Plus size={14} /></button>
                      <button className="text-danger" onClick={() => removePosItem(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {posCart.length === 0 && <p className="empty-pos">No items selected.</p>}
              </div>
              <div className="pos-total-row">
                <span>Total:</span>
                <span className="text-gradient">Rs. {posTotal}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  className={`btn-outline ${posOrderType === 'Takeaway' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', background: posOrderType === 'Takeaway' ? 'var(--highlight)' : 'transparent', color: posOrderType === 'Takeaway' ? 'var(--primary-main)' : 'black' }}
                  onClick={() => setPosOrderType('Takeaway')}
                >
                  Takeaway
                </button>
                <button
                  className={`btn-outline ${posOrderType === 'Service' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', background: posOrderType === 'Service' ? 'var(--highlight)' : 'transparent', color: posOrderType === 'Service' ? 'var(--primary-main)' : 'black' }}
                  onClick={() => setPosOrderType('Service')}
                >
                  Service/Dine-in
                </button>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={posCart.length === 0}
                onClick={handlePlacePosOrder}
              >
                Place Order
              </button>
            </div>
          </div>

          {/* POS Configuration Modal */}
          {selectedConfigItem && (
            <div className="modal-overlay" onClick={() => setSelectedConfigItem(null)} style={{ zIndex: 3000 }}>
              <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '20px' }}>Configure<br /><span className="text-gradient">{selectedConfigItem.name}</span></h2>

                {selectedConfigItem.hasSizes && (
                  <div className="size-options-list">
                    {selectedConfigItem.sizes.map((sz, idx) => (
                      <label key={idx} className={`size-btn ${selectedSize?.size === sz.size ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="posItemSize"
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
                )}

                {/* POS Meal Add-on Selection */}
                {selectedConfigItem.hasMealOption && (
                  <div className="meal-addon-section" style={{ marginTop: '15px', marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--text-color)' }}>Make it a Meal! 🍟🥤</h4>
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

                {/* Extra Toppings Section for Pizza (POS) */}
                {selectedConfigItem.category === 'Pizza' && selectedSize && (
                  <div className="toppings-section" style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--accent-color)', fontSize: '0.9rem' }}>Extra Toppings 🍕</h4>
                    <div className="toppings-grid" style={{ display: 'grid', gap: '8px' }}>
                      {['chicken', 'cheese', 'vegetable'].map(top => {
                        const price = TOPPING_PRICES[selectedSize.size]?.[top] || 0;
                        return (
                          <label key={top} className={`size-btn ${selectedToppings[top] ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                {/* Deal Flavor Selection (POS) */}
                {selectedConfigItem.category === 'Deals' && selectedConfigItem.selections && selectedConfigItem.selections.length > 0 && (
                  <div className="deal-selections" style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--highlight)', fontSize: '0.9rem' }}>Customize Deal</h4>
                    {selectedConfigItem.selections.map((sel, slotIdx) => {
                      const itemsCount = Number(sel.qty) || 1;
                      return Array.from({ length: itemsCount }).map((_, itemIdx) => {
                        const selectionKey = `${slotIdx}-${itemIdx}`;
                        return (
                          <div key={selectionKey} style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {sel.label} {itemsCount > 1 ? `#${itemIdx + 1}` : ''}
                            </label>
                            <select
                              style={{ width: '100%', padding: '8px', background: '#2a2a2a', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px' }}
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
                                  if (i.hasSizes && i.sizes) {
                                    return i.sizes.some(s => s.size === sel.size || s.size.includes(sel.size));
                                  }
                                  if (i.subCategory) {
                                    return i.subCategory === sel.size;
                                  }
                                  return true;
                                })
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                              }
                            </select>
                          </div>
                        );
                      });
                    })}
                  </div>
                )}

                {/* Pizza Flavor Selection (POS) */}
                {selectedConfigItem.category === 'Pizza' && selectedConfigItem.flavorSlots > 0 && (
                  <div className="pizza-flavors-section" style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--highlight)', fontSize: '0.9rem' }}>Choose Your Flavors</h4>
                    {Array.from({ length: selectedConfigItem.flavorSlots }).map((_, idx) => (
                      <div key={idx} style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flavor {idx + 1}</label>
                        <select
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(255, 179, 71, 0.05)',
                            border: '1px solid rgba(255, 179, 71, 0.2)',
                            color: 'white',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            outline: 'none',
                            cursor: 'pointer'
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

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    className="btn-outline w-100"
                    style={{ padding: '12px', border: '1px solid var(--text-muted)', background: 'transparent', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setSelectedConfigItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-highlight w-100"
                    style={{ flex: 2 }}
                    onClick={() => {
                      let finalPrice = selectedConfigItem.hasSizes && selectedSize ? selectedSize.price : selectedConfigItem.price;
                      let finalName = selectedConfigItem.hasSizes && selectedSize ? `${selectedConfigItem.name} - ${selectedSize.size}` : selectedConfigItem.name;
                      let finalId = selectedConfigItem.hasSizes && selectedSize ? `${selectedConfigItem.id}-${selectedSize.size}` : selectedConfigItem.id;

                      // Add Toppings logic (POS)
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
                          finalName += " + Extra Veg";
                          finalId += "-extra-veg";
                        }
                      }

                      if (selectedConfigItem.hasMealOption && makeItMeal) {
                        finalPrice += Number(selectedConfigItem.mealPrice);
                        finalName += " (with Fries & Drink)";
                        finalId += "-meal";
                      }

                      // Add Deal selections to ID for uniqueness
                      if (selectedConfigItem.category === 'Deals' && Object.keys(dealSelections).length > 0) {
                        const selectionIds = Object.values(dealSelections).map(s => s.id).join('-');
                        finalId += `-${selectionIds}`;
                      }

                      // Add Pizza Flavors to ID
                      if (selectedConfigItem.category === 'Pizza' && selectedConfigItem.flavorSlots > 0 && Object.keys(pizzaFlavorSelections).length > 0) {
                        const flavorIds = Object.values(pizzaFlavorSelections).join('-');
                        finalId += `-${flavorIds}`;
                      }

                      addToPosCart({
                        ...selectedConfigItem,
                        itemId: selectedConfigItem.id, // Crucial for stock deduction!
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
                    Add to Order
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="orders-grid">
        {[...orders].filter(o => o.status !== 'delivered').sort((a, b) => {
          const statusPriority = { 'ready': 1, 'preparing': 2, 'pending': 3, 'cancelled': 4 };

          if (statusPriority[a.status] !== statusPriority[b.status]) {
            return statusPriority[a.status] - statusPriority[b.status];
          }

          // Secondary sort by date (newest first)
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        }).map(order => (
          <div key={order.id} className={`order-card glass-panel status-${order.status}`}>
            <div className="order-header">
              <h3>{order.invoiceId}</h3>
              <span className={`status-badge ${order.status}`}>{order.status}</span>
            </div>

            <div className="order-customer">
              <p><strong>{order.customer.name}</strong></p>
              <p>{order.customer.phone}</p>
              <div className="order-address" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{order.customer.address}</span>
                  {order.orderType && (
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {order.orderType}
                    </span>
                  )}
                </div>
                {order.orderType === 'Online' && order.customer.address && (
                  <>
                    <a
                      href={order.customer.coords ? `https://www.google.com/maps/dir/?api=1&destination=${order.customer.coords.lat},${order.customer.coords.lng}` : `https://www.google.com/maps/dir/Pak+Burger+House+Khanewal/${encodeURIComponent(order.customer.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#ffb347', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}
                    >
                      📍 {order.distance ? `Navigate to Customer (${order.distance} km)` : 'Check Distance on Map'}
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="order-items">
              {order.items.map((item, idx) => (
                <div key={idx} className="order-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontWeight: '600' }}>
                    <span>{item.qty}x {item.name}</span>
                    <span>Rs. {item.price * item.qty}</span>
                  </div>
                  {item.selectedPizzaFlavors && item.selectedPizzaFlavors.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--highlight)', marginTop: '4px' }}>
                      🍕 {item.selectedPizzaFlavors.join(', ')}
                    </div>
                  )}
                  {item.selectedFlavors && item.selectedFlavors.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px', fontStyle: 'italic' }}>
                      ✨ {item.selectedFlavors.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="order-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <div>
                {order.deliveryFee > 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '4px' }}>+ Rs. {order.deliveryFee} Delivery</div>
                ) : order.orderType === 'Online' ? (
                  <div className="twinkle-alert" style={{ top: '-25px', left: '0', color: '#ff4444', animation: 'twinklePulse 1s infinite ease-in-out', zIndex: 10 }}>
                    ⚠️ Needs Delivery Fee!
                  </div>
                ) : null}
                <strong>Total: Rs. {order.total}</strong>
              </div>
              {order.orderType === 'Online' && (
                <button
                  onClick={() => handleAddDeliveryFee(order)}
                  style={{ 
                    background: (!order.deliveryFee || order.deliveryFee === 0) ? '#ff4444' : 'transparent', 
                    border: (!order.deliveryFee || order.deliveryFee === 0) ? 'none' : '1px solid #ffb347', 
                    color: (!order.deliveryFee || order.deliveryFee === 0) ? 'white' : '#ffb347', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold',
                    cursor: 'pointer', 
                    transition: '0.3s',
                    boxShadow: (!order.deliveryFee || order.deliveryFee === 0) ? '0 0 10px rgba(255, 68, 68, 0.6)' : 'none',
                    animation: (!order.deliveryFee || order.deliveryFee === 0) ? 'twinklePulse 1.5s infinite' : 'none'
                  }}
                  onMouseEnter={(e) => { if(order.deliveryFee > 0) { e.target.style.background = '#ffb347'; e.target.style.color = '#1a110d'; } }}
                  onMouseLeave={(e) => { if(order.deliveryFee > 0) { e.target.style.background = 'transparent'; e.target.style.color = '#ffb347'; } }}
                >
                  {(!order.deliveryFee || order.deliveryFee === 0) ? '+ Add Fee Now' : '+ Update Fee'}
                </button>
              )}
            </div>

            <div className="order-actions" style={{ position: 'relative', marginTop: order.status === 'preparing' ? '20px' : '0' }}>
              {order.status === 'preparing' && (
                <div className="twinkle-alert">✨ Needs to be marked "Ready" ⬇️</div>
              )}
              <select
                value={order.status}
                onChange={(e) => updateStatus(order, e.target.value)}
                className={`status-dropdown ${order.status === 'preparing' ? 'dropdown-glow' : ''}`}
              >
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button className="btn-print" onClick={() => handlePrint(order)}>Print</button>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="no-orders">
            <h2>No orders yet.</h2>
            <p>Waiting for customers...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionistPanel;
