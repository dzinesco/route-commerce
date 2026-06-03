"use client";

import { CartItem } from "@/types";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

type StopInfo = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brand_id: string;
};

type CartContextType = {
  cart: CartItem[];
  subtotal: number;
  selectedStop: StopInfo | null;
  cartBrandId: string | null;
  cartBrandSlug: string | null;
  justAdded: CartItem | null;
  cartRestored: boolean;  // true when server cart was loaded (for toast)
  setSelectedStop: (stop: StopInfo | null) => void;
  addToCart: (item: Omit<CartItem, "quantity">, fulfillment?: "pickup" | "ship") => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  dismissToast: () => void;
  /** Returns raw local cart — used by login page to merge before redirecting */
  getLocalCart: () => CartItem[];
  /** Loads server cart for a logged-in user, replaces local cart + localStorage.
   *  Call once on admin page mount for logged-in users.
   *  Returns true if a server cart was loaded (shows the restored toast). */
  loadServerCart: (userId: string) => Promise<boolean>;
  /** Dismiss the cart-restored toast */
  dismissRestoredToast: () => void;
};

const CART_KEY = "route_commerce_cart";
const STOP_KEY = "route_commerce_stop";

const CartContext = createContext<CartContextType | undefined>(undefined);

function parsePrice(price: string): number {
  const cleaned = String(price).replace("$", "").replace(",", "");
  return Number(cleaned) || 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStop, setSelectedStopState] = useState<StopInfo | null>(null);
  const [justAdded, setJustAdded] = useState<CartItem | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [cartRestored, setCartRestored] = useState(false);  // shown once per session
  const [restoredDismissed, setRestoredDismissed] = useState(false);

  // ── Single mount-only effect: hydrate from localStorage + validate ────────
  // Reads cart + stop from localStorage, then repairs stale state:
  //   - empty cart with stale stop → drop stop
  //   - cart items missing brand_id (legacy pre-fix data) → clear everything
  //   - stop brand != cart brand → drop stop, keep cart
  //
  // This MUST run in useEffect (not in useState's lazy initializer) because
  // localStorage isn't available during SSR, and reading it on the first
  // client render would cause a hydration mismatch vs. the server-rendered
  // empty cart. The setState calls are intentional post-hydration setup.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- legitimate browser-storage hydration on mount */
    let storedCart: CartItem[] = [];
    let storedStop: StopInfo | null = null;
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed)) storedCart = parsed;
      }
      const rawStop = localStorage.getItem(STOP_KEY);
      if (rawStop) {
        const parsed = JSON.parse(rawStop);
        if (parsed && typeof parsed === "object" && parsed.id) storedStop = parsed;
      }
    } catch {
      // ignore — fall through with empty values
    }

    const cartBrandId = storedCart[0]?.brand_id;

    if (storedCart.length === 0) {
      // Empty cart — keep it empty, but clear any stale stop
      setCart([]);
      if (storedStop) setSelectedStopState(null);
    } else if (!cartBrandId) {
      // Legacy cart without brand_id — nuke both to avoid cross-brand pollution
      try {
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(STOP_KEY);
      } catch {
        // ignore
      }
      setCart([]);
      setSelectedStopState(null);
    } else {
      // Healthy cart — apply it
      setCart(storedCart);
      if (storedStop?.brand_id && storedStop.brand_id !== cartBrandId) {
        // Stop belongs to a different brand — drop it
        try {
          localStorage.removeItem(STOP_KEY);
        } catch {
          // ignore
        }
        setSelectedStopState(null);
      } else if (storedStop) {
        setSelectedStopState(storedStop);
      }
    }

    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, hydrated]);

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  // Listen for cart changes in other tabs and reconcile.
  // This ensures a product added in tab A immediately appears in tab B.
  useEffect(() => {
    if (!hydrated) return;

    function handleStorageChange(e: StorageEvent) {
      if (e.key !== CART_KEY) return;
      if (e.newValue === null) return; // cleared elsewhere — let local clear handle it
      try {
        const remote = JSON.parse(e.newValue);
        if (!Array.isArray(remote)) return;
        setCart((prev) => {
          // Only accept remote if it differs from our current cart
          // (avoids overwriting local with same value after our own write)
          const localJson = JSON.stringify(prev);
          if (localJson === e.newValue) return prev;
          return remote;
        });
      } catch {
        // ignore malformed data
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [hydrated]);

  const setSelectedStop = useCallback((stop: StopInfo | null) => {
    setSelectedStopState(stop);
    try {
      if (stop) {
        localStorage.setItem(STOP_KEY, JSON.stringify(stop));
      } else {
        localStorage.removeItem(STOP_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  function addToCart(item: Omit<CartItem, "quantity">, fulfillment?: "pickup" | "ship") {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        const updated = prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
        const resultItem = { ...existing, quantity: existing.quantity + 1 };
        setJustAdded(resultItem);
        return updated;
      }
      // Cross-brand guard: clear cart + selectedStop if items exist from a different brand
      const newItem: CartItem = { ...item, quantity: 1, fulfillment: fulfillment ?? "pickup" };
      setJustAdded(newItem);
      if (prev.length > 0 && prev[0].brand_id !== item.brand_id) {
        // Clear selectedStop since brand is changing
        setSelectedStop(null);
        return [newItem];
      }
      return [...prev, newItem];
    });
  }

  function increaseQuantity(id: string) {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  }

  function decreaseQuantity(id: string) {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = prev.filter((item) => item.id !== id);
      // Clear stop if cart is now empty
      if (next.length === 0) {
        setSelectedStop(null);
      }
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    try {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(STOP_KEY);
    } catch {
      // ignore
    }
  }

  function dismissToast() {
    setJustAdded(null);
  }

  function dismissRestoredToast() {
    setRestoredDismissed(true);
  }

  async function loadServerCart(userId: string): Promise<boolean> {
    if (!userId || !hydrated) return false;
    try {
      const { getServerCart } = await import("@/actions/checkout");
      const serverItems = await getServerCart(userId);
      if (serverItems.length === 0) return false;

      // Replace localStorage so cross-tab stays in sync
      localStorage.setItem(CART_KEY, JSON.stringify(serverItems));
      setCart(serverItems);
      setCartRestored(true);
      setRestoredDismissed(false);
      return true;
    } catch {
      return false;
    }
  }

  function getLocalCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0);

  const cartBrandId = cart.length > 0 ? cart[0].brand_id : null;
  const cartBrandSlug = cart.length > 0 ? cart[0].brand_slug : null;

  const showRestoredToast = cartRestored && !restoredDismissed;

  return (
    <CartContext.Provider
      value={{
        cart,
        subtotal,
        selectedStop,
        cartBrandId,
        cartBrandSlug,
        justAdded,
        cartRestored: showRestoredToast,
        setSelectedStop: setSelectedStop,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        dismissToast,
        getLocalCart,
        loadServerCart,
        dismissRestoredToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
