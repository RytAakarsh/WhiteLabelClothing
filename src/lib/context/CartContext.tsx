'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { CartItemType } from '@/lib/types';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

interface CartContextType {
  items: CartItemType[];
  addItem: (item: Omit<CartItemType, 'quantity'>, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  itemCount: 0,
  subtotal: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
});

const CART_STORAGE_KEY = 'whitelabel_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to storage:', e);
      }
    }
  }, [items, isLoaded]);

  // Sync / merge guest cart with user database cart when authenticated
  useEffect(() => {
    if (!user || !isLoaded) return;

    const syncWithDb = async () => {
      try {
        // Ensure user cart exists
        let { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cart) {
          const { data: newCart, error: createCartError } = await supabase
            .from('carts')
            .insert({ user_id: user.id })
            .select('id')
            .single();
          if (createCartError) throw createCartError;
          cart = newCart;
        }

        if (!cart) return;

        // Fetch existing items in db cart
        const { data: dbItems, error: fetchError } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            variant_id,
            quantity,
            product_variants (
              id,
              size,
              sku,
              stock_quantity,
              price_adjustment,
              products (
                id,
                name,
                slug,
                base_price,
                compare_at_price,
                product_images (
                  storage_path,
                  is_primary
                )
              )
            )
          `)
          .eq('cart_id', cart.id);

        if (fetchError) throw fetchError;

        // Merge local items into DB
        const localItems = [...items];
        for (const localItem of localItems) {
          const existingInDb = dbItems?.find((d: any) => d.variant_id === localItem.variant_id);
          const finalQty = existingInDb ? Math.max(existingInDb.quantity, localItem.quantity) : localItem.quantity;

          await supabase.from('cart_items').upsert(
            {
              cart_id: cart.id,
              product_id: localItem.product_id,
              variant_id: localItem.variant_id,
              quantity: finalQty,
            },
            { onConflict: 'cart_id,variant_id' }
          );
        }

        // Refresh items state from merged DB cart
        const { data: mergedDbItems } = await supabase
          .from('cart_items')
          .select(`
            quantity,
            product_variants (
              id,
              size,
              sku,
              stock_quantity,
              price_adjustment,
              products (
                id,
                name,
                slug,
                base_price,
                compare_at_price,
                product_images (
                  storage_path,
                  is_primary
                )
              )
            )
          `)
          .eq('cart_id', cart.id);

        if (mergedDbItems && mergedDbItems.length > 0) {
          const formatted: CartItemType[] = mergedDbItems.map((row: any) => {
            const v = row.product_variants;
            const p = v.products;
            const primaryImg = p.product_images?.find((img: any) => img.is_primary)?.storage_path ||
              p.product_images?.[0]?.storage_path ||
              '/images/brand-logo.png';

            return {
              variant_id: v.id,
              product_id: p.id,
              product_name: p.name,
              product_slug: p.slug,
              size: v.size,
              sku: v.sku || null,
              price: (p.base_price || 0) + (v.price_adjustment || 0),
              compare_at_price: p.compare_at_price || null,
              image: primaryImg,
              quantity: row.quantity,
              max_stock: v.stock_quantity,
            };
          });
          setItems(formatted);
        }
      } catch (err) {
        console.error('Cart sync error:', err);
      }
    };

    syncWithDb();
  }, [user]);

  const addItem = (item: Omit<CartItemType, 'quantity'>, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant_id === item.variant_id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, item.max_stock > 0 ? item.max_stock : 99);
        return prev.map((i) =>
          i.variant_id === item.variant_id ? { ...i, quantity: newQty } : i
        );
      } else {
        const initialQty = Math.min(quantity, item.max_stock > 0 ? item.max_stock : 99);
        return [...prev, { ...item, quantity: initialQty }];
      }
    });
    setIsCartOpen(true);
  };

  const removeItem = async (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variant_id !== variantId));
    if (user) {
      try {
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cart) {
          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cart.id)
            .eq('variant_id', variantId);
        }
      } catch (e) {
        console.error('Error removing cart item from db:', e);
      }
    }
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(variantId);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.variant_id === variantId) {
          const validQty = Math.min(quantity, i.max_stock > 0 ? i.max_stock : 99);
          return { ...i, quantity: validQty };
        }
        return i;
      })
    );

    if (user) {
      try {
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cart) {
          await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('cart_id', cart.id)
            .eq('variant_id', variantId);
        }
      } catch (e) {
        console.error('Error updating quantity in db:', e);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      if (user) {
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cart) {
          await supabase.from('cart_items').delete().eq('cart_id', cart.id);
        }
      }
    } catch (e) {
      console.error('Error clearing cart:', e);
    }
  };

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
