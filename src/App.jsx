import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Login from './pages/Login';
import AdminDash from './pages/AdminDash';
import ReceptionistPanel from './pages/Receptionist';
import DeliveryDashboard from './pages/DeliveryDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import CartNotification from './components/CartNotification';
import ServiceGuardian from './components/ServiceGuardian';
import { useState, useEffect } from 'react';
import { db } from './firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initConfig = async () => {
      const configRef = doc(db, 'system_config', 'service_status');
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        await setDoc(configRef, {
          isLocked: false,
          message: "Your website service subscription has expired or is temporarily suspended. Please contact your developer to resume service.",
          reason: "SUBSCRIPTION_RENEWAL_REQUIRED"
        });
      }
    };
    initConfig();
  }, []);

  return (
    <>
      {showSplash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--accent)',
          zIndex: 999999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'fadeOut 0.5s ease 2.5s forwards'
        }}>
          <img
            src="/logo.png"
            alt="Pak Burger Logo"
            style={{
              maxWidth: '80%',
              maxHeight: '100px',
              animation: 'floatSplashing 2s ease-in-out infinite'
            }}
          />
        </div>
      )}
      <HelmetProvider>
        <Router>
          <AuthProvider>
            <CartProvider>
              <ServiceGuardian>
                <Navbar />
                <Routes>
                  {/* Customer Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/cart" element={<Cart />} />

                  {/* Auth Route */}
                  <Route path="/login" element={<Login />} />

                  {/* Admin / Staff Routes */}
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDash /></ProtectedRoute>} />
                  <Route path="/receptionist" element={<ProtectedRoute allowedRoles={['staff']}><ReceptionistPanel /></ProtectedRoute>} />
                  <Route path="/delivery" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryDashboard /></ProtectedRoute>} />
                </Routes>
                <CartNotification />
                <Footer />
              </ServiceGuardian>
            </CartProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </>
  );
}

export default App;
