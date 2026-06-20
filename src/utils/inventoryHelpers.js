import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, increment, serverTimestamp, getDocs, collection } from 'firebase/firestore';

export const deductOrderStock = async (orderItems) => {
  try {
    // 1. Fetch entire menu and inventory once for efficiency
    const [menuSnap, inventorySnap] = await Promise.all([
      getDocs(collection(db, 'menu')),
      getDocs(collection(db, 'inventory'))
    ]);

    const allInventory = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allMenu = menuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const item of orderItems) {
      const baseId = item.itemId; // Order items use itemId
      if (!baseId) continue;

      const deductRecipe = async (recipe, multiplier, itemName) => {
        if (!recipe || !Array.isArray(recipe)) return;
        let count = 0;
        for (const ingredient of recipe) {
          if (!ingredient.inventoryId) continue;
          const inventoryRef = doc(db, 'inventory', ingredient.inventoryId);
          const deductionAmount = Number(ingredient.quantityUsed) * multiplier;
          
          if (isNaN(deductionAmount) || deductionAmount <= 0) continue;

          const invItem = allInventory.find(i => i.id === ingredient.inventoryId);
          if (invItem) {
            await updateDoc(inventoryRef, {
              quantity: increment(-deductionAmount),
              updatedAt: serverTimestamp()
            });
            count++;
          }
        }
        if (count > 0) {
          console.log(`Deducted ${count} ingredients for: ${itemName}`);
        }
      };

      const deductMealIngredients = async (qty) => {
        const fries = allInventory.find(i => i.name.toLowerCase().includes('fries'));
        const drink = allInventory.find(i => i.name.toLowerCase().includes('cold drink 250ml'));

        if (fries) {
          await updateDoc(doc(db, 'inventory', fries.id), {
            quantity: increment(-(80 * qty)),
            updatedAt: serverTimestamp()
          });
        }
        if (drink) {
          await updateDoc(doc(db, 'inventory', drink.id), {
            quantity: increment(-qty),
            updatedAt: serverTimestamp()
          });
        }
        console.log(`Deducted Meal ingredients (Fries & Drink) x${qty}`);
      };

      const deductExtraToppings = async (itemName, sizeName, multiplier) => {
        const toppingsToFind = [];
        const lowerName = itemName.toLowerCase();
        if (lowerName.includes('extra chicken')) toppingsToFind.push('extra chicken topping');
        if (lowerName.includes('extra cheese')) toppingsToFind.push('extra cheese topping');
        if (lowerName.includes('extra veg')) toppingsToFind.push('extra vegetable topping');

        for (const topName of toppingsToFind) {
          const topMenuData = allMenu.find(m => m.name.toLowerCase().includes(topName));
          if (topMenuData) {
            let topRecipe = [];
            if (topMenuData.hasSizes && sizeName) {
              const szData = topMenuData.sizes.find(s => s.size === sizeName || s.size.includes(sizeName) || sizeName.includes(s.size));
              topRecipe = szData?.recipe || [];
            } else {
              topRecipe = topMenuData.recipe || [];
            }
            if (topRecipe.length > 0) {
              await deductRecipe(topRecipe, multiplier, `${topName} (${sizeName || 'Standard'})`);
            }
          }
        }
      };

      const deductPizzaFlavors = async (flavors, sizeName, multiplier) => {
        if (!flavors || !Array.isArray(flavors) || flavors.length === 0) return;

        const totalGramsPerSize = {
          'Personal (6")': 45,
          'Small (7")': 55,
          'Medium (10")': 130,
          'Large (13")': 210,
          'XL (16")': 350,
          'XXL (21")': 500
        };

        const totalGrams = totalGramsPerSize[sizeName] || 150; // default to medium if unknown
        const gramsPerFlavor = totalGrams / flavors.length;

        for (const flavorName of flavors) {
          // Match inventory item by name (ignoring case)
          const invItem = allInventory.find(i => i.name.toLowerCase().includes(flavorName.toLowerCase()));
          if (invItem) {
            const inventoryRef = doc(db, 'inventory', invItem.id);
            const deductionAmount = gramsPerFlavor * multiplier;
            
            await updateDoc(inventoryRef, {
              quantity: increment(-deductionAmount),
              updatedAt: serverTimestamp()
            });
            console.log(`Deducted ${deductionAmount}g of ${invItem.name} for Pizza Flavor`);
          }
        }
      };

      // Find the specific menu item from our pre-fetched list
      let menuData = allMenu.find(m => m.id === baseId);
      
      // Fallback for hyphenated IDs (e.g. ID-Size)
      if (!menuData && baseId && typeof baseId === 'string' && baseId.includes('-')) {
        const fallbackId = baseId.split('-')[0];
        menuData = allMenu.find(m => m.id === fallbackId);
      }
      
      if (menuData) {
        let recipeToUse = menuData.recipe || [];
        let recipeFoundName = "";
        let finalSizeName = "";

        // 1. Determine Recipe based on Size
        if (menuData.hasSizes && Array.isArray(menuData.sizes) && item.selectedSize) {
          const szName = typeof item.selectedSize === 'string' ? item.selectedSize : item.selectedSize.size; 
          finalSizeName = szName;
          
          if (szName) {
            const szData = menuData.sizes.find(s => s.size === szName || s.size.includes(szName) || szName.includes(s.size));
            if (szData && szData.recipe && szData.recipe.length > 0) {
              recipeToUse = szData.recipe;
              recipeFoundName = `${menuData.name} (${szName})`;
            }
          }
        } 
        
        if (!recipeFoundName && recipeToUse.length > 0) {
          recipeFoundName = menuData.name;
        }

        if (recipeFoundName) {
          await deductRecipe(recipeToUse, item.qty, recipeFoundName);
        }

        // 2. Handle "Make it a Meal" Add-on (Check name safely)
        const itemNameLower = (item.name || "").toLowerCase();
        if (itemNameLower.includes('with fries & drink') || (item.itemId && item.itemId.includes('-meal'))) {
          await deductMealIngredients(item.qty);
        }

        // 3. Handle Extra Toppings (Pizza)
        if (menuData.category === 'Pizza' || itemNameLower.includes('extra')) {
          await deductExtraToppings(item.name || "", finalSizeName, item.qty);
          if (item.selectedPizzaFlavors) {
            await deductPizzaFlavors(item.selectedPizzaFlavors, finalSizeName, item.qty);
          }
        }

        // 4. Deduct Selected Flavors/Selections (for Deals)
        if (item.selectedFlavors && Array.isArray(item.selectedFlavors)) {
          for (const flavor of item.selectedFlavors) {
            const flavorData = allMenu.find(m => m.id === flavor.id);
            if (flavorData) {
              let flavorRecipe = flavorData.recipe || [];
              let flavorFoundName = "";

              if (flavorData.hasSizes && Array.isArray(flavorData.sizes) && flavor.size) {
                const szName = flavor.size;
                const szData = flavorData.sizes.find(s => s.size === szName || s.size.includes(szName) || szName.includes(s.size));
                if (szData && szData.recipe && szData.recipe.length > 0) {
                  flavorRecipe = szData.recipe;
                  flavorFoundName = `${flavorData.name} (${szName})`;
                }
              } else if (flavorRecipe.length > 0) {
                flavorFoundName = flavorData.name;
              }

              if (flavorFoundName) {
                const flavorMultiplier = item.qty * (flavor.qty || 1);
                await deductRecipe(flavorRecipe, flavorMultiplier, flavorFoundName);
              }
            }
          }
        }
      } else {
        console.warn("Deduction: Menu item not found for ID:", baseId);
      }
    }
  } catch (error) {
    console.error("Critical error in inventory stock deduction:", error);
    throw error;
  }
};

