import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Load initial cart from LocalStorage
    const savedCart = localStorage.getItem('pakBurgerCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  // Save to LocalStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('pakBurgerCart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.id === item.id);
      if (existingItem) {
        return prevCart.map((i) => 
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prevCart, { ...item, qty: 1 }];
    });
    showToast(`${item.name} added to cart! 🍔`);
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId, newQty) => {
    if (newQty < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart((prevCart) => 
      prevCart.map((i) => (i.id === itemId ? { ...i, qty: newQty } : i))
    );
  };

  const clearCart = () => setCart([]);

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.qty, 0);
  };
  
  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.qty, 0);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartTotal,
    getCartCount,
    toast
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
