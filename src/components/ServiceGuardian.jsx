import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { Lock, HelpCircle } from 'lucide-react';

const ServiceGuardian = ({ children }) => {
  const [status, setStatus] = useState({ isLocked: false, message: '', reason: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to the master service status in Firestore
    // Path: system_config/service_status
    const unsubscribe = onSnapshot(doc(db, 'system_config', 'service_status'), (docSnap) => {
      if (docSnap.exists()) {
        setStatus(docSnap.data());
      } else {
        // If the document doesn't exist, service is active by default
        setStatus({ isLocked: false });
      }
      setLoading(false);
    }, (error) => {
      console.error("Guardian check skipped (offline or permission issue):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  if (status.isLocked) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0503',
        color: 'white',
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'center',
        padding: '20px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999
      }}>
        <div style={{
          background: 'rgba(255, 179, 71, 0.05)',
          padding: '40px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 179, 71, 0.2)',
          maxWidth: '500px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          <div style={{ marginBottom: '20px', color: '#ffb347' }}>
            <Lock size={64} style={{ marginBottom: '15px' }} />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '15px' }}>
            Service <span style={{ color: '#ffb347' }}>Unavailable</span>
          </h1>
          <p style={{ color: '#aaa', lineHeight: '1.6', marginBottom: '25px', fontSize: '1.1rem' }}>
            {status.message || "Your website service subscription has expired or is temporarily suspended. Please contact your developer to resume service."}
          </p>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px',
            background: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '0.9rem'
          }}>
            <HelpCircle size={18} color="#ffb347" />
            <span>Reference ID: {status.reason || "SUBSCRIPTION_RENEWAL_REQUIRED"}</span>
          </div>

          <div style={{ marginTop: '30px', fontSize: '0.8rem', color: '#666' }}>
            &copy; {new Date().getFullYear()} System Managed by Pak Burger Dev Team
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ServiceGuardian;
