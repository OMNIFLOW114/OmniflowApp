// src/pages/Checkout.jsx - FINAL PRODUCTION (Trust badges, inline hint, sticky mobile bar)
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  FaWallet, FaMobileAlt, FaChevronDown, FaChevronUp,
  FaStore, FaBox, FaBolt, FaClock, FaTruck, FaMotorcycle,
  FaMapMarkerAlt, FaArrowLeft, FaSpinner, FaPercent,
  FaInfoCircle, FaPlus, FaMinus, FaHistory, FaLock, FaShieldAlt,
  FaUndo, FaExclamationTriangle,
} from "react-icons/fa";
import styles from "./Checkout.module.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LAST_ADDRESS_KEY = "omniflow_last_delivery_address";

if (GOOGLE_MAPS_API_KEY) {
  setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly", libraries: ["places", "routes"] });
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
const formatKSH = (amount) => {
  const num = Number(amount || 0);
  if (Number.isInteger(num) || num % 1 === 0) return `KSh ${num.toLocaleString("en-KE")}`;
  return `KSh ${num.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getDeliveryOptions = (product) => {
  if (!product || !product.delivery_methods) return { offersPickup: false, offersDoor: false };
  const dm = product.delivery_methods;
  const offersPickup = dm.pickup === "Yes" || dm.pickup === true || dm.pickup === "true" || (typeof dm.pickup === "string" && dm.pickup.toLowerCase() === "yes");
  const offersDoor = dm.door === "Yes" || dm.door === true || dm.door === "true" || (typeof dm.door === "string" && dm.door.toLowerCase() === "yes");
  return { offersPickup, offersDoor };
};

const getDeliveryETA = (distanceKm, estimatedDays) => {
  if (!distanceKm || distanceKm === Infinity) return { label: "Standard Delivery", color: "#94a3b8" };
  if (distanceKm <= 5) return { label: "Same Day Delivery", color: "#10b981" };
  if (distanceKm <= 30) return { label: "Next Day Delivery", color: "#f59e0b" };
  if (distanceKm <= 100) return { label: "2-Day Delivery", color: "#ef4444" };
  return { label: `${estimatedDays || 3}-Day Delivery`, color: "#ef4444" };
};

const toastGuardRef = { current: {} };
const canShowToast = (id, windowMs = 4000) => {
  const now = Date.now();
  if (now - (toastGuardRef.current[id] || 0) < windowMs) return false;
  toastGuardRef.current[id] = now;
  return true;
};

const CheckoutSkeleton = () => {
  const { darkMode } = useDarkMode();
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}><div className={styles.skeletonBackBtn} /><div className={styles.skeletonTitle} /></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLeft}><div className={styles.skeletonCard} /><div className={styles.skeletonCard} /></div>
        <div className={styles.skeletonRight}><div className={styles.skeletonCard} /></div>
      </div>
    </div>
  );
};

export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const location = useLocation();

  const { initiateWalletDeposit, loading: mpesaLoading, cancelPolling } = useMpesaPayment();

  const fromCart = location.state?.fromCart;
  const fromFlashSale = location.state?.fromFlashSale;

  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [storeDeliverySettings, setStoreDeliverySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashSaleEndsAt, setFlashSaleEndsAt] = useState(null);
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState("");
  const [originalPrice, setOriginalPrice] = useState(null);

  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [buying, setBuying] = useState(false);
  const [pickupStation, setPickupStation] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [savedAddress, setSavedAddress] = useState(null);
  const addressInputRef = useRef(null);

  const placesLibRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const autocompleteRequestIdRef = useRef(0);
  const debounceRef = useRef(null);

  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [paymentCheckoutId, setPaymentCheckoutId] = useState(null);

  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  // Sticky mobile bar visibility
  const [showStickyBar, setShowStickyBar] = useState(false);
  const paymentSectionRef = useRef(null);

  const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";
  const ADMIN_EMAIL = "omniflow718@gmail.com";

  useEffect(() => {
    if (!user?.id) return;
    const fetchWallet = async () => {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
      if (data) setWalletBalance(data.balance || 0);
    };
    fetchWallet();
  }, [user]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let cancelled = false;
    (async () => {
      try {
        const places = await importLibrary("places");
        if (cancelled) return;
        placesLibRef.current = places;
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      } catch (err) {
        console.error("[Checkout] Failed to load Google Places:", err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Observe payment section to toggle sticky bar on mobile
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 900) return;
    const el = paymentSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Show sticky bar only when payment section is ABOVE viewport (scrolled past)
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [products, loading]);

  const updateWalletBalance = async (userId, amount, operation) => {
    try {
      const { data: wallet, error: fetchError } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (fetchError) throw fetchError;
      let currentBalance = wallet ? wallet.balance || 0 : 0;
      const newBalance = operation === "subtract" ? currentBalance - amount : currentBalance + amount;
      if (operation === "subtract" && newBalance < 0) throw new Error("Insufficient balance");
      const { error: updateError } = await supabase.from("wallets").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (updateError) throw updateError;
      return newBalance;
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  };

  const productTotals = useMemo(() => {
    return products.map((product) => {
      let unitPrice;
      if (fromFlashSale && product.is_flash_sale) {
        unitPrice = Number(product.price || 0);
      } else {
        const rawPrice = Number(product.price || 0);
        const discount = Number(product.discount || 0);
        unitPrice = rawPrice * (1 - discount / 100);
      }
      const productPrice = +(unitPrice * product.quantity).toFixed(2);
      const depositProduct = +(productPrice * depositPercent).toFixed(2);
      return { ...product, unitPrice, productPrice, depositProduct, originalPrice: product.original_price || product.price };
    });
  }, [products, fromFlashSale]);

  const totalProductPrice = useMemo(() => productTotals.reduce((sum, item) => sum + item.productPrice, 0), [productTotals]);
  const totalDeposit = useMemo(() => productTotals.reduce((sum, item) => sum + item.depositProduct, 0), [productTotals]);

  const calculateDeliveryFeeFromStore = useCallback((distance, storeSettings) => {
    if (!distance || distance <= 0 || !storeSettings) return 0;
    if (storeSettings.delivery_type === "self-delivery") {
      const baseFee = Number(storeSettings.delivery_base_fee) || 100;
      const ratePerKm = Number(storeSettings.delivery_rate_per_km) || 15;
      return Math.round(baseFee + distance * ratePerKm);
    }
    const DELIVERY_RATES = { BASE_FEE: 50, ZONES: [{ maxDistance: 10, ratePerKm: 15 }, { maxDistance: 50, ratePerKm: 10 }, { maxDistance: Infinity, ratePerKm: 7 }] };
    let zoneRate = DELIVERY_RATES.ZONES[2].ratePerKm;
    if (distance <= DELIVERY_RATES.ZONES[0].maxDistance) zoneRate = DELIVERY_RATES.ZONES[0].ratePerKm;
    else if (distance <= DELIVERY_RATES.ZONES[1].maxDistance) zoneRate = DELIVERY_RATES.ZONES[1].ratePerKm;
    return Math.round(DELIVERY_RATES.BASE_FEE + distance * zoneRate);
  }, []);

  const deliveryFee = useMemo(() => {
    if (!deliveryDistance || deliveryMethod !== "door") return 0;
    return calculateDeliveryFeeFromStore(deliveryDistance, storeDeliverySettings);
  }, [deliveryDistance, deliveryMethod, storeDeliverySettings, calculateDeliveryFeeFromStore]);

  const isFreeDelivery = useMemo(() => {
    if (storeDeliverySettings?.delivery_type === "self-delivery") return false;
    return totalProductPrice >= 5000;
  }, [totalProductPrice, storeDeliverySettings]);

  const finalDeliveryFee = useMemo(() => (isFreeDelivery ? 0 : deliveryFee), [isFreeDelivery, deliveryFee]);
  const depositTotal = useMemo(() => +(totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2), [totalDeposit, finalDeliveryFee, deliveryMethod]);
  const balanceDue = useMemo(() => +(totalProductPrice - totalDeposit).toFixed(2), [totalProductPrice, totalDeposit]);
  const totalOrder = useMemo(() => +(totalProductPrice + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2), [totalProductPrice, finalDeliveryFee, deliveryMethod]);

  const insufficientAmount = useMemo(() => {
    if (walletBalance >= depositTotal) return 0;
    return +(depositTotal - walletBalance).toFixed(2);
  }, [walletBalance, depositTotal]);

  useEffect(() => {
    if (!isFlashSale || !flashSaleEndsAt) return;
    const updateFlashTimer = () => {
      const diff = new Date(flashSaleEndsAt) - new Date();
      if (diff <= 0) return setFlashSaleTimeLeft("Expired");
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setFlashSaleTimeLeft(hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`);
    };
    updateFlashTimer();
    const timer = setInterval(updateFlashTimer, 1000);
    return () => clearInterval(timer);
  }, [isFlashSale, flashSaleEndsAt]);

  const calculateDistance = useCallback(async (fromCoords, destLatLng) => {
    if (!fromCoords || !destLatLng || !GOOGLE_MAPS_API_KEY) return null;
    setDeliveryCalculating(true);
    try {
      const routesLib = await importLibrary("routes");
      const { LatLng } = await importLibrary("core");
      const origin = new LatLng(fromCoords[1], fromCoords[0]);
      const destination = new LatLng(destLatLng.lat, destLatLng.lng);
      const response = await routesLib.RouteMatrix.computeRouteMatrix({
        origins: [origin], destinations: [destination], travelMode: "DRIVING", routingPreference: "TRAFFIC_UNAWARE", fields: ["distanceMeters", "condition"],
      });
      const item = response?.matrix?.rows?.[0]?.items?.[0];
      if (!item || item.condition !== "ROUTE_EXISTS") return null;
      const distanceKm = item.distanceMeters / 1000;
      setDeliveryBreakdown({ distance: distanceKm.toFixed(1) });
      return distanceKm;
    } catch (error) {
      console.error("[Checkout] Route Matrix error:", error);
      return null;
    } finally {
      setDeliveryCalculating(false);
    }
  }, []);

  useEffect(() => {
    async function updateDistance() {
      if (!selectedLocation || !seller?.location_coords || fromCart || deliveryMethod !== "door") return;
      const distance = await calculateDistance(seller.location_coords, selectedLocation);
      setDeliveryDistance(distance);
      if (distance && storeDeliverySettings?.delivery_coverage_radius && distance > storeDeliverySettings.delivery_coverage_radius) {
        if (canShowToast("distance-error")) toast.error(`Address beyond the seller's ${storeDeliverySettings.delivery_coverage_radius}km radius`);
        setDeliveryDistance(null);
      }
    }
    updateDistance();
  }, [selectedLocation, seller, deliveryMethod, storeDeliverySettings, fromCart, calculateDistance]);

  const fetchSuggestions = useCallback(async (input) => {
    if (!placesLibRef.current || !input || input.trim().length < 2) {
      setAddressSuggestions([]); setShowSuggestions(false); return;
    }
    setIsSearching(true);
    const requestId = ++autocompleteRequestIdRef.current;
    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLibRef.current;
      if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: input.trim(), sessionToken: sessionTokenRef.current, includedRegionCodes: ["ke"], language: "en" });
      if (requestId !== autocompleteRequestIdRef.current) return;
      const mapped = (suggestions || []).slice(0, 6).map((s) => {
        const p = s.placePrediction;
        return { placeId: p.placeId, mainText: p.mainText?.text || p.text?.text || "", secondaryText: p.secondaryText?.text || "", fullText: p.text?.text || "", raw: p };
      });
      setAddressSuggestions(mapped); setShowSuggestions(mapped.length > 0);
    } catch (err) {
      if (requestId === autocompleteRequestIdRef.current) { setAddressSuggestions([]); setShowSuggestions(false); }
    } finally {
      if (requestId === autocompleteRequestIdRef.current) setIsSearching(false);
    }
  }, []);

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    setSelectedLocation(null);
    setDeliveryDistance(null);
    setDeliveryBreakdown(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const handleAddressSelect = async (suggestion) => {
    try {
      setDeliveryAddress(suggestion.fullText || suggestion.mainText);
      setShowSuggestions(false); setAddressSuggestions([]);
      const place = suggestion.raw?.toPlace?.();
      if (!place) return;
      await place.fetchFields({ fields: ["formattedAddress", "location", "displayName"] });
      const loc = place.location;
      const finalAddress = place.formattedAddress || suggestion.fullText;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      setDeliveryAddress(finalAddress);
      setSelectedLocation({ lat, lng });
      try { localStorage.setItem(LAST_ADDRESS_KEY, JSON.stringify({ address: finalAddress, lat, lng, placeId: place.id || suggestion.placeId, savedAt: Date.now() })); } catch (_) {}
      if (placesLibRef.current) sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
    } catch (err) {
      if (canShowToast("place-error")) toast.error("Failed to load address details.");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ADDRESS_KEY);
      if (raw) { const parsed = JSON.parse(raw); if (parsed?.address && typeof parsed.lat === "number") setSavedAddress(parsed); }
    } catch (_) {}
  }, []);

  const applySavedAddress = () => {
    if (!savedAddress) return;
    setDeliveryAddress(savedAddress.address);
    setSelectedLocation({ lat: savedAddress.lat, lng: savedAddress.lng });
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (event) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => { document.removeEventListener("mousedown", handler); if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!user?.id) { navigate("/login"); return; }

        if (fromFlashSale && location.state?.product) {
          const flashProduct = location.state.product;
          const flashPrice = location.state.flashPrice;
          const originalPriceVal = location.state.originalPrice;
          const now = new Date();
          const flashEndsAt = new Date(flashProduct.flash_sale_ends_at);
          if (flashEndsAt <= now) { navigate("/flash-sales"); return; }
          setIsFlashSale(true); setFlashSaleEndsAt(flashProduct.flash_sale_ends_at); setOriginalPrice(originalPriceVal);
          setProducts([{ ...flashProduct, price: flashPrice, original_price: originalPriceVal, is_flash_sale: true, quantity: 1 }]);
          const { data: store } = await supabase.from("stores").select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county").eq("owner_id", flashProduct.owner_id).maybeSingle();
          if (store) { setSeller({ ...store, location_coords: store.location_lat && store.location_lng ? [store.location_lng, store.location_lat] : null }); setStoreDeliverySettings(store); }
          const { offersDoor, offersPickup } = getDeliveryOptions(flashProduct);
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          return;
        }

        if (fromCart && location.state?.cartItems) {
          setProducts(location.state.cartItems.map((item) => ({ ...item.products, cartItemId: item.id, quantity: item.quantity, variant: item.variant, delivery_methods: item.products.delivery_methods || { pickup: "Yes", door: "Yes" } })));
          if (location.state.seller) { setSeller(location.state.seller); const { data: storeSettings } = await supabase.from("stores").select("delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county").eq("owner_id", location.state.seller.owner_id).maybeSingle(); if (storeSettings) setStoreDeliverySettings(storeSettings); }
          const firstItem = location.state.cartItems[0]?.products;
          if (firstItem) { const { offersDoor, offersPickup } = getDeliveryOptions(firstItem); setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : ""); }
          return;
        }

        let p = location.state?.product || null;
        if (!p) {
          const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
          if (error) throw error;
          p = data;
        }
        if (!p.delivery_methods) p.delivery_methods = { pickup: "Yes", door: "Yes" };
        setProducts([{ ...p, quantity: 1 }]);
        const { data: store } = await supabase.from("stores").select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county").eq("owner_id", p.owner_id).maybeSingle();
        if (store) { setSeller({ ...store, location_coords: store.location_lat && store.location_lng ? [store.location_lng, store.location_lat] : null }); setStoreDeliverySettings(store); }
        const { offersDoor, offersPickup } = getDeliveryOptions(p);
        setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
      } catch (err) {
        if (canShowToast("load-error")) toast.error("Failed to load checkout");
        navigate("/cart");
      } finally { setLoading(false); }
    }
    load();
  }, [productId, location.state, user, fromCart, fromFlashSale, navigate]);

  const handleIncrement = useCallback((id) => setProducts((prev) => prev.map((p) => p.id === id ? { ...p, quantity: Math.min(p.quantity + 1, p.stock_quantity || 999) } : p)), []);
  const handleDecrement = useCallback((id) => setProducts((prev) => prev.map((p) => p.id === id ? { ...p, quantity: Math.max(p.quantity - 1, 1) } : p)), []);

  const createPendingOrder = async (method) => {
    const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;
    if (fromCart) {
      let createdIds = [];
      for (const product of productTotals) {
        const { data: commissionData } = await supabase.rpc("calculate_order_commission", { p_product_id: product.id, p_total_amount: product.productPrice });
        const commission = commissionData?.[0] || { commission_rate: 0.09, commission_amount: product.productPrice * 0.09 };
        const { data: orderData, error } = await supabase.from("orders").insert({
          product_id: product.id, buyer_id: user.id, seller_id: product.owner_id,
          variant: product.variant || null, quantity: product.quantity,
          total_price: product.productPrice, store_id: product.store_id || null,
          delivery_method: deliveryMethod, delivery_location: deliveryLocation,
          buyer_phone: contactPhone, payment_method: method,
          deposit_amount: product.depositProduct, deposit_paid: false,
          balance_due: product.productPrice - product.depositProduct,
          delivery_fee: deliveryMethod === "door" ? finalDeliveryFee / products.length : 0,
          delivery_distance: deliveryDistance, status: "pending",
          delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          commission_rate: commission.commission_rate, commission_amount: commission.commission_amount,
          metadata: { is_flash_sale: false, payment_type: `${method}_pending` }
        }).select().single();
        if (error) throw error;
        createdIds.push(orderData.id);
      }
      return createdIds[0];
    } else {
      const product = productTotals[0];
      const { data: commissionData } = await supabase.rpc("calculate_order_commission", { p_product_id: product.id, p_total_amount: totalOrder });
      const commission = commissionData?.[0] || { commission_rate: 0.09, commission_amount: totalOrder * 0.09 };
      const { data: orderData, error } = await supabase.from("orders").insert({
        product_id: product.id, buyer_id: user.id, seller_id: product.owner_id,
        variant: product.variant || null, quantity: product.quantity,
        total_price: totalOrder, store_id: product.store_id || null,
        delivery_method: deliveryMethod, delivery_location: deliveryLocation,
        buyer_phone: contactPhone, payment_method: method,
        deposit_amount: totalDeposit, deposit_paid: false,
        balance_due: balanceDue, delivery_fee: deliveryMethod === "door" ? finalDeliveryFee : 0,
        delivery_distance: deliveryDistance, status: "pending",
        delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
        commission_rate: commission.commission_rate, commission_amount: commission.commission_amount,
        metadata: { is_flash_sale: isFlashSale, flash_sale_ends_at: isFlashSale ? flashSaleEndsAt : null, original_price: isFlashSale ? originalPrice : null, payment_type: `${method}_pending` }
      }).select().single();
      if (error) throw error;
      return orderData.id;
    }
  };

  const handleMpesaPayment = async () => {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone number");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");
    if (!/^0[17]\d{8}$/.test(contactPhone)) return toast.error("Enter a valid M-Pesa phone number (e.g., 0712345678)");
    if (isFlashSale && flashSaleEndsAt && new Date(flashSaleEndsAt) <= new Date()) { navigate("/flash-sales"); return; }
    if (products.some((p) => p.stock_quantity < p.quantity)) return toast.error("Some items are out of stock");

    setBuying(true);
    setMpesaPaymentStep(2);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");

    try {
      const orderId = await createPendingOrder("mpesa");
      setPendingOrderId(orderId);
      toast.dismiss(loadingToast);

      const result = await initiateWalletDeposit(
        contactPhone,
        depositTotal,
        user.id,
        async (receipt, paidAmount) => {
          await supabase.from("orders").update({
            deposit_paid: true, status: "deposit_paid", mpesa_receipt: receipt,
            price_paid: paidAmount, updated_at: new Date().toISOString(),
            metadata: { payment_completed_at: new Date().toISOString(), mpesa_receipt: receipt, deposit_amount_paid: paidAmount },
          }).eq("id", orderId);

          await updateWalletBalance(ADMIN_ID, paidAmount, "add");
          await supabase.from("wallet_transactions").insert({
            user_id: ADMIN_ID, type: "escrow_receive", amount: paidAmount, status: "completed",
            order_id: orderId, description: `Escrow deposit for order ${orderId.slice(0, 8)} via M-Pesa`,
          });

          if (fromCart && products.length > 0) {
            for (const p of products) { if (p.cartItemId) await supabase.from("cart_items").delete().eq("id", p.cartItemId); }
          }

          setMpesaPaymentStep(3);
          if (canShowToast("mpesa-success", 60000)) toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 5000, icon: "✅" });
          setTimeout(() => navigate("/orders"), 3000);
        },
        async (error) => {
          await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
          setMpesaPaymentStep(1);
          setBuying(false);
          if (canShowToast("mpesa-fail", 4000)) toast.error(`Payment cancelled or failed. Your order was not completed.`);
        }
      );
      setPaymentCheckoutId(result?.checkoutRequestID);
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("mpesa-error", 4000)) toast.error("Failed to initiate M-Pesa: " + (err.message || "Please try again"));
      setMpesaPaymentStep(1);
      setBuying(false);
    }
  };

  const handlePayWithWallet = async () => {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");
    if (walletBalance < depositTotal) return toast.error("Insufficient OmniPay balance. Please top up.");
    if (products.some((p) => p.stock_quantity < p.quantity)) return toast.error("Some items are out of stock");
    if (isFlashSale && flashSaleEndsAt && new Date(flashSaleEndsAt) <= new Date()) { navigate("/flash-sales"); return; }

    setBuying(true);
    const loadingToast = toast.loading("Processing OmniPay payment...");

    try {
      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;

      const processSingleOrder = async (product, amountToPay, commission, totalPrice) => {
        const { data: orderData, error } = await supabase.from("orders").insert({
          product_id: product.id, buyer_id: user.id, seller_id: product.owner_id,
          variant: product.variant || null, quantity: product.quantity,
          price_paid: 0, total_price: totalPrice, store_id: product.store_id || null,
          delivery_method: deliveryMethod, delivery_location: deliveryLocation,
          buyer_phone: contactPhone, payment_method: "wallet",
          deposit_amount: product.depositProduct, deposit_paid: true,
          balance_due: totalPrice - product.depositProduct,
          delivery_fee: deliveryMethod === "door" ? finalDeliveryFee / products.length : 0,
          delivery_distance: deliveryDistance, commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount, status: "deposit_paid",
          delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          delivered: false, escrow_released: false,
          metadata: { is_flash_sale: isFlashSale, store_delivery_type: storeDeliverySettings?.delivery_type, delivery_lat: selectedLocation?.lat ?? null, delivery_lng: selectedLocation?.lng ?? null }
        }).select().single();
        if (error) throw error;

        const { data: paymentResult, error: paymentError } = await supabase.rpc("pay_order_deposit", {
          p_order_id: orderData.id, p_buyer_id: user.id, p_amount: amountToPay,
        });
        if (paymentError) throw paymentError;
        if (!paymentResult?.success) throw new Error(paymentResult?.error || "Payment failed");

        if (product.cartItemId) await supabase.from("cart_items").delete().eq("id", product.cartItemId);
      };

      if (fromCart) {
        for (const product of productTotals) {
          const { data: commissionData } = await supabase.rpc("calculate_order_commission", { p_product_id: product.id, p_total_amount: product.productPrice });
          const commission = commissionData?.[0] || { commission_rate: 0.09, commission_amount: product.productPrice * 0.09 };
          const amountToPay = product.depositProduct + (deliveryMethod === "door" ? finalDeliveryFee / products.length : 0);
          await processSingleOrder(product, amountToPay, commission, product.productPrice);
        }
        toast.dismiss(loadingToast);
        if (canShowToast("wallet-success", 60000)) toast.success(`${products.length} orders created! 25% deposit held in escrow.`);
      } else {
        const product = productTotals[0];
        const { data: commissionData } = await supabase.rpc("calculate_order_commission", { p_product_id: product.id, p_total_amount: totalOrder });
        const commission = commissionData?.[0] || { commission_rate: 0.09, commission_amount: totalOrder * 0.09 };
        const amountToPay = totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0);
        await processSingleOrder(product, amountToPay, commission, totalOrder);
        toast.dismiss(loadingToast);
        if (canShowToast("wallet-success", 60000)) toast.success(<div><strong>{isFlashSale ? "Flash deal secured!" : "Order created!"}</strong><br /><small>25% deposit ({formatKSH(amountToPay)}) held in escrow.</small></div>);
      }
      navigate("/orders");
    } catch (err) {
      toast.dismiss(loadingToast);
      if (canShowToast("wallet-error", 4000)) toast.error("Payment error: " + (err.message || "Please try again"));
    } finally {
      setBuying(false);
    }
  };

  const handleStartInstallment = async () => {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");
    if (!hasInstallmentPlan) return toast.error("Installments not available");
    if (fromCart && products.length > 1) return toast.error("Installments only available for single products");
    if (isFlashSale) return toast.error("Installments not available for flash sales");

    const product = productTotals[0];
    if (product.stock_quantity != null && product.quantity > product.stock_quantity) return toast.error("Quantity exceeds available stock");

    setProcessingInstallment(true);
    const dismiss = toast.loading("Starting installment plan…");

    try {
      const { data, error } = await supabase.rpc("start_installment_order", {
        p_buyer: user.id, p_product: product.id, p_variant: product.variant || null,
        p_quantity: product.quantity, p_delivery_method: deliveryMethod,
        p_delivery_location: deliveryMethod === "door" ? deliveryAddress : pickupStation,
        p_contact_phone: contactPhone,
      });
      if (error) throw error;
      toast.dismiss(dismiss);
      if (canShowToast("installment-success", 60000)) toast.success("Installment plan started! Initial payment secured in escrow");
      navigate("/orders", { state: { highlight: typeof data === "string" ? data : data?.id } });
    } catch (err) {
      toast.dismiss(dismiss);
      if (canShowToast("installment-error", 4000)) toast.error(err?.message || "Failed to start installment plan");
    } finally {
      setProcessingInstallment(false);
    }
  };

  const hasInstallmentPlan = useMemo(() => {
    if (fromCart && products.length > 1) return false;
    if (isFlashSale) return false;
    return products[0]?.installment_plan;
  }, [products, fromCart, isFlashSale]);

  const currentDeliveryOptions = useMemo(() => {
    if (products.length === 0) return { offersPickup: false, offersDoor: false };
    return getDeliveryOptions(products[0]);
  }, [products]);

  const FlashSaleBanner = () => {
    if (!isFlashSale) return null;
    return (
      <div className={styles.flashSaleBanner}>
        <div className={styles.flashSaleContent}>
          <FaBolt className={styles.flashSaleIcon} />
          <div className={styles.flashSaleText}><strong>FLASH SALE ACTIVE</strong><span>Special price expires in: {flashSaleTimeLeft}</span></div>
        </div>
        <div className={styles.flashSaleNote}>Complete checkout before time runs out to lock in this exclusive price</div>
      </div>
    );
  };

  if (loading) return <CheckoutSkeleton />;
  if (!products.length) return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🛒</div>
        <h3>No products found</h3><p>Your cart is empty or the product doesn't exist</p>
        <button onClick={() => navigate("/")} className={styles.emptyBtn}>Continue Shopping</button>
      </div>
    </div>
  );

  const etaInfo = getDeliveryETA(deliveryDistance, products[0]?.delivery_estimated_days);
  const canPayWithWallet = walletBalance >= depositTotal;
  const walletDisabledReason = !deliveryMethod
    ? "Choose delivery method"
    : deliveryMethod === "door" && !deliveryAddress
    ? "Enter delivery address"
    : deliveryMethod === "pickup" && !pickupStation
    ? "Enter pickup station"
    : !canPayWithWallet
    ? "Insufficient balance"
    : null;

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}><FaArrowLeft /></button>
        <h1>{fromCart ? <><FaStore /> Checkout</> : <><FaBox /> Checkout {isFlashSale && "(Flash Sale)"}</>}</h1>
      </header>

      <AnimatePresence>
        {mpesaPaymentStep === 2 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.paymentLoader}>
                <div className={styles.spinner}></div>
                <p>Waiting for M-Pesa payment...</p>
                <p className={styles.paymentInstruction}>Please check your phone ({contactPhone}) and enter your M-Pesa PIN to complete the payment of {formatKSH(depositTotal)}</p>
                {paymentCheckoutId && <p className={styles.referenceText}>Reference: {paymentCheckoutId.slice(-8)}</p>}
                <button onClick={() => { cancelPolling(); setMpesaPaymentStep(1); setBuying(false); }} className={styles.cancelBtn}>Cancel Payment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {mpesaPaymentStep === 3 && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.successContent} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={styles.successIcon}></div>
              <h3>Payment Successful!</h3><p>Your deposit has been received.</p><p>Redirecting to orders...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FlashSaleBanner />

      <div className={styles.checkoutGrid}>
        <div className={styles.leftColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>{fromCart ? `Ordering from ${seller?.name}` : "Product Details"}</h3>
              {isFlashSale && <span className={styles.flashBadge}><FaBolt /> FLASH SALE</span>}
            </div>

            {productTotals.map((product, index) => (
              <div key={product.id || index} className={styles.checkoutProduct}>
                <div className={styles.productImageWrap}>
                  <img src={product.image_gallery?.[0] || product.image_url || "/placeholder.jpg"} alt={product.name} className={styles.productImage} />
                </div>
                <div className={styles.productBody}>
                  <h4>{product.name}</h4>
                  {product.variant && <div className={styles.variantDisplay}>Variant: {typeof product.variant === "string" ? product.variant : JSON.stringify(product.variant)}</div>}
                  {!fromCart && (
                    <div className={styles.productQuantityRow}>
                      <span className={styles.quantityLabel}>Quantity</span>
                      <div className={styles.quantityControls}>
                        <button className={styles.quantityBtn} onClick={() => handleDecrement(product.id)} disabled={product.quantity <= 1}><FaMinus /></button>
                        <span className={styles.quantityDisplay}>{product.quantity}</span>
                        <button className={styles.quantityBtn} onClick={() => handleIncrement(product.id)} disabled={product.quantity >= (product.stock_quantity || 999)}><FaPlus /></button>
                      </div>
                      <span className={styles.stockDisplay}>{product.stock_quantity > 0 ? <span className={styles.inStockSmall}>{product.stock_quantity} available</span> : <span className={styles.outOfStockSmall}>Out of stock</span>}</span>
                    </div>
                  )}
                  {isFlashSale && (
                    <div className={styles.flashPriceDisplay}>
                      <div className={styles.originalPriceLine}><span className={styles.originalPriceLabel}>Original:</span><span className={styles.originalPriceValue}>{formatKSH(product.originalPrice)}</span></div>
                      <div className={styles.flashPriceLine}><span className={styles.flashPriceLabel}>Flash Sale:</span><span className={styles.flashPriceValue}>{formatKSH(product.unitPrice)} × {product.quantity}</span></div>
                    </div>
                  )}
                  {!isFlashSale && <div className={styles.productPricing}><span>{formatKSH(product.unitPrice)} × {product.quantity}</span><strong>{formatKSH(product.productPrice)}</strong></div>}
                </div>
              </div>
            ))}
          </section>

          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <section className={styles.section}>
              <div className={styles.sectionHeader} onClick={() => setShowInstallmentInfo(!showInstallmentInfo)} style={{ cursor: "pointer" }}>
                <h3>Special Offer: Buy in Installments</h3>
                {showInstallmentInfo ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              <AnimatePresence>
                {showInstallmentInfo && (
                  <motion.div className={styles.installmentDetails} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <p>Pay <strong>{(products[0]?.installment_plan?.initial_percent || 0.3) * 100}%</strong> now and the remainder after delivery.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeader}><h3>Delivery & Options</h3></div>
            <div className={styles.deliveryMethods}>
              {currentDeliveryOptions.offersPickup && (
                <label className={styles.radioLabel}><input type="radio" name="dm" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => { setDeliveryMethod("pickup"); setPickupStation(""); }} /><span> Pickup Station</span></label>
              )}
              {currentDeliveryOptions.offersDoor && (
                <label className={styles.radioLabel}><input type="radio" name="dm" value="door" checked={deliveryMethod === "door"} onChange={() => setDeliveryMethod("door")} /><span> Door Delivery</span></label>
              )}
              {!currentDeliveryOptions.offersPickup && !currentDeliveryOptions.offersDoor && (
                <div className={styles.noDeliveryOptions}><FaInfoCircle /><div><strong>No delivery options available</strong><p>Please contact the seller to arrange delivery or pickup.</p></div></div>
              )}
            </div>

            {deliveryMethod === "door" && currentDeliveryOptions.offersDoor && (
              <>
                <div className={styles.formGroup}>
                  <label>Delivery Address:</label>
                  <div ref={addressInputRef} className={styles.addressAutocomplete}>
                    <div className={styles.addressInputWrap}>
                      <FaMapMarkerAlt className={styles.addressIcon} />
                      <input type="text" placeholder="Search for area, street, landmark..." value={deliveryAddress} onChange={handleAddressChange} onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }} className={styles.addressInput} autoComplete="off" />
                      {isSearching && <FaSpinner className={`${styles.spinning} ${styles.inputSpinner}`} />}
                    </div>
                    {savedAddress && !deliveryAddress && !showSuggestions && savedAddress.address && (
                      <button type="button" className={styles.savedAddressBtn} onClick={applySavedAddress}><FaHistory /><span className={styles.savedAddressText}><strong>Use last address:</strong> {savedAddress.address}</span></button>
                    )}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className={styles.addressSuggestions}>
                        {addressSuggestions.map((s, i) => (
                          <div key={s.placeId || i} className={styles.suggestionItem} onClick={() => handleAddressSelect(s)}>
                            <FaMapMarkerAlt className={styles.suggestionIcon} />
                            <div className={styles.suggestionContent}><div className={styles.suggestionText}>{s.mainText}</div>{s.secondaryText && <div className={styles.suggestionType}>{s.secondaryText}</div>}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {storeDeliverySettings && (
                  <div className={`${styles.deliveryTypeIndicator} ${storeDeliverySettings.delivery_type === "self-delivery" ? styles.selfDelivery : styles.omniflowDelivery}`}>
                    {storeDeliverySettings.delivery_type === "self-delivery" ? (
                      <>
                        <FaTruck />
                        <span>
                          <strong>Self Delivery</strong> - This seller handles their own delivery
                          {storeDeliverySettings.delivery_base_fee && (
                            <span className={styles.deliveryRateDetail}>Base fee: {formatKSH(storeDeliverySettings.delivery_base_fee)} + {storeDeliverySettings.delivery_rate_per_km} KSh/km</span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaMotorcycle />
                        <span>
                          <strong>Omniflow Delivery</strong> - Managed by OmniFlow
                          <span className={styles.deliveryRateDetail}>Zone-based rates: 50 KSh base + up to 15 KSh/km</span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className={styles.deliveryFeeDisplay}>
                  <div className={styles.feeRow}>
                    <span>Delivery fee:</span>
                    {deliveryCalculating ? <span className={styles.calculating}>Calculating...</span> : deliveryDistance ? <span className={isFreeDelivery ? styles.freeDelivery : styles.feeAmount}>{isFreeDelivery ? "FREE" : formatKSH(finalDeliveryFee)}</span> : deliveryAddress ? <span className={styles.cannotCalculate}>Could not calculate</span> : <span className={styles.enterAddress}>Enter address to see fee</span>}
                  </div>

                  {deliveryBreakdown && !isFreeDelivery && (
                    <div className={styles.feeBreakdown}>
                      {deliveryBreakdown.type === "self-delivery" ? (
                        <>
                          <div>Base fee: {formatKSH(deliveryBreakdown.baseFee)}</div>
                          <div>Distance rate: {deliveryBreakdown.ratePerKm} KSh/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>Total: {formatKSH(deliveryBreakdown.total)}</div>
                        </>
                      ) : (
                        <>
                          <div>Zone {deliveryBreakdown.zone?.replace("zone", "")}: {deliveryBreakdown.rate} KSh/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>Total: {formatKSH(deliveryBreakdown.total)}</div>
                        </>
                      )}
                    </div>
                  )}

                  {deliveryDistance && !deliveryCalculating && (
                    <div className={styles.etaRow}>
                      <FaTruck /> {etaInfo.label} · {deliveryDistance.toFixed(1)}km away
                    </div>
                  )}

                  {storeDeliverySettings?.delivery_coverage_radius && (
                    <div className={styles.coverageNote}>Max delivery radius: {storeDeliverySettings.delivery_coverage_radius} km</div>
                  )}
                </div>
              </>
            )}

            {deliveryMethod === "pickup" && currentDeliveryOptions.offersPickup && (
              <div className={styles.formGroup}><label>Pickup Station Address:</label><input type="text" placeholder="Enter pickup station address" value={pickupStation} onChange={(e) => setPickupStation(e.target.value)} /><small>Enter the exact location where you'll pick up your order</small></div>
            )}

            <div className={styles.formGroup}>
              <label>Contact / M-Pesa Phone:</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712345678" />
              <small>This number will receive the M-Pesa prompt and delivery updates</small>
            </div>
          </section>

          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <button onClick={handleStartInstallment} disabled={processingInstallment || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation) || !deliveryMethod} className={styles.installmentBtn}>
              {processingInstallment ? <FaSpinner className={styles.spinning} /> : <FaPercent />} Start Installment Plan (Pay Initial)
            </button>
          )}
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><h3>Order Summary</h3></div>
            {fromCart && seller && <div className={styles.storeInfo}><FaStore /><span>{seller.name}</span></div>}
            {isFlashSale && <div className={styles.flashSummaryAlert}><FaBolt /> Flash Sale Active<div className={styles.flashTimerSmall}><FaClock /> {flashSaleTimeLeft}</div></div>}

            <div className={styles.productsList}>
              {productTotals.map((product, index) => (
                <div key={index} className={styles.summaryProduct}>
                  <img src={product.image_gallery?.[0] || "/placeholder.jpg"} alt="thumb" className={styles.summaryImage} />
                  <div className={styles.summaryProductInfo}><div className={styles.summaryProductName}>{product.name}</div><div>Qty: {product.quantity}</div><div className={styles.summaryProductPrice}>{formatKSH(product.productPrice)}</div></div>
                </div>
              ))}
            </div>

            <div className={styles.priceBreakdown}>
              {isFlashSale && productTotals[0]?.originalPrice && <div className={styles.flashSaleSavings}><span>Flash Sale Savings:</span><strong style={{ color: "#10B981" }}>-{formatKSH((productTotals[0].originalPrice - productTotals[0].unitPrice) * productTotals[0].quantity)}</strong></div>}
              <div className={styles.priceRow}><span>Products total:</span><strong>{formatKSH(totalProductPrice)}</strong></div>
              {deliveryMethod === "door" && <div className={styles.priceRow}><span>Delivery fee:</span><strong>{isFreeDelivery ? "FREE" : formatKSH(finalDeliveryFee)}</strong></div>}
              <div className={styles.divider} />
              <div className={styles.depositRow}><span>Deposit (25%):</span><strong>{formatKSH(totalDeposit)}</strong></div>
              <div className={styles.totalRow}><span>Pay now:</span><strong className={styles.totalAmount}>{formatKSH(depositTotal)}</strong></div>
              <div className={styles.balanceRow}><span>Balance due after delivery:</span><strong>{formatKSH(balanceDue)}</strong></div>
            </div>

            <div ref={paymentSectionRef} className={styles.paymentMethods}>
              <div className={styles.omnipayChip}>
                <FaWallet /> OmniPay Balance: {formatKSH(walletBalance)}
              </div>

              <button className={styles.walletBtn} onClick={handlePayWithWallet} disabled={buying || mpesaLoading || !!walletDisabledReason}>
                <FaWallet /> Pay with OmniPay
              </button>

              {insufficientAmount > 0 && (
                <div className={styles.insufficientHint}>
                  <FaExclamationTriangle />
                  <span>
                    Short by {formatKSH(insufficientAmount)} —{" "}
                    <a href="/wallet" onClick={(e) => { e.preventDefault(); navigate("/wallet"); }}>
                      Top up
                    </a>
                  </span>
                </div>
              )}

              <button className={styles.mpesaBtn} onClick={handleMpesaPayment} disabled={buying || mpesaLoading || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation) || !deliveryMethod}>
                <FaMobileAlt /> {mpesaLoading ? "Processing..." : "Pay via M-Pesa"}
              </button>

              <div className={styles.trustBadges}>
                <span><FaLock /> Secure Checkout</span>
                <span className={styles.trustSeparator}>·</span>
                <span><FaShieldAlt /> Buyer Protection</span>
                <span className={styles.trustSeparator}>·</span>
                <span><FaUndo /> 7-Day Returns</span>
              </div>
            </div>

            <div className={styles.infoNote}>
              <FaInfoCircle />
              <span><strong>How it works:</strong> Pay 25% deposit now (held in escrow). After delivery is confirmed, pay the remaining 75% to complete the order.</span>
            </div>

            {storeDeliverySettings?.delivery_type === "self-delivery" && <div className={styles.deliveryNote}><FaTruck /><span>This seller handles their own delivery. Delivery fee calculated based on their rates.</span></div>}
          </section>
        </div>
      </div>

      {/* Sticky Mobile Pay Bar */}
      <div className={`${styles.stickyPayBar} ${showStickyBar ? styles.visible : ""}`}>
        <div className={styles.stickyPayAmount}>
          <span className={styles.stickyPayLabel}>Pay now</span>
          <span className={styles.stickyPayValue}>{formatKSH(depositTotal)}</span>
        </div>
        <button className={styles.stickyPayBtn} onClick={handlePayWithWallet} disabled={buying || mpesaLoading || !!walletDisabledReason}>
          <FaWallet /> Pay with OmniPay
        </button>
      </div>
    </div>
  );
}