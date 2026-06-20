import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { Plus, Trash2, Edit2, Package, ShoppingBag, BarChart2, Save, X, Utensils, Minus, ChevronRight, ChevronDown, Search, ChefHat, Image as ImageIcon, Navigation } from 'lucide-react';
import './Admin.css';

const AdminDash = () => {
  const [activeTab, setActiveTab] = useState('Analytics');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialNewItem = {
    name: '', price: '', category: 'Burgers', inStock: true, description: '',
    sizes: {
      Personal: { price: '', recipe: [] },
      Small: { price: '', recipe: [] },
      Medium: { price: '', recipe: [] },
      Large: { price: '', recipe: [] },
      XL: { price: '', recipe: [] },
      XXL: { price: '', recipe: [] },
      Half: { price: '', recipe: [] },
      Full: { price: '', recipe: [] },
      '250ml': { price: '', recipe: [] },
      '300ml': { price: '', recipe: [] },
      '350ml': { price: '', recipe: [] },
      '500ml': { price: '', recipe: [] },
      '1L': { price: '', recipe: [] },
      '1.5L': { price: '', recipe: [] },
      '2.25L': { price: '', recipe: [] },
      'SmallBottle': { price: '', recipe: [] },
      'LargeBottle': { price: '', recipe: [] }
    },
    hasMealOption: false, mealPrice: '', recipe: [], subCategory: '', selections: [], flavorSlots: 0
  };
  const [newItem, setNewItem] = useState(initialNewItem);
  const [editingItem, setEditingItem] = useState(null);

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempIngredient, setTempIngredient] = useState({ inventoryId: '', quantityUsed: '' });
  const [stockSearch, setStockSearch] = useState('');
  const [activeSizeForRecipe, setActiveSizeForRecipe] = useState(null); // 'Personal', 'Small', etc. or null for main recipe
  const [importItemId, setImportItemId] = useState('');
  const [importSizeName, setImportSizeName] = useState('');
  const [importQty, setImportQty] = useState(1);
  const [importSearch, setImportSearch] = useState('');
  const [showImportResults, setShowImportResults] = useState(false);
  const importRef = useRef(null);

  // Delivery State
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [newDeliveryEmail, setNewDeliveryEmail] = useState('');
  const [newDeliveryPassword, setNewDeliveryPassword] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [deliveryCreationLoading, setDeliveryCreationLoading] = useState(false);

  // Date range state (default to today in local time)
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeRange, setActiveRange] = useState('daily');

  // New Inventory State
  const [showStockForm, setShowStockForm] = useState(false);
  const [newStockItem, setNewStockItem] = useState({ name: '', unit: '', quantity: '' });

  // Stock Reminder Popup
  const [showStockPopup, setShowStockPopup] = useState(false);
  const { userRole } = useAuth();

  const setQuickRange = (rangeType) => {
    setActiveRange(rangeType);
    const end = new Date();
    const start = new Date();
    if (rangeType === 'daily') {
      // today
    } else if (rangeType === 'weekly') {
      start.setDate(start.getDate() - 7);
    } else if (rangeType === 'monthly') {
      start.setMonth(start.getMonth() - 1);
    } else if (rangeType === 'yearly') {
      start.setFullYear(start.getFullYear() - 1);
    }
    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  };

  useEffect(() => {
    // Listen to Menu
    const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      setMenuItems(items);
    });

    // Listen to Orders
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ords = [];
      snapshot.forEach(doc => ords.push({ id: doc.id, ...doc.data() }));
      setOrders(ords);
    });

    const unsubscribeInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      setInventory(items);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = [];
      snapshot.forEach(doc => {
        if (doc.data().role === 'delivery') {
          usersList.push({ id: doc.id, ...doc.data() });
        }
      });
      setDeliveryBoys(usersList);
    });

    setLoading(false);
    return () => {
      unsubscribeMenu();
      unsubscribeOrders();
      unsubscribeInventory();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (importRef.current && !importRef.current.contains(event.target)) {
        setShowImportResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show stock popup every time admin logs in
  useEffect(() => {
    if (userRole === 'admin') {
      const timer = setTimeout(() => {
        setShowStockPopup(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [userRole]);

  const handleCreateDeliveryBoy = async (e) => {
    e.preventDefault();
    setDeliveryCreationLoading(true);
    try {
      let secondaryApp;
      if (!getApps().some(app => app.name === 'Secondary')) {
        secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      } else {
        secondaryApp = getApp('Secondary');
      }

      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newDeliveryEmail, newDeliveryPassword);
      const newUid = userCredential.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        email: newDeliveryEmail,
        name: newDeliveryName,
        role: 'delivery',
        createdAt: serverTimestamp()
      });

      alert(`Delivery Account created successfully for ${newDeliveryName}!`);
      setNewDeliveryEmail('');
      setNewDeliveryPassword('');
      setNewDeliveryName('');
    } catch (error) {
      console.error(error);
      alert('Error creating account: ' + error.message);
    } finally {
      setDeliveryCreationLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemToSave = {
        name: newItem.name,
        category: newItem.category,
        inStock: newItem.inStock,
        description: newItem.description,
        recipe: newItem.recipe || [],
        imagePath: newItem.imagePath || '',
        subCategory: (newItem.category === 'Deals' || newItem.category === 'Burgers' || newItem.category === 'Rolls') ? (newItem.subCategory || (newItem.category === 'Deals' ? 'Simple Deals' : 'Regular')) : '',
        selections: newItem.category === 'Deals' ? (newItem.selections || []) : [],
        flavorSlots: newItem.category === 'Pizza' ? (Number(newItem.flavorSlots) || 0) : 0
      };

      if (newItem.category === 'Pizza' || newItem.category === 'Drinks') {
        const sizeList = [];
        const sizeLabels = newItem.category === 'Pizza' ? {
          Personal: 'Personal (6")',
          Small: 'Small (7")',
          Medium: 'Medium (10")',
          Large: 'Large (13")',
          XL: 'XL (16")',
          XXL: 'XXL (21")'
        } : {
          '250ml': '250ml',
          '300ml': '300ml',
          '350ml': '350ml',
          '500ml': '500ml',
          '1L': '1 Litre',
          '1.5L': '1.5 Litre',
          '2.25L': '2.25 Litre',
          'SmallBottle': 'Small Bottle',
          'LargeBottle': 'Large Bottle'
        };
        for (const [key, val] of Object.entries(newItem.sizes)) {
          if (val.price && sizeLabels[key]) {
            sizeList.push({
              size: sizeLabels[key],
              price: Number(val.price),
              recipe: val.recipe || []
            });
          }
        }
        itemToSave.hasSizes = true;
        itemToSave.sizes = sizeList;
        itemToSave.price = sizeList.length > 0 ? sizeList[0].price : 0;
      } else if (newItem.category === 'Pasta') {
        const sizeList = [];
        const sizeLabels = { Half: 'Half', Full: 'Full' };
        for (const [key, val] of Object.entries(newItem.sizes)) {
          if (val.price && sizeLabels[key]) {
            sizeList.push({
              size: sizeLabels[key],
              price: Number(val.price),
              recipe: val.recipe || []
            });
          }
        }
        itemToSave.hasSizes = true;
        itemToSave.sizes = sizeList;
        itemToSave.price = sizeList.length > 0 ? sizeList[0].price : 0;
      } else if (newItem.category === 'Burgers') {
        itemToSave.hasSizes = false;
        itemToSave.price = Number(newItem.price);
        itemToSave.hasMealOption = newItem.hasMealOption || false;
        itemToSave.mealPrice = newItem.hasMealOption ? Number(newItem.mealPrice) : 0;
      } else {
        itemToSave.hasSizes = false;
        itemToSave.price = Number(newItem.price);
        itemToSave.hasMealOption = false;
        itemToSave.mealPrice = 0;
      }

      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), itemToSave);
        setEditingItem(null);
        alert('Item updated successfully!');
      } else {
        await addDoc(collection(db, 'menu'), itemToSave);
        alert('Item added successfully!');
      }

      setNewItem(initialNewItem);
      setImagePreview(null);
    } catch (error) {
      console.error("Error saving item:", error);
      alert(`Error saving item: ${error.message}`);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setImagePreview(item.imagePath || null);

    // Build a fresh sizes state with all possible keys
    let itemSizes = {
      Personal: { price: '', recipe: [] },
      Small: { price: '', recipe: [] },
      Medium: { price: '', recipe: [] },
      Large: { price: '', recipe: [] },
      XL: { price: '', recipe: [] },
      XXL: { price: '', recipe: [] },
      Half: { price: '', recipe: [] },
      Full: { price: '', recipe: [] },
      '250ml': { price: '', recipe: [] },
      '300ml': { price: '', recipe: [] },
      '350ml': { price: '', recipe: [] },
      '500ml': { price: '', recipe: [] },
      '1L': { price: '', recipe: [] },
      '1.5L': { price: '', recipe: [] },
      '2.25L': { price: '', recipe: [] },
      'SmallBottle': { price: '', recipe: [] },
      'LargeBottle': { price: '', recipe: [] }
    };

    // Reverse mapping: stored size label -> state key
    const labelToKey = {
      'Personal (6")': 'Personal',
      'Small (7")': 'Small',
      'Medium (10")': 'Medium',
      'Large (13")': 'Large',
      'XL (16")': 'XL',
      'XXL (21")': 'XXL',
      'Half': 'Half',
      'Full': 'Full',
      '250ml': '250ml',
      '300ml': '300ml',
      '350ml': '350ml',
      '500ml': '500ml',
      '1 Litre': '1L',
      '1.5 Litre': '1.5L',
      '2.25 Litre': '2.25L',
      'Small Bottle': 'SmallBottle',
      'Large Bottle': 'LargeBottle'
    };

    if (item.hasSizes && item.sizes) {
      item.sizes.forEach(sz => {
        const key = labelToKey[sz.size] || sz.size.split(' ')[0];
        if (itemSizes.hasOwnProperty(key)) {
          itemSizes[key] = { price: sz.price, recipe: sz.recipe || [] };
        }
      });
    }

    setNewItem({
      name: item.name,
      price: item.hasSizes ? '' : (item.price || ''),
      category: item.category,
      inStock: item.inStock ?? true,
      description: item.description || '',
      sizes: itemSizes,
      hasMealOption: item.hasMealOption || false,
      mealPrice: item.mealPrice || '',
      recipe: item.recipe || [],
      imagePath: item.imagePath || '',
      subCategory: item.subCategory || '',
      selections: item.selections || [],
      flavorSlots: item.flavorSlots || 0
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteItem = async (id) => {
    if (window.confirm('Delete this item?')) {
      await deleteDoc(doc(db, 'menu', id));
    }
  };

  const handleImportIngredients = () => {
    if (!importItemId) return;
    const item = menuItems.find(i => i.id === importItemId);
    if (!item) return;

    let recipeToImport = [];
    if (item.hasSizes) {
      if (!importSizeName) {
        alert("Please select a size to import from.");
        return;
      }
      const sizeData = item.sizes.find(s => s.size === importSizeName);
      recipeToImport = sizeData?.recipe || [];
    } else {
      recipeToImport = item.recipe || [];
    }

    if (recipeToImport.length === 0) {
      alert("Selected item has no recipe defined.");
      return;
    }

    // Function to merge and add to current recipe
    const mergeRecipes = (current, incoming) => {
      const merged = [...current];
      incoming.forEach(inc => {
        const existing = merged.find(c => c.inventoryId === inc.inventoryId);
        const qtyToAdd = Number(inc.quantityUsed) * (Number(importQty) || 1);
        if (existing) {
          existing.quantityUsed = Number(existing.quantityUsed) + qtyToAdd;
        } else {
          merged.push({ ...inc, quantityUsed: qtyToAdd });
        }
      });
      return merged;
    };

    if (activeSizeForRecipe) {
      const currentSizeData = newItem.sizes[activeSizeForRecipe] || { price: '', recipe: [] };
      const newRecipe = mergeRecipes(currentSizeData.recipe || [], recipeToImport);
      setNewItem({
        ...newItem,
        sizes: {
          ...newItem.sizes,
          [activeSizeForRecipe]: { ...currentSizeData, recipe: newRecipe }
        }
      });
    } else {
      const newRecipe = mergeRecipes(newItem.recipe || [], recipeToImport);
      setNewItem({ ...newItem, recipe: newRecipe });
    }

    setImportItemId('');
    setImportSizeName('');
    setImportQty(1);
    setImportSearch('');
    alert(`Imported ${recipeToImport.length} items (Multiplied by ${importQty})!`);
  };

  const initializeInventory = async () => {
    const items = [
      { name: 'Shami Kabab', quantity: 0, unit: 'Numbers' },
      { name: 'Eggs', quantity: 0, unit: 'Numbers' },
      { name: 'Nuggets', quantity: 0, unit: 'Numbers' },
      { name: 'Cheese Slices', quantity: 0, unit: 'Numbers' },
      { name: 'Local Flat Bread', quantity: 0, unit: 'Numbers' },
      { name: 'Local Round Bun', quantity: 0, unit: 'Numbers' },
      { name: 'Company Flat Bread', quantity: 0, unit: 'Numbers' },
      { name: 'Company Round Bun', quantity: 0, unit: 'Numbers' },
      { name: 'Zinger Pieces', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Peties', quantity: 0, unit: 'Numbers' },
      { name: 'Beef Peties', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Peties (70g)', quantity: 0, unit: 'Numbers' },
      { name: 'Water Bottle 500ml', quantity: 0, unit: 'Numbers' },
      { name: 'Water Bottle 1500ml', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Chest Pieces', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Thai Pieces', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Wings', quantity: 0, unit: 'Numbers' },
      { name: 'Chicken Leg Candies', quantity: 0, unit: 'Numbers' },
      { name: 'Beef Kababs', quantity: 0, unit: 'Numbers' },
      { name: 'Sausages', quantity: 0, unit: 'Numbers' },
      { name: 'Parathas', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 250ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 350ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 500ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 1000ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 1500ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 2000ml', quantity: 0, unit: 'Numbers' },
      { name: 'Cold Drink 2250ml', quantity: 0, unit: 'Numbers' },
      { name: 'Fries', quantity: 0, unit: 'Grams' },
      { name: 'Shahi Tikka Chicken', quantity: 0, unit: 'Grams' },
      { name: 'Fajita Chicken', quantity: 0, unit: 'Grams' },
      { name: 'Achari Chicken', quantity: 0, unit: 'Grams' },
      { name: 'Bar BQ Chicken', quantity: 0, unit: 'Grams' },
      { name: 'Afghani Chicken', quantity: 0, unit: 'Grams' },
    ];

    try {
      for (const item of items) {
        if (!inventory.some(existing => existing.name === item.name)) {
          await addDoc(collection(db, 'inventory'), {
            ...item,
            updatedAt: serverTimestamp()
          });
        }
      }
      alert('Inventory Initialized!');
    } catch (e) {
      console.error(e);
      alert('Error initializing inventory');
    }
  };

  const initializeToppings = async () => {
    const toppings = [
      {
        name: 'Extra Chicken Topping',
        category: 'Extras',
        price: 80,
        hasSizes: true,
        sizes: [
          { size: 'Personal (6")', price: 80 },
          { size: 'Small (7")', price: 100 },
          { size: 'Medium (10")', price: 150 },
          { size: 'Large (13")', price: 250 },
          { size: 'XL (16")', price: 350 },
          { size: 'XXL (21")', price: 450 }
        ],
        inStock: true,
        description: 'Add extra chicken to your pizza'
      },
      {
        name: 'Extra Cheese Topping',
        category: 'Extras',
        price: 80,
        hasSizes: true,
        sizes: [
          { size: 'Personal (6")', price: 80 },
          { size: 'Small (7")', price: 100 },
          { size: 'Medium (10")', price: 150 },
          { size: 'Large (13")', price: 250 },
          { size: 'XL (16")', price: 350 },
          { size: 'XXL (21")', price: 450 }
        ],
        inStock: true,
        description: 'Extra premium mozzarella cheese'
      },
      {
        name: 'Extra Vegetable Topping',
        category: 'Extras',
        price: 60,
        hasSizes: true,
        sizes: [
          { size: 'Personal (6")', price: 60 },
          { size: 'Small (7")', price: 80 },
          { size: 'Medium (10")', price: 120 },
          { size: 'Large (13")', price: 200 },
          { size: 'XL (16")', price: 300 },
          { size: 'XXL (21")', price: 400 }
        ],
        inStock: true,
        description: 'Mix of fresh vegetables'
      }
    ];

    if (!window.confirm("This will add the 3 standard Extra Toppings (Chicken, Cheese, Vegetable) with size-based pricing. Proceed?")) return;

    try {
      for (const topping of toppings) {
        await addDoc(collection(db, 'menu'), topping);
      }
      alert('Default Toppings Added Successfully!');
    } catch (e) {
      console.error(e);
      alert('Error adding toppings');
    }
  };

  const adjustStock = async (id, amount, reason = 'Adjustment') => {
    try {
      const adj = Number(amount);
      if (isNaN(adj)) return;
      await updateDoc(doc(db, 'inventory', id), {
        quantity: increment(adj),
        updatedAt: serverTimestamp(),
        lastAdjustmentReason: reason
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStockItem = async (e) => {
    e.preventDefault();
    if (!newStockItem.name || !newStockItem.unit) {
      alert("Please enter Name and Unit");
      return;
    }
    try {
      await addDoc(collection(db, 'inventory'), {
        name: newStockItem.name,
        unit: newStockItem.unit,
        quantity: Number(newStockItem.quantity) || 0,
        updatedAt: serverTimestamp()
      });
      setNewStockItem({ name: '', unit: '', quantity: '' });
      setShowStockForm(false);
      alert('New stock item added!');
    } catch (error) {
      console.error("Error adding stock item:", error);
      alert("Failed to add item");
    }
  };

  const deleteInventoryItem = async (id) => {
    if (window.confirm('Delete this stock item?')) {
      await deleteDoc(doc(db, 'inventory', id));
    }
  };

  const toggleStock = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'menu', id), { inStock: !currentStatus });
    } catch (error) {
      console.error("Error toggling stock:", error);
    }
  };

  const categoriesOrder = ['Pizza', 'Burgers', 'Rolls', 'Pasta', 'Bites', 'Drinks', 'Deals'];

  // Analytics calc with Date Filter
  const filteredOrders = orders.filter(ord => {
    if (!ord.createdAt) return false;
    // Firestore timestamp to JS Date
    const ordDate = ord.createdAt.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt);

    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

    return ordDate >= start && ordDate <= end;
  });

  const activeOrders = filteredOrders.filter(ord => ord.status !== 'cancelled');
  const totalRevenue = activeOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);
  const totalOrders = activeOrders.length;

  // Status counts for filtered orders
  const stats = {
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    processing: filteredOrders.filter(o => o.status === 'preparing' || o.status === 'ready').length,
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length
  };

  // Get 5 most recent orders from TODAY only
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const recentOrders = orders
    .filter(ord => {
      const ordDate = ord.createdAt?.toDate ? ord.createdAt.toDate() : new Date(ord.createdAt || 0);
      return ordDate >= todayStart && ordDate <= todayEnd;
    })
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="admin-page container">
      <div className="admin-header">
        <h1>Admin <span className="text-gradient">Dashboard</span></h1>
        <div className="admin-tabs">
          <button className={activeTab === 'Analytics' ? 'active' : ''} onClick={() => setActiveTab('Analytics')}><BarChart2 size={18} /> Analytics</button>
          <button className={activeTab === 'Orders' ? 'active' : ''} onClick={() => setActiveTab('Orders')}><ShoppingBag size={18} /> Orders History</button>
          <button className={activeTab === 'Stock' ? 'active' : ''} onClick={() => setActiveTab('Stock')}><Package size={18} /> Stock Management</button>
          <button className={activeTab === 'Menu Management' ? 'active' : ''} onClick={() => setActiveTab('Menu Management')}><Utensils size={18} /> Menu Management</button>
          <button className={activeTab === 'Delivery Team' ? 'active' : ''} onClick={() => setActiveTab('Delivery Team')}><Navigation size={18} /> Delivery Team</button>
        </div>
      </div>

      {activeTab === 'Analytics' && (
        <div className="analytics-tab">
          <div className="analytics-filters glass-panel" style={{ marginBottom: '20px' }}>
            <div className="date-filter-group">
              <h3 style={{ margin: 0, marginRight: 'auto' }}>Filter Range</h3>
              <div className="filter-range-panel" style={{ display: 'flex', gap: '10px' }}>
                <button className={`filter-btn ${activeRange === 'daily' ? 'active' : ''}`} onClick={() => setQuickRange('daily')}>Daily</button>
                <button className={`filter-btn ${activeRange === 'weekly' ? 'active' : ''}`} onClick={() => setQuickRange('weekly')}>Weekly</button>
                <button className={`filter-btn ${activeRange === 'monthly' ? 'active' : ''}`} onClick={() => setQuickRange('monthly')}>Monthly</button>
                <button className={`filter-btn ${activeRange === 'yearly' ? 'active' : ''}`} onClick={() => setQuickRange('yearly')}>Yearly</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>From:</label>
                  <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>To:</label>
                  <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
              </div>
            </div>
          </div>
          <div className="status-summary-grid">
            <div className="status-stat-card glass-panel orange">
              <span className="stat-label">Pending</span>
              <span className="stat-num">{stats.pending}</span>
            </div>
            <div className="status-stat-card glass-panel blue">
              <span className="stat-label">Processing</span>
              <span className="stat-num">{stats.processing}</span>
            </div>
            <div className="status-stat-card glass-panel green">
              <span className="stat-label">Completed</span>
              <span className="stat-num">{stats.delivered}</span>
            </div>
            <div className="status-stat-card glass-panel" style={{ borderLeft: '4px solid #ef4444' }}>
              <span className="stat-label">Cancelled</span>
              <span className="stat-num">{stats.cancelled}</span>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card glass-panel">
              <h3>Total Orders</h3>
              <p className="stat-value">{totalOrders}</p>
            </div>
            <div className="stat-card glass-panel">
              <h3>Total Revenue</h3>
              <p className="stat-value text-gradient">Rs. {totalRevenue}</p>
            </div>
            <div className="stat-card glass-panel">
              <h3>Menu Items</h3>
              <p className="stat-value">{menuItems.length}</p>
            </div>
          </div>

          <div className="recent-orders-section glass-panel" style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Recent <span className="text-gradient">Orders</span></h2>
              <button className="btn-outline" style={{ padding: '5px 15px', fontSize: '0.8rem' }} onClick={() => setActiveTab('Orders')}>View All</button>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--highlight)' }}>{order.invoiceId}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{order.customer?.name || 'Guest'}</div>
                        {order.orderType && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.orderType}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td style={{ fontWeight: '600' }}>Rs. {order.total}</td>
                      <td>
                        <span className={`status-pill ${order.status}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Orders' && (
        <div className="orders-history-tab">
          <div className="analytics-filters glass-panel" style={{ marginBottom: '20px' }}>
            <div className="date-filter-group">
              <h3 style={{ margin: 0, marginRight: 'auto' }}>Order History <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>({filteredOrders.length})</span></h3>
              <div className="filter-range-panel" style={{ display: 'flex', gap: '10px' }}>
                <button className={`filter-btn ${activeRange === 'daily' ? 'active' : ''}`} onClick={() => setQuickRange('daily')}>Daily</button>
                <button className={`filter-btn ${activeRange === 'weekly' ? 'active' : ''}`} onClick={() => setQuickRange('weekly')}>Weekly</button>
                <button className={`filter-btn ${activeRange === 'monthly' ? 'active' : ''}`} onClick={() => setQuickRange('monthly')}>Monthly</button>
                <button className={`filter-btn ${activeRange === 'yearly' ? 'active' : ''}`} onClick={() => setQuickRange('yearly')}>Yearly</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>From:</label>
                  <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>To:</label>
                  <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
              </div>
            </div>
          </div>

          <div className="menu-list glass-panel">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                  }).map(order => (
                    <tr key={order.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--highlight)' }}>{order.invoiceId}</td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{order.customer?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {order.customer?.phone}
                          {order.orderType && <span style={{ marginLeft: '5px', color: 'var(--highlight)' }}>({order.orderType})</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {order.items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>Rs. {order.total}</td>
                      <td>
                        <span className={`status-pill ${order.status}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Stock' && (
        <div className="stock-management-tab">
          <div className="glass-panel stock-header-controls" style={{ marginBottom: '30px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Inventory & <span className="text-gradient">Stock Dashboard</span></h2>
              <p style={{ margin: '5px 0 0', color: 'var(--text-muted)' }}>Manage materials and manually adjust stock levels.</p>
            </div>
            <div className="stock-search-container">
              <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search stock..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 15px 10px 40px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '30px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: '0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--highlight)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn-highlight" onClick={() => setShowStockForm(!showStockForm)} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={18} /> {showStockForm ? 'Cancel' : 'Add New Item'}
              </button>
              <button className="btn-outline" onClick={initializeInventory} style={{ whiteSpace: 'nowrap' }}>
                <Package size={18} /> Initialize Defaults
              </button>
            </div>
          </div>

          {showStockForm && (
            <div className="glass-panel" style={{
              marginBottom: '30px',
              padding: '28px',
              border: '1px solid var(--highlight)',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245,197,24,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              animation: 'fadeSlideDown 0.35s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--highlight), #ff9800)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(245,197,24,0.3)'
                }}>
                  <Package size={20} color="#1a1a1a" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Add New <span className="text-gradient">Stock Item</span></h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fill in the details to add a new inventory item</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStockForm(false)}
                  style={{
                    marginLeft: 'auto', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)', borderRadius: '8px',
                    padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', transition: '0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddStockItem} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2 1 220px', minWidth: '200px' }}>
                  <label style={{
                    fontSize: '0.78rem', color: 'var(--highlight)', display: 'block',
                    marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>Item Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Burger Patty, Cheese Slices"
                    value={newStockItem.name}
                    onChange={e => setNewStockItem({ ...newStockItem, name: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                      borderRadius: '10px', color: 'white', fontSize: '0.92rem',
                      transition: '0.3s', outline: 'none'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--highlight)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                  <label style={{
                    fontSize: '0.78rem', color: 'var(--highlight)', display: 'block',
                    marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>Unit *</label>
                  <select
                    value={newStockItem.unit}
                    onChange={e => setNewStockItem({ ...newStockItem, unit: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                      borderRadius: '10px', color: 'white', fontSize: '0.92rem',
                      transition: '0.3s', outline: 'none', cursor: 'pointer'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--highlight)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="" style={{ background: '#1a1a1a' }}>Select Unit...</option>
                    <option value="Numbers" style={{ background: '#1a1a1a' }}>Numbers (pcs)</option>
                    <option value="Grams" style={{ background: '#1a1a1a' }}>Grams (g)</option>
                    <option value="Kilograms" style={{ background: '#1a1a1a' }}>Kilograms (kg)</option>
                    <option value="Litres" style={{ background: '#1a1a1a' }}>Litres (L)</option>
                    <option value="Millilitres" style={{ background: '#1a1a1a' }}>Millilitres (mL)</option>
                    <option value="Boxes" style={{ background: '#1a1a1a' }}>Boxes</option>
                    <option value="Packets" style={{ background: '#1a1a1a' }}>Packets</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
                  <label style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block',
                    marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>Initial Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={newStockItem.quantity}
                    onChange={e => setNewStockItem({ ...newStockItem, quantity: e.target.value })}
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
                      borderRadius: '10px', color: 'white', fontSize: '0.92rem',
                      transition: '0.3s', outline: 'none'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--highlight)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <button type="submit" className="btn-highlight" style={{
                  height: '44px', padding: '0 28px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontWeight: '600', fontSize: '0.9rem', letterSpacing: '0.3px',
                  boxShadow: '0 4px 15px rgba(245,197,24,0.25)',
                  transition: 'all 0.3s ease'
                }}>
                  <Save size={17} /> Add to Inventory
                </button>
              </form>
            </div>
          )}


          <div className="inventory-table-container" style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Unit</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Quantity</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Add Stock</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Remove Stock</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Last Updated</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {inventory
                  .filter(item => item.name.toLowerCase().includes(stockSearch.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '8px' }}>{item.name}</td>
                      <td style={{ padding: '8px' }}>{item.unit}</td>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          className="btn-highlight"
                          style={{ padding: '6px 12px' }}
                          onClick={() => {
                            const val = prompt(`Add quantity to ${item.name}:`);
                            if (val) adjustStock(item.id, val, 'Manual Addition');
                          }}
                        >Add</button>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          className="btn-outline"
                          style={{ padding: '6px 12px' }}
                          onClick={() => {
                            const val = prompt(`Remove quantity from ${item.name}:`);
                            if (val) adjustStock(item.id, -Math.abs(val), 'Manual Removal');
                          }}
                        >Remove</button>
                      </td>
                      <td style={{ padding: '8px' }}>{item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleTimeString() : 'N/A'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button className="btn-icon text-danger" style={{ opacity: 0.5 }} onClick={() => deleteInventoryItem(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Menu Management' && (
        <div className="menu-management-tab">
          <div className="add-item-form glass-panel">
            <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
            <form onSubmit={handleAddItem}>
              <div className="image-upload-wrapper">
                <div
                  className="image-upload-box"
                  style={{
                    height: '140px',
                    cursor: 'default',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    borderColor: 'var(--glass-border)',
                    background: 'rgba(255,255,255,0.01)'
                  }}
                >
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview-img" style={{ objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <ImageIcon size={32} />
                      <p>Enter Image Path Below to Preview</p>
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <input
                    type="text"
                    placeholder="Image Path in public folder (e.g. /zinger.jpg)"
                    value={newItem.imagePath || ''}
                    onChange={e => {
                      setNewItem({ ...newItem, imagePath: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <input type="text" placeholder="Item Name" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  {newItem.category === 'Pizza' || newItem.category === 'Pasta' || newItem.category === 'Drinks' ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '10px 0' }}>
                      Prices will be set below for each size.
                    </div>
                  ) : (
                    <input type="number" placeholder="Price (Rs)" required value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <div className="form-toggle-group">
                    <label style={{ margin: 0, fontSize: '0.9rem', cursor: 'pointer', flex: 1 }} onClick={() => setNewItem({ ...newItem, inStock: !newItem.inStock })}>
                      {newItem.inStock ? '✅ In Stock' : '❌ Out of Stock'}
                    </label>
                    <input
                      type="checkbox"
                      className="switch"
                      checked={newItem.inStock}
                      onChange={e => setNewItem({ ...newItem, inStock: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    <option value="Pizza">Pizza</option>
                    <option value="Burgers">Burgers</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Bites">Bites</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Deals">Deals</option>
                  </select>
                </div>
              </div>

              {newItem.category === 'Deals' && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Deal Type (Subcategory)</label>
                  <select
                    value={newItem.subCategory || 'Simple Deals'}
                    onChange={e => setNewItem({ ...newItem, subCategory: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="Simple Deals">Simple Deals</option>
                    <option value="Yari Deals">Yari Deals</option>
                    <option value="Family Deals">Family Deals</option>
                    <option value="Birthday deals">Birthday deals</option>
                  </select>
                </div>
              )}

              {newItem.category === 'Deals' && (
                <div className="form-group glass-panel" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--highlight)', borderRadius: '12px' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--highlight)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <Plus size={18} /> Customizable Item Slots (Customer Picks Flavor)
                  </h4>

                  <div className="selections-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {(newItem.selections || []).map((sel, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Slot #{idx + 1}</span>
                          <button type="button" onClick={() => {
                            const updated = newItem.selections.filter((_, i) => i !== idx);
                            setNewItem({ ...newItem, selections: updated });
                          }} className="text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                            <X size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                              type="text"
                              placeholder="Label (e.g. Choose Pizza)"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              value={sel.label}
                              onChange={e => {
                                const updated = [...newItem.selections];
                                updated[idx].label = e.target.value;
                                setNewItem({ ...newItem, selections: updated });
                              }}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <select
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              value={sel.category}
                              onChange={e => {
                                const updated = [...newItem.selections];
                                updated[idx].category = e.target.value;
                                // Reset size if not applicable
                                if (e.target.value !== 'Pizza' && e.target.value !== 'Pasta') {
                                  updated[idx].size = '';
                                }
                                setNewItem({ ...newItem, selections: updated });
                              }}
                            >
                              <option value="Pizza">Pizza</option>
                              <option value="Burgers">Burgers</option>
                              <option value="Rolls">Rolls</option>
                              <option value="Pasta">Pasta</option>
                              <option value="Sides">Sides</option>
                              <option value="Deals">Deals (Sub-Deal)</option>
                            </select>
                          </div>
                          {(sel.category === 'Pizza' || sel.category === 'Pasta' || sel.category === 'Rolls') && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <select
                                style={{ width: '100%', fontSize: '0.85rem' }}
                                value={sel.size}
                                onChange={e => {
                                  const updated = [...newItem.selections];
                                  updated[idx].size = e.target.value;
                                  setNewItem({ ...newItem, selections: updated });
                                }}
                              >
                                <option value="">Select Size...</option>
                                {sel.category === 'Pizza' ? (
                                  <>
                                    <option value='Personal (6")'>Personal (6")</option>
                                    <option value='Small (7")'>Small (7")</option>
                                    <option value='Medium (10")'>Medium (10")</option>
                                    <option value='Large (13")'>Large (13")</option>
                                    <option value='XL (16")'>XL (16")</option>
                                    <option value='XXL (21")'>XXL (21")</option>
                                  </>
                                ) : sel.category === 'Pasta' ? (
                                  <>
                                    <option value="Half">Half</option>
                                    <option value="Full">Full</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="Regular">Regular</option>
                                    <option value="Special">Special</option>
                                  </>
                                )}
                              </select>
                            </div>
                          )}
                          <div className="form-group" style={{ marginBottom: 0, flex: '0 0 80px' }}>
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              value={sel.qty || 1}
                              onChange={e => {
                                const updated = [...newItem.selections];
                                updated[idx].qty = Number(e.target.value);
                                setNewItem({ ...newItem, selections: updated });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '12px', fontSize: '0.85rem', width: '100%', borderStyle: 'dashed' }}
                      onClick={() => setNewItem({ ...newItem, selections: [...(newItem.selections || []), { label: '', category: 'Pizza', size: '', qty: 1 }] })}
                    >
                      <Plus size={16} /> Add Customizable Selection Slot
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                      Adding a slot allows the customer to choose a flavor (e.g. Choose 1 Large Pizza flavor).
                      Stock for the chosen flavor will be deducted automatically.
                    </p>
                  </div>
                </div>
              )}

              {(newItem.category === 'Burgers' || newItem.category === 'Rolls') && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{newItem.category === 'Burgers' ? 'Burger Type' : 'Roll Type'} (Subcategory)</label>
                  <select
                    value={newItem.subCategory || 'Regular'}
                    onChange={e => setNewItem({ ...newItem, subCategory: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
              )}

              {newItem.category === 'Pizza' && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Customizable Flavor Slots (e.g. 4 for Quattro, 0 for none)</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    placeholder="0"
                    value={newItem.flavorSlots || ''}
                    onChange={e => setNewItem({ ...newItem, flavorSlots: e.target.value })}
                  />
                </div>
              )}

              {(newItem.category === 'Pizza' || newItem.category === 'Drinks') && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {newItem.category === 'Pizza' ? 'Pizza Sizes & Prices' : 'Drink Sizes & Prices'} (Click Price to set Recipe)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {(newItem.category === 'Pizza'
                      ? ['Personal', 'Small', 'Medium', 'Large', 'XL', 'XXL']
                      : ['250ml', '500ml', '300ml', '350ml', '1L', '1.5L', '2.25L', 'SmallBottle', 'LargeBottle']
                    ).map(size => (
                      <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <input
                          type="number"
                          placeholder={newItem.category === 'Pizza' ? `${size} (Rs)` : `${size.replace('L', ' Litre').replace('SmallBottle', 'Small Btl').replace('LargeBottle', 'Large Btl')} (Rs)`}
                          value={newItem.sizes[size]?.price || ''}
                          className={activeSizeForRecipe === size ? 'active-size' : ''}
                          onChange={e => setNewItem({ ...newItem, sizes: { ...newItem.sizes, [size]: { ...newItem.sizes[size], price: e.target.value } } })}
                          style={{ borderColor: activeSizeForRecipe === size ? 'var(--highlight)' : 'var(--glass-border)' }}
                        />
                        <button
                          type="button"
                          className={`btn-outline ${activeSizeForRecipe === size ? 'btn-highlight' : ''}`}
                          style={{ padding: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          onClick={() => setActiveSizeForRecipe(activeSizeForRecipe === size ? null : size)}
                        >
                          <Utensils size={12} /> {activeSizeForRecipe === size ? 'Main Rec' : `Recipe (${newItem.sizes[size]?.recipe?.length || 0})`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newItem.category === 'Pasta' && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pasta Sizes (Click to set Recipe)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {['Half', 'Full'].map(size => (
                      <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <input
                          key={size}
                          type="number"
                          placeholder={`${size} (Rs)`}
                          value={newItem.sizes[size]?.price || ''}
                          onChange={e => setNewItem({ ...newItem, sizes: { ...newItem.sizes, [size]: { ...newItem.sizes[size], price: e.target.value } } })}
                        />
                        <button
                          type="button"
                          className={`btn-outline ${activeSizeForRecipe === size ? 'btn-highlight' : ''}`}
                          style={{ padding: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          onClick={() => setActiveSizeForRecipe(activeSizeForRecipe === size ? null : size)}
                        >
                          <Utensils size={12} /> {activeSizeForRecipe === size ? 'Main Rec' : `Recipe (${newItem.sizes[size]?.recipe?.length || 0})`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newItem.category === 'Burgers' && (
                <div className="meal-addon-box">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: newItem.hasMealOption ? '15px' : '0' }}>
                    <input
                      type="checkbox"
                      checked={newItem.hasMealOption}
                      onChange={e => setNewItem({ ...newItem, hasMealOption: e.target.checked })}
                      className="switch"
                    />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Enable Meal Add-on (Fries & Drink) 🍟🥤</span>
                  </label>
                  {newItem.hasMealOption && (
                    <input
                      type="number"
                      placeholder="Extra Price for Meal (Rs)"
                      required
                      className="recipe-qty-input"
                      style={{ width: '100%' }}
                      value={newItem.mealPrice}
                      onChange={e => setNewItem({ ...newItem, mealPrice: e.target.value })}
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <input type="text" placeholder="Short description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
              </div>

              {/* Recipe Builder */}
              <div className="recipe-builder glass-panel" style={{ padding: '25px', marginBottom: '25px', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                  <Utensils size={20} color="var(--highlight)" />
                  <span className="text-gradient">
                    {activeSizeForRecipe ? `Recipe for ${activeSizeForRecipe}` : (newItem.category === 'Deals' ? 'Deal Components (Items included)' : 'Global Recipe')}
                  </span>
                </h4>

                <div className="quick-import glass-panel" style={{ padding: '15px', marginBottom: '20px', border: '1px solid rgba(245,197,24,0.3)', borderRadius: '12px' }}>
                  <h5 style={{ color: 'var(--highlight)', marginBottom: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={14} /> Quick Import from Menu Item
                  </h5>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', position: 'relative' }}>
                    <div className="import-search-container" ref={importRef}>
                      <input
                        type="text"
                        placeholder="Search Item to Copy..."
                        value={importSearch}
                        onFocus={() => setShowImportResults(true)}
                        onChange={e => {
                          setImportSearch(e.target.value);
                          setShowImportResults(true);
                        }}
                      />
                      {showImportResults && (
                        <div className="import-results-list">
                          {menuItems
                            .filter(i => i.category !== 'Deals' && i.name.toLowerCase().includes(importSearch.toLowerCase()))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(i => (
                              <div
                                key={i.id}
                                className={`import-result-item ${importItemId === i.id ? 'selected' : ''}`}
                                onClick={() => {
                                  setImportItemId(i.id);
                                  setImportSearch(i.name);
                                  setShowImportResults(false);
                                  setImportSizeName('');
                                }}
                              >
                                <span className="import-result-name">{i.name}</span>
                                <span className="import-result-cat" style={{ marginLeft: '5px' }}>({i.category})</span>
                              </div>
                            ))}
                          {menuItems.filter(i => i.category !== 'Deals' && i.name.toLowerCase().includes(importSearch.toLowerCase())).length === 0 && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No items found.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {importItemId && menuItems.find(i => i.id === importItemId)?.hasSizes && (
                      <select
                        style={{ flex: 1, minWidth: '120px' }}
                        value={importSizeName}
                        onChange={e => setImportSizeName(e.target.value)}
                      >
                        <option value="">Select Size...</option>
                        {menuItems.find(i => i.id === importItemId).sizes.map(s => (
                          <option key={s.size} value={s.size} style={{ background: '#1a1a1a' }}>{s.size}</option>
                        ))}
                      </select>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty:</span>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '60px', padding: '5px' }}
                        value={importQty}
                        onChange={e => setImportQty(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-highlight"
                      style={{ padding: '8px 15px', fontSize: '0.85rem' }}
                      onClick={handleImportIngredients}
                      disabled={!importItemId}
                    >
                      Import Ingredients
                    </button>
                  </div>
                </div>

                <div className="recipe-items-list" style={{ marginBottom: '20px' }}>
                  {(activeSizeForRecipe ? newItem.sizes[activeSizeForRecipe]?.recipe : newItem.recipe)?.map((ing, idx) => {
                    const invItem = inventory.find(i => i.id === ing.inventoryId);
                    return (
                      <div key={idx} className="ingredient-tag">
                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {invItem?.name || 'Unknown Item'} : <strong style={{ color: 'var(--highlight)' }}>{ing.quantityUsed} {invItem?.unit}</strong>
                        </span>
                        <button
                          type="button"
                          className="text-danger"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }}
                          onClick={() => {
                            if (activeSizeForRecipe) {
                              const updatedRecipe = newItem.sizes[activeSizeForRecipe].recipe.filter((_, i) => i !== idx);
                              setNewItem({
                                ...newItem,
                                sizes: {
                                  ...newItem.sizes,
                                  [activeSizeForRecipe]: { ...newItem.sizes[activeSizeForRecipe], recipe: updatedRecipe }
                                }
                              });
                            } else {
                              const updatedRecipe = newItem.recipe.filter((_, i) => i !== idx);
                              setNewItem({ ...newItem, recipe: updatedRecipe });
                            }
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {((activeSizeForRecipe ? newItem.sizes[activeSizeForRecipe]?.recipe : newItem.recipe)?.length === 0 || !(activeSizeForRecipe ? newItem.sizes[activeSizeForRecipe]?.recipe : newItem.recipe)) && (
                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No ingredients added for this {activeSizeForRecipe ? 'size' : 'item'}.</p>
                    </div>
                  )}
                </div>

                <div className="recipe-input-group">
                  <select
                    className="recipe-select"
                    style={{ flex: 3 }}
                    value={tempIngredient.inventoryId}
                    onChange={e => setTempIngredient({ ...tempIngredient, inventoryId: e.target.value })}
                  >
                    <option value="">Select Ingredient...</option>
                    {inventory.sort((a, b) => a.name.localeCompare(b.name)).map(i => (
                      <option key={i.id} value={i.id} style={{ background: '#1a1a1a' }}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    className="recipe-qty-input"
                    style={{ flex: 1 }}
                    value={tempIngredient.quantityUsed}
                    onChange={e => setTempIngredient({ ...tempIngredient, quantityUsed: e.target.value })}
                  />
                  <button
                    type="button"
                    className="add-recipe-btn"
                    onClick={() => {
                      if (!tempIngredient.inventoryId || !tempIngredient.quantityUsed) return;

                      if (activeSizeForRecipe) {
                        const currentSizeData = newItem.sizes[activeSizeForRecipe] || { price: '', recipe: [] };
                        const currentRecipe = currentSizeData.recipe || [];

                        setNewItem({
                          ...newItem,
                          sizes: {
                            ...newItem.sizes,
                            [activeSizeForRecipe]: {
                              ...currentSizeData,
                              recipe: [...currentRecipe, { ...tempIngredient }]
                            }
                          }
                        });
                      } else {
                        setNewItem({
                          ...newItem,
                          recipe: [...(newItem.recipe || []), { ...tempIngredient }]
                        });
                      }
                      setTempIngredient({ inventoryId: '', quantityUsed: '' });
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-highlight w-100">
                  <Save size={18} style={{ marginRight: '8px' }} />
                  {editingItem ? 'Update Menu Item' : 'Add Menu Item'}
                </button>
                {editingItem && (
                  <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setEditingItem(null); setNewItem(initialNewItem); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="menu-list glass-panel">
            <h2>Current Menu Items</h2>

            {categoriesOrder.map(cat => {
              const catItems = menuItems.filter(item => item.category === cat).sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999));
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="category-group" style={{ marginTop: '30px' }}>
                  <h3
                    style={{ color: 'var(--accent)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {cat} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({catItems.length})</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {collapsedCategories[cat] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </h3>
                  {!collapsedCategories[cat] && (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Sort ID</th>
                            <th>Price</th>
                            <th>Stock Status (Click to Toggle)</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catItems.map(item => (
                            <tr key={item.id}>
                              <td>
                                {item.imagePath ? (
                                  <img src={item.imagePath} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ImageIcon size={16} style={{ opacity: 0.3 }} />
                                  </div>
                                )}
                              </td>
                              <td style={{ fontWeight: '500' }}>
                                <div>{item.name}</div>
                                {item.category === 'Deals' && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--highlight)', marginTop: '2px' }}>
                                    Type: {item.subCategory || 'Simple Deals'}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  defaultValue={item.sortOrder || ''}
                                  placeholder="#"
                                  style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', textAlign: 'center' }}
                                  onBlur={async (e) => {
                                    try {
                                      const val = e.target.value;
                                      const updateData = val === '' ? { sortOrder: 999 } : { sortOrder: Number(val) };
                                      await updateDoc(doc(db, 'menu', item.id), updateData);
                                    } catch (err) {
                                      console.error("Error updating sort order:", err);
                                    }
                                  }}
                                />
                              </td>
                              <td>{item.hasSizes ? `From Rs. ${item.price}` : `Rs. ${item.price}`}</td>
                              <td>
                                <span
                                  className={item.inStock ? 'text-success' : 'text-danger'}
                                  style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                                  onClick={() => toggleStock(item.id, item.inStock)}
                                >
                                  {item.inStock ? '✅ In Stock' : '❌ Out of Stock'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="edit-btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleEditItem(item)}>Edit</button>
                                  <button className="delete-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => deleteItem(item.id)}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Team Tab */}
      {activeTab === 'Delivery Team' && (
        <div className="delivery-tab">

          <div className="analytics-filters glass-panel" style={{ marginBottom: '20px' }}>
            <div className="date-filter-group">
              <h3 style={{ margin: 0, marginRight: 'auto' }}>Filter Stats Range</h3>
              <div className="filter-range-panel" style={{ display: 'flex', gap: '10px' }}>
                <button className={`filter-btn ${activeRange === 'daily' ? 'active' : ''}`} onClick={() => setQuickRange('daily')}>Daily</button>
                <button className={`filter-btn ${activeRange === 'weekly' ? 'active' : ''}`} onClick={() => setQuickRange('weekly')}>Weekly</button>
                <button className={`filter-btn ${activeRange === 'monthly' ? 'active' : ''}`} onClick={() => setQuickRange('monthly')}>Monthly</button>
                <button className={`filter-btn ${activeRange === 'yearly' ? 'active' : ''}`} onClick={() => setQuickRange('yearly')}>Yearly</button>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>From:</label>
                  <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
                <div>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '5px' }}>To:</label>
                  <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveRange('custom'); }} className="date-input" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: '30px', alignItems: 'start' }}>
            <div className="glass-panel">
              <h2 style={{ marginBottom: '20px' }}>Create Pilot Account</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Securely generate credentials for new delivery team members. They can log in immediately at /login.
              </p>
              <form onSubmit={handleCreateDeliveryBoy}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Full Name</label>
                  <input type="text" required value={newDeliveryName} onChange={e => setNewDeliveryName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Email Address</label>
                  <input type="email" required value={newDeliveryEmail} onChange={e => setNewDeliveryEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }} />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                  <input type="password" required minLength={6} value={newDeliveryPassword} onChange={e => setNewDeliveryPassword(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }} />
                </div>
                <button type="submit" className="btn-primary w-100" disabled={deliveryCreationLoading} style={{ padding: '12px' }}>
                  {deliveryCreationLoading ? 'Authorizing...' : 'Create Account'}
                </button>
              </form>
            </div>

            <div className="glass-panel">
              <h2 style={{ marginBottom: '20px' }}>Active Pilots (Best Stats)</h2>
              {deliveryBoys.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No drivers enrolled.</p>
              ) : (
                deliveryBoys
                  .map(boy => {
                    const deliveredOrdRange = activeOrders.filter(o => o.deliveryBoyId === boy.id && o.status === 'delivered').length;
                    const deliveredOrdOverall = orders.filter(o => o.deliveryBoyId === boy.id && o.status === 'delivered').length;
                    return { ...boy, deliveredOrdRange, deliveredOrdOverall };
                  })
                  .sort((a, b) => b.deliveredOrdRange - a.deliveredOrdRange)
                  .map((boy, index) => (
                    <div key={boy.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: index === 0 && boy.deliveredOrdRange > 0 ? 'rgba(255,179,71,0.15)' : 'rgba(255,179,71,0.05)', border: index === 0 && boy.deliveredOrdRange > 0 ? '1px solid var(--highlight)' : '1px solid rgba(255,179,71,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '10px', position: 'relative' }}>
                      {index === 0 && boy.deliveredOrdRange > 0 && (
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '1.5rem', filter: 'drop-shadow(0 2px 5px rgba(255,215,0,0.5))' }}>👑</div>
                      )}
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: index === 0 && boy.deliveredOrdRange > 0 ? 'var(--highlight)' : '#fff' }}>{boy.name}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{boy.email}</div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', gap: '20px' }}>
                        <div>
                          <div style={{ fontSize: '1.2rem', color: 'var(--highlight)', fontWeight: 'bold' }}>{boy.deliveredOrdRange}</div>
                          <div style={{ fontSize: '0.7rem', color: '#ccc', textTransform: 'uppercase' }}>In Range</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{boy.deliveredOrdOverall}</div>
                          <div style={{ fontSize: '0.7rem', color: '#ccc', textTransform: 'uppercase' }}>Overall</div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Reminder Popup */}
      {showStockPopup && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'modalFadeIn 0.3s ease-out'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowStockPopup(false); }}
        >
          <div style={{
            background: 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)',
            border: '1px solid rgba(245,197,24,0.35)',
            borderRadius: '20px',
            padding: '36px 32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(245,197,24,0.08)',
            animation: 'fadeSlideDown 0.35s ease-out',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Close X */}
            <button
              onClick={() => setShowStockPopup(false)}
              style={{
                position: 'absolute', top: '14px', right: '16px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '4px 7px', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                transition: '0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, var(--highlight), #ff9800)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 25px rgba(245,197,24,0.3)'
            }}>
              <Package size={30} color="#1a1a1a" />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800 }}>
              Update <span className="text-gradient">Stock?</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 10px', lineHeight: 1.6 }}>
              Welcome back, Admin! 👋<br />
              Would you like to add or update stock levels right now?
            </p>
            <p dir="rtl" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 28px', lineHeight: 1.8, fontFamily: 'Noto Nastaliq Urdu, Jameel Noori Nastaleeq, serif' }}>
              خوش آمدید ایڈمن! کیا آپ ابھی اسٹاک شامل یا اپڈیٹ کرنا چاہتے ہیں؟
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setShowStockPopup(false); }}
                style={{
                  flex: 1, padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', color: 'var(--text-muted)',
                  fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  setShowStockPopup(false);
                  setActiveTab('Stock');
                }}
                className="btn-highlight"
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  fontSize: '0.92rem', fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(245,197,24,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Package size={17} /> Yes, Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDash;
