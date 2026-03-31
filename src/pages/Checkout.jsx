// src/pages/Checkout.jsx - UPDATED PREMIUM VERSION
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { toast } from "react-hot-toast";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import {
  FaWallet,
  FaMobileAlt,
  FaPaypal,
  FaChevronDown,
  FaChevronUp,
  FaStore,
  FaBox,
  FaBolt,
  FaClock,
  FaTruck,
  FaMotorcycle,
  FaMapMarkerAlt,
  FaBuilding,
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaShieldAlt,
  FaPercent,
  FaInfoCircle,
  FaTimes
} from "react-icons/fa";
import styles from "./Checkout.module.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Helper function for Kenyan price formatting
const formatKSH = (amount) => {
  const num = Number(amount || 0);
  if (Number.isInteger(num) || num % 1 === 0) {
    return `KSh ${num.toLocaleString('en-KE')}`;
  }
  return `KSh ${num.toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Skeleton Loader Component
const CheckoutSkeleton = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
      </div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLeft}>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
          <div className={styles.skeletonCard}></div>
        </div>
        <div className={styles.skeletonRight}>
          <div className={styles.skeletonCard}></div>
        </div>
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

  // M-Pesa payment hook
  const { initiateWalletDeposit, loading: mpesaLoading, pollingActive, currentCheckoutId, cancelPolling } = useMpesaPayment();

  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [storeDeliverySettings, setStoreDeliverySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null);

  // Flash sale states
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashSaleEndsAt, setFlashSaleEndsAt] = useState(null);
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState("");
  const [originalPrice, setOriginalPrice] = useState(null);

  // checkout fields
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState("standard");
  const [fragile, setFragile] = useState(false);
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [pickupStation, setPickupStation] = useState("");

  // Mapbox address state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const addressInputRef = useRef(null);

  // Payment state for M-Pesa
  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [paymentCheckoutId, setPaymentCheckoutId] = useState(null);

  // installments UI
  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  // Check if coming from cart or flash sale
  const fromCart = location.state?.fromCart;
  const fromFlashSale = location.state?.fromFlashSale;

  // Admin constants
  const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";
  const ADMIN_EMAIL = "omniflow718@gmail.com";

  // Helper function to update wallet balance
  const updateWalletBalance = async (userId, amount, operation) => {
    try {
      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentBalance = 0;
      if (wallet) {
        currentBalance = wallet.balance || 0;
      }

      const newBalance = operation === 'subtract' 
        ? currentBalance - amount 
        : currentBalance + amount;

      if (operation === 'subtract' && newBalance < 0) {
        throw new Error("Insufficient balance");
      }

      const { error: updateError } = await supabase
        .from("wallets")
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      return newBalance;
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  };

  // Calculate product totals
  const productTotals = useMemo(() => {
    return products.map(product => {
      let unitPrice;
      
      if (product.is_flash_sale) {
        unitPrice = Number(product.price || 0);
      } else {
        const rawPrice = Number(product.price || 0);
        const discount = Number(product.discount || 0);
        unitPrice = rawPrice * (1 - discount / 100);
      }
      
      const productPrice = +(unitPrice * product.quantity).toFixed(2);
      const depositProduct = +(productPrice * depositPercent).toFixed(2);
      
      return {
        ...product,
        unitPrice,
        productPrice,
        depositProduct,
        originalPrice: product.original_price || product.price,
      };
    });
  }, [products]);

  const totalProductPrice = useMemo(() => 
    productTotals.reduce((sum, item) => sum + item.productPrice, 0), 
    [productTotals]
  );

  const totalDeposit = useMemo(() => 
    productTotals.reduce((sum, item) => sum + item.depositProduct, 0), 
    [productTotals]
  );

  // Calculate delivery fee based on store's delivery settings
  const calculateDeliveryFeeFromStore = useCallback((distance, storeSettings) => {
    if (!distance || distance <= 0) return 0;
    if (!storeSettings) return 0;
    
    if (storeSettings.delivery_type === 'self-delivery') {
      const baseFee = Number(storeSettings.delivery_base_fee) || 100;
      const ratePerKm = Number(storeSettings.delivery_rate_per_km) || 15;
      return Math.round(baseFee + (distance * ratePerKm));
    }
    
    const DELIVERY_RATES = {
      BASE_FEE: 50,
      ZONES: [
        { maxDistance: 10, ratePerKm: 15 },
        { maxDistance: 50, ratePerKm: 10 },
        { maxDistance: Infinity, ratePerKm: 7 }
      ]
    };
    
    let zoneRate = DELIVERY_RATES.ZONES[2].ratePerKm;
    if (distance <= DELIVERY_RATES.ZONES[0].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[0].ratePerKm;
    } else if (distance <= DELIVERY_RATES.ZONES[1].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[1].ratePerKm;
    }
    
    return Math.round(DELIVERY_RATES.BASE_FEE + (distance * zoneRate));
  }, []);

  const deliveryFee = useMemo(() => {
    if (!deliveryDistance || deliveryMethod !== "door") return 0;
    return calculateDeliveryFeeFromStore(deliveryDistance, storeDeliverySettings);
  }, [deliveryDistance, deliveryMethod, storeDeliverySettings, calculateDeliveryFeeFromStore]);

  const FREE_DELIVERY_THRESHOLD = 5000;
  const isFreeDelivery = useMemo(() => {
    if (storeDeliverySettings?.delivery_type === 'self-delivery') return false;
    return totalProductPrice >= FREE_DELIVERY_THRESHOLD;
  }, [totalProductPrice, storeDeliverySettings]);

  const finalDeliveryFee = useMemo(() => isFreeDelivery ? 0 : deliveryFee, [isFreeDelivery, deliveryFee]);
  const depositTotal = useMemo(() => +(totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2), [totalDeposit, finalDeliveryFee, deliveryMethod]);
  const balanceDue = useMemo(() => +(totalProductPrice - totalDeposit).toFixed(2), [totalProductPrice, totalDeposit]);
  const totalOrder = useMemo(() => +(totalProductPrice + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2), [totalProductPrice, finalDeliveryFee, deliveryMethod]);

  // Flash sale timer effect
  useEffect(() => {
    if (!isFlashSale || !flashSaleEndsAt) return;

    const updateFlashTimer = () => {
      const diff = new Date(flashSaleEndsAt) - new Date();
      if (diff <= 0) {
        setFlashSaleTimeLeft("Expired");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setFlashSaleTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setFlashSaleTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateFlashTimer();
    const timer = setInterval(updateFlashTimer, 1000);
    return () => clearInterval(timer);
  }, [isFlashSale, flashSaleEndsAt]);

  // Calculate distance using Mapbox
  const calculateDistance = useCallback(async (fromCoords, toAddress) => {
    if (!fromCoords || !toAddress) return null;
    
    setDeliveryCalculating(true);
    try {
      const geocodeResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(toAddress)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&country=ke&limit=1`
      );
      
      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.features?.length) return null;
      
      const destCoords = geocodeData.features[0].center;
      
      const routeResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${fromCoords[0]},${fromCoords[1]};${destCoords[0]},${destCoords[1]}` +
        `?access_token=${MAPBOX_TOKEN}` +
        `&overview=false&geometries=geojson`
      );
      
      const routeData = await routeResponse.json();
      if (!routeData.routes?.length) return null;
      
      const distanceKm = routeData.routes[0].distance / 1000;
      
      if (storeDeliverySettings?.delivery_type === 'self-delivery') {
        const baseFee = Number(storeDeliverySettings.delivery_base_fee) || 100;
        const ratePerKm = Number(storeDeliverySettings.delivery_rate_per_km) || 15;
        setDeliveryBreakdown({
          distance: distanceKm.toFixed(1),
          type: 'self-delivery',
          baseFee: baseFee,
          ratePerKm: ratePerKm,
          total: Math.round(baseFee + (distanceKm * ratePerKm))
        });
      } else {
        const DELIVERY_RATES = { BASE_FEE: 50, ZONES: [{ maxDistance: 10, ratePerKm: 15 }, { maxDistance: 50, ratePerKm: 10 }, { maxDistance: Infinity, ratePerKm: 7 }] };
        let rate = DELIVERY_RATES.ZONES[2].ratePerKm;
        let zone = 'zone3';
        if (distanceKm <= DELIVERY_RATES.ZONES[0].maxDistance) {
          rate = DELIVERY_RATES.ZONES[0].ratePerKm;
          zone = 'zone1';
        } else if (distanceKm <= DELIVERY_RATES.ZONES[1].maxDistance) {
          rate = DELIVERY_RATES.ZONES[1].ratePerKm;
          zone = 'zone2';
        }
        setDeliveryBreakdown({
          distance: distanceKm.toFixed(1),
          type: 'omniflow-managed',
          zone: zone,
          rate: rate,
          baseFee: DELIVERY_RATES.BASE_FEE,
          total: Math.round(DELIVERY_RATES.BASE_FEE + (distanceKm * rate))
        });
      }
      
      return distanceKm;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return null;
    } finally {
      setDeliveryCalculating(false);
    }
  }, [storeDeliverySettings]);

  // Calculate distance when address is selected
  useEffect(() => {
    async function updateDistance() {
      if (!deliveryAddress || !seller?.location_coords || fromCart || deliveryMethod !== "door") return;
      
      const distance = await calculateDistance(seller.location_coords, deliveryAddress);
      setDeliveryDistance(distance);
      
      if (distance) {
        const maxRadius = storeDeliverySettings?.delivery_coverage_radius || 100;
        if (distance > maxRadius) {
          toast.error(`Delivery address is beyond the seller's ${maxRadius}km service radius`);
          setDeliveryDistance(null);
        }
      }
    }
    
    updateDistance();
  }, [deliveryAddress, seller, deliveryMethod, storeDeliverySettings, calculateDistance, fromCart]);

  // Mapbox address search
  const searchAddresses = async (query) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&country=ke` +
        `&types=address,place,neighborhood,locality,poi` +
        `&bbox=33.83,-4.73,41.91,5.06` +
        `&limit=8` +
        `&language=en` +
        `&autocomplete=true` +
        `&proximity=36.8219,-1.2921`
      );

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const kenyanResults = data.features.filter(feature => {
          const context = feature.context || [];
          const hasKenya = context.some(ctx => 
            ctx.id?.includes('country') && ctx.text === 'Kenya'
          );
          return hasKenya || feature.place_name.includes('Kenya');
        });
        
        setAddressSuggestions(kenyanResults.slice(0, 6));
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressSelect = (suggestion) => {
    setDeliveryAddress(suggestion.place_name);
    setSelectedLocation(suggestion.center);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    setSelectedLocation(null);
    setDeliveryDistance(null);
    setDeliveryBreakdown(null);
    
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(window.searchTimeout);
    };
  }, []);

  // Load checkout data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!user?.id) {
          toast.error("Please login to proceed to checkout");
          navigate("/login");
          return;
        }

        // Flash Sale Flow
        if (fromFlashSale && location.state?.product) {
          const flashProduct = location.state.product;
          const flashPrice = location.state.flashPrice;
          const originalPriceVal = location.state.originalPrice;
          
          const now = new Date();
          const flashEndsAt = new Date(flashProduct.flash_sale_ends_at);
          if (flashEndsAt <= now) {
            toast.error("This flash sale has expired");
            navigate("/flash-sales");
            return;
          }

          setIsFlashSale(true);
          setFlashSaleEndsAt(flashProduct.flash_sale_ends_at);
          setOriginalPrice(originalPriceVal);

          const productWithFlashPrice = {
            ...flashProduct,
            price: flashPrice,
            original_price: originalPriceVal,
            discount: flashProduct.discount || 0,
            is_flash_sale: true,
            quantity: 1
          };

          setProducts([productWithFlashPrice]);

          const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
            .eq("owner_id", flashProduct.owner_id)
            .maybeSingle();

          if (store) {
            setSeller({
              ...store,
              location_coords: store.location_lat && store.location_lng ? 
                [store.location_lng, store.location_lat] : null
            });
            setStoreDeliverySettings({
              delivery_type: store.delivery_type,
              has_delivery_fleet: store.has_delivery_fleet,
              delivery_fleet_size: store.delivery_fleet_size,
              delivery_coverage_radius: store.delivery_coverage_radius,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              county: store.county
            });
          }

          const dm = flashProduct.delivery_methods || {};
          const offersPickup = dm?.pickup === "Yes" || dm?.pickup === true;
          const offersDoor = dm?.door === "Yes" || dm?.door === true;
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");

          setLoading(false);
          return;
        }

        // Cart Flow
        if (fromCart && location.state?.cartItems) {
          const cartItems = location.state.cartItems;
          setProducts(cartItems.map(item => ({
            ...item.products,
            cartItemId: item.id,
            quantity: item.quantity,
            variant: item.variant
          })));

          if (location.state.seller) {
            setSeller(location.state.seller);
            
            const { data: storeSettings } = await supabase
              .from("stores")
              .select("delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
              .eq("owner_id", location.state.seller.owner_id)
              .maybeSingle();
              
            if (storeSettings) {
              setStoreDeliverySettings(storeSettings);
            }
          }

          const firstItem = cartItems[0];
          if (firstItem) {
            const dm = firstItem.products.delivery_methods || {};
            const offersPickup = dm?.pickup === "Yes" || dm?.pickup === true;
            const offersDoor = dm?.door === "Yes" || dm?.door === true;
            setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          }
        } else {
          // Single Product Flow
          let p = location.state?.product || null;

          if (!p) {
            const { data, error } = await supabase
              .from("products")
              .select(`*, delivery_methods, image_gallery, discount, installment_plan, variants, variant_options, price, description, store_id, metadata`)
              .eq("id", productId)
              .single();
            if (error) throw error;
            p = data;
          }

          setProducts([{ ...p, quantity: 1 }]);

          const { data: store } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
            .eq("owner_id", p.owner_id)
            .maybeSingle();
          
          if (store) {
            setSeller({
              ...store,
              location_coords: store.location_lat && store.location_lng ? 
                [store.location_lng, store.location_lat] : null
            });
            setStoreDeliverySettings({
              delivery_type: store.delivery_type,
              has_delivery_fleet: store.has_delivery_fleet,
              delivery_fleet_size: store.delivery_fleet_size,
              delivery_coverage_radius: store.delivery_coverage_radius,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              county: store.county
            });
          }

          const dm = p.delivery_methods || {};
          const offersPickup = dm?.pickup === "Yes" || dm?.pickup === true;
          const offersDoor = dm?.door === "Yes" || dm?.door === true;
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
        }
      } catch (err) {
        console.error("Checkout load error:", err);
        toast.error("Failed to load checkout");
        navigate(isFlashSale ? "/flash-sales" : "/cart");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, location.state, user, fromCart, fromFlashSale, navigate, isFlashSale]);

  // M-PESA PAYMENT FUNCTION
  const handleMpesaPayment = async () => {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone number");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");

    const phoneRegex = /^0[17]\d{8}$/;
    if (!phoneRegex.test(contactPhone)) {
      toast.error("Please enter a valid M-Pesa phone number (e.g., 0712345678)");
      return;
    }

    if (isFlashSale && flashSaleEndsAt) {
      const now = new Date();
      const flashEndsAt = new Date(flashSaleEndsAt);
      if (flashEndsAt <= now) {
        toast.error("This flash sale has expired");
        setIsFlashSale(false);
        navigate("/flash-sales");
        return;
      }
    }

    const outOfStock = products.some(product => product.stock_quantity < product.quantity);
    if (outOfStock) return toast.error("Some items are out of stock");

    setBuying(true);
    setMpesaPaymentStep(2);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");

    try {
      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;
      const totalDepositAmount = depositTotal;
      
      let orderId = null;
      
      if (fromCart) {
        const createdOrders = [];
        
        for (const product of productTotals) {
          const { data: commissionData } = await supabase
            .rpc('calculate_order_commission', {
              p_product_id: product.id,
              p_total_amount: product.productPrice
            });

          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID
          };

          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
              product_id: product.id,
              buyer_id: user.id,
              seller_id: product.owner_id,
              variant: product.variant || null,
              quantity: product.quantity,
              total_price: product.productPrice,
              store_id: product.store_id || null,
              delivery_method: deliveryMethod,
              delivery_location: deliveryLocation,
              buyer_phone: contactPhone,
              payment_method: "mpesa",
              deposit_amount: product.depositProduct,
              deposit_paid: false,
              balance_due: product.productPrice - product.depositProduct,
              delivery_fee: deliveryMethod === "door" ? (finalDeliveryFee / products.length) : 0,
              delivery_distance: deliveryDistance,
              status: "pending",
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              commission_rate: commission.commission_rate,
              commission_amount: commission.commission_amount,
              metadata: {
                is_flash_sale: isFlashSale,
                payment_type: 'mpesa_pending',
                store_delivery_type: storeDeliverySettings?.delivery_type
              }
            })
            .select()
            .single();

          if (orderError) throw orderError;
          createdOrders.push(orderData);
          orderId = orderData.id;
          
          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }
        
        orderId = createdOrders[0]?.id;
        
      } else {
        const product = productTotals[0];
        
        const { data: commissionData } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: product.id,
            p_total_amount: totalOrder
          });

        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID
        };

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            variant: product.variant || null,
            quantity: product.quantity,
            total_price: totalOrder,
            store_id: product.store_id || null,
            delivery_method: deliveryMethod,
            delivery_location: deliveryLocation,
            buyer_phone: contactPhone,
            payment_method: "mpesa",
            deposit_amount: totalDeposit,
            deposit_paid: false,
            balance_due: balanceDue,
            delivery_fee: deliveryMethod === "door" ? finalDeliveryFee : 0,
            delivery_distance: deliveryDistance,
            status: "pending",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            metadata: {
              is_flash_sale: isFlashSale,
              flash_sale_ends_at: isFlashSale ? flashSaleEndsAt : null,
              original_price: isFlashSale ? originalPrice : null,
              payment_type: 'mpesa_pending',
              store_delivery_type: storeDeliverySettings?.delivery_type
            }
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderData.id;
      }
      
      setPendingOrderId(orderId);
      
      toast.dismiss(loadingToast);
      toast.success("Order created! Please complete M-Pesa payment.");
      
      const result = await initiateWalletDeposit(
        contactPhone,
        totalDepositAmount,
        user.id,
        async (receipt, paidAmount) => {
          await supabase
            .from("orders")
            .update({
              deposit_paid: true,
              status: "deposit_paid",
              mpesa_receipt: receipt,
              updated_at: new Date().toISOString(),
              metadata: {
                payment_completed_at: new Date().toISOString(),
                mpesa_receipt: receipt,
                deposit_amount_paid: paidAmount
              }
            })
            .eq("id", orderId);
          
          await updateWalletBalance(ADMIN_ID, paidAmount, 'add');
          
          await supabase.from("wallet_transactions").insert({
            user_id: ADMIN_ID,
            type: 'escrow_receive',
            amount: paidAmount,
            status: 'completed',
            order_id: orderId,
            description: `Escrow deposit for order ${orderId.slice(0, 8)} via M-Pesa`
          });
          
          setMpesaPaymentStep(3);
          toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, { duration: 5000, icon: '✅' });
          
          setTimeout(() => {
            navigate("/orders");
          }, 3000);
        },
        (error) => {
          console.error('M-Pesa payment failed:', error);
          setMpesaPaymentStep(1);
          toast.error(`Payment failed: ${error}. Please try again.`);
          setBuying(false);
        }
      );
      
      setPaymentCheckoutId(result?.checkoutRequestID);
      
    } catch (err) {
      console.error("Checkout error:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to create order: " + (err.message || "Please try again"));
      setMpesaPaymentStep(1);
      setBuying(false);
    }
  };

  // Wallet payment handler
  async function handlePayWithWallet() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");

    const outOfStock = products.some(product => product.stock_quantity < product.quantity);
    if (outOfStock) return toast.error("Some items are out of stock");

    if (isFlashSale && flashSaleEndsAt) {
      const now = new Date();
      const flashEndsAt = new Date(flashSaleEndsAt);
      if (flashEndsAt <= now) {
        toast.error("This flash sale has expired");
        setIsFlashSale(false);
        navigate("/flash-sales");
        return;
      }
    }

    setBuying(true);
    const loadingToast = toast.loading("Processing payment...");

    try {
      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;

      if (fromCart) {
        let createdOrders = [];
        
        for (const product of productTotals) {
          const { data: commissionData } = await supabase
            .rpc('calculate_order_commission', {
              p_product_id: product.id,
              p_total_amount: product.productPrice
            });

          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID
          };

          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
              product_id: product.id,
              buyer_id: user.id,
              seller_id: product.owner_id,
              variant: product.variant || null,
              quantity: product.quantity,
              price_paid: 0,
              total_price: product.productPrice,
              store_id: product.store_id || null,
              delivery_method: deliveryMethod,
              delivery_location: deliveryLocation,
              buyer_phone: contactPhone,
              payment_method: "wallet",
              deposit_amount: product.depositProduct,
              deposit_paid: true,
              balance_due: product.productPrice - product.depositProduct,
              delivery_fee: deliveryMethod === "door" ? (finalDeliveryFee / products.length) : 0,
              delivery_distance: deliveryDistance,
              commission_rate: commission.commission_rate,
              commission_amount: commission.commission_amount,
              status: "deposit_paid",
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              delivered: false,
              escrow_released: false,
              metadata: {
                is_flash_sale: false,
                delivery_speed: deliverySpeed,
                fragile,
                store_delivery_type: storeDeliverySettings?.delivery_type,
                pickup_station: deliveryMethod === "pickup" ? pickupStation : null
              }
            })
            .select()
            .single();

          if (orderError) throw orderError;
          createdOrders.push(orderData);

          const productDepositAmount = product.depositProduct + (deliveryMethod === "door" ? (finalDeliveryFee / products.length) : 0);

          const { data: paymentResult, error: paymentError } = await supabase.rpc('pay_order_deposit', {
            p_order_id: orderData.id,
            p_buyer_id: user.id,
            p_amount: productDepositAmount
          });

          if (paymentError) throw paymentError;
          if (!paymentResult?.success) throw new Error(paymentResult?.error || 'Payment failed');

          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }

        toast.dismiss(loadingToast);
        toast.success(`${createdOrders.length} orders created! 25% deposit held in escrow.`);
        
      } else {
        const product = productTotals[0];
        
        const { data: commissionData } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: product.id,
            p_total_amount: totalOrder
          });

        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID
        };

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            variant: product.variant || null,
            quantity: product.quantity,
            price_paid: 0,
            total_price: totalOrder,
            store_id: product.store_id || null,
            delivery_method: deliveryMethod,
            delivery_location: deliveryLocation,
            buyer_phone: contactPhone,
            payment_method: "wallet",
            deposit_amount: totalDeposit,
            deposit_paid: true,
            balance_due: balanceDue,
            delivery_fee: deliveryMethod === "door" ? finalDeliveryFee : 0,
            delivery_distance: deliveryDistance,
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            status: "deposit_paid",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            delivered: false,
            escrow_released: false,
            metadata: {
              is_flash_sale: isFlashSale,
              flash_sale_ends_at: isFlashSale ? flashSaleEndsAt : null,
              original_price: isFlashSale ? originalPrice : null,
              delivery_speed: deliverySpeed,
              fragile,
              store_delivery_type: storeDeliverySettings?.delivery_type,
              pickup_station: deliveryMethod === "pickup" ? pickupStation : null
            }
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const totalDepositAmount = totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0);

        const { data: paymentResult, error: paymentError } = await supabase.rpc('pay_order_deposit', {
          p_order_id: orderData.id,
          p_buyer_id: user.id,
          p_amount: totalDepositAmount
        });

        if (paymentError) throw paymentError;
        if (!paymentResult?.success) throw new Error(paymentResult?.error || 'Payment failed');

        toast.dismiss(loadingToast);
        toast.success(
          <div>
            <strong>{isFlashSale ? "Flash deal secured!" : "Order created!"}</strong>
            <br />
            <small>25% deposit ({formatKSH(totalDepositAmount)}) held in escrow.</small>
          </div>
        );
      }

      navigate("/orders");
    } catch (err) {
      console.error("Payment error:", err);
      toast.dismiss(loadingToast);
      toast.error("Payment error: " + (err.message || "Please try again"));
    } finally {
      setBuying(false);
    }
  }

  async function handlePayExternal(method) {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");

    if (isFlashSale && flashSaleEndsAt) {
      const now = new Date();
      const flashEndsAt = new Date(flashSaleEndsAt);
      if (flashEndsAt <= now) {
        toast.error("This flash sale has expired");
        setIsFlashSale(false);
        navigate("/flash-sales");
        return;
      }
    }

    setBuying(true);
    const loadingToast = toast.loading("Creating pending order...");

    try {
      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;
      
      if (fromCart) {
        for (const product of productTotals) {
          const { data: commissionData } = await supabase
            .rpc('calculate_order_commission', {
              p_product_id: product.id,
              p_total_amount: product.productPrice
            });

          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID
          };

          await supabase.from("orders").insert({
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            variant: product.variant || null,
            quantity: product.quantity,
            total_price: product.productPrice,
            store_id: product.store_id || null,
            delivery_method: deliveryMethod,
            delivery_location: deliveryLocation,
            buyer_phone: contactPhone,
            payment_method: method,
            deposit_amount: product.depositProduct,
            deposit_paid: false,
            balance_due: product.productPrice - product.depositProduct,
            delivery_fee: deliveryMethod === "door" ? (finalDeliveryFee / products.length) : 0,
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            status: "pending",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            metadata: { payment_type: 'external_pending' }
          });

          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }
      } else {
        const product = productTotals[0];
        
        const { data: commissionData } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: product.id,
            p_total_amount: totalOrder
          });

        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID
        };

        await supabase.from("orders").insert({
          product_id: product.id,
          buyer_id: user.id,
          seller_id: product.owner_id,
          variant: product.variant || null,
          quantity: product.quantity,
          total_price: totalOrder,
          store_id: product.store_id || null,
          delivery_method: deliveryMethod,
          delivery_location: deliveryLocation,
          buyer_phone: contactPhone,
          payment_method: method,
          deposit_amount: totalDeposit,
          deposit_paid: false,
          balance_due: balanceDue,
          delivery_fee: deliveryMethod === "door" ? finalDeliveryFee : 0,
          commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount,
          status: "pending",
          delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          metadata: { is_flash_sale: isFlashSale, payment_type: 'external_pending' }
        });
      }

      toast.dismiss(loadingToast);
      toast.success("Pending order created. Complete payment to confirm.");
      navigate("/orders");
    } catch (err) {
      console.error("External order creation error:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to create order: " + (err.message || ""));
    } finally {
      setBuying(false);
    }
  }

  async function handleStartInstallment() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress) return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation) return toast.error("Please enter pickup station address");
    if (!hasInstallmentPlan) return toast.error("Installments not available");
    if (fromCart && products.length > 1) return toast.error("Installments only available for single products");
    if (isFlashSale) return toast.error("Installments not available for flash sales");

    const product = productTotals[0];
    if (product.quantity < 1) return toast.error("Quantity must be at least 1");
    if (product.stock_quantity != null && product.quantity > product.stock_quantity) {
      return toast.error("Quantity exceeds available stock");
    }

    setProcessingInstallment(true);
    const dismiss = toast.loading("Starting installment plan…");

    try {
      const variantPayload = product.variant || null;
      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;

      const { data, error } = await supabase.rpc("start_installment_order", {
        p_buyer: user.id,
        p_product: product.id,
        p_variant: variantPayload,
        p_quantity: product.quantity,
        p_delivery_method: deliveryMethod,
        p_delivery_location: deliveryLocation,
        p_contact_phone: contactPhone,
      });

      if (error) throw error;

      const instOrderId = typeof data === "string" ? data : data?.id;

      toast.dismiss(dismiss);
      toast.success("Installment plan started! Initial payment secured in escrow");
      navigate("/orders", { state: { highlight: instOrderId } });
    } catch (err) {
      console.error("Installment flow error:", err);
      toast.dismiss(dismiss);
      toast.error(err?.message || "Failed to start installment plan");
    } finally {
      setProcessingInstallment(false);
    }
  }

  const getAddressType = (suggestion) => {
    const types = suggestion.place_type || [];
    if (types.includes('address')) return 'Exact Address';
    if (types.includes('poi')) return 'Place';
    if (types.includes('neighborhood')) return 'Area';
    if (types.includes('locality')) return 'Town/City';
    return 'Location';
  };

  const hasInstallmentPlan = useMemo(() => {
    if (fromCart && products.length > 1) return false;
    if (isFlashSale) return false;
    return products[0]?.installment_plan;
  }, [products, fromCart, isFlashSale]);

  const FlashSaleBanner = () => {
    if (!isFlashSale) return null;

    return (
      <div className={styles.flashSaleBanner}>
        <div className={styles.flashSaleContent}>
          <FaBolt className={styles.flashSaleIcon} />
          <div className={styles.flashSaleText}>
            <strong>FLASH SALE ACTIVE</strong>
            <span>Special price expires in: {flashSaleTimeLeft}</span>
          </div>
        </div>
        <div className={styles.flashSaleNote}>
          Complete checkout before time runs out to lock in this exclusive price
        </div>
      </div>
    );
  };

  if (loading) return <CheckoutSkeleton />;
  if (!products.length) return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🛒</div>
        <h3>No products found</h3>
        <p>Your cart is empty or the product doesn't exist</p>
        <button onClick={() => navigate('/student/marketplace')} className={styles.emptyBtn}>
          Continue Shopping
        </button>
      </div>
    </div>
  );

  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : styles.lightMode}`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <h1>
          {fromCart ? (
            <>
              <FaStore /> Checkout
            </>
          ) : (
            <>
              <FaBox /> Checkout {isFlashSale && "(Flash Sale)"}
            </>
          )}
        </h1>
      </header>

      {/* M-Pesa Payment Modal */}
      <AnimatePresence>
        {mpesaPaymentStep === 2 && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.paymentLoader}>
                <div className={styles.spinner}></div>
                <p>Waiting for M-Pesa payment...</p>
                <p className={styles.paymentInstruction}>
                  Please check your phone ({contactPhone}) and enter your M-Pesa PIN to complete the payment of {formatKSH(depositTotal)}
                </p>
                {paymentCheckoutId && (
                  <p className={styles.referenceText}>Reference: {paymentCheckoutId.slice(-8)}</p>
                )}
                <button 
                  onClick={() => {
                    cancelPolling();
                    setMpesaPaymentStep(1);
                    setBuying(false);
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {mpesaPaymentStep === 3 && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.successContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className={styles.successIcon}>✅</div>
              <h3>Payment Successful!</h3>
              <p>Your deposit has been received.</p>
              <p>Redirecting to orders...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FlashSaleBanner />

      <div className={styles.checkoutGrid}>
        <div className={styles.leftColumn}>
          {/* Products Section */}
          <div className={styles.card}>
            <h3>
              {fromCart ? `Ordering from ${seller?.name}` : "Product Details"}
              {isFlashSale && (
                <span className={styles.flashBadge}>
                  <FaBolt /> FLASH SALE
                </span>
              )}
            </h3>
            
            {productTotals.map((product, index) => (
              <div key={product.id || index} className={styles.checkoutProduct}>
                <img 
                  src={product.image_gallery?.[0] || product.image_url || "/placeholder.jpg"} 
                  alt={product.name}
                  className={styles.productImage}
                />
                <div className={styles.productInfo}>
                  <h4>{product.name}</h4>
                  {product.variant && (
                    <div className={styles.variantDisplay}>
                      Variant: {typeof product.variant === 'string' ? product.variant : JSON.stringify(product.variant)}
                    </div>
                  )}
                  
                  {isFlashSale && (
                    <div className={styles.flashPriceDisplay}>
                      <div className={styles.originalPriceLine}>
                        <span className={styles.originalPriceLabel}>Original:</span>
                        <span className={styles.originalPriceValue}>{formatKSH(product.originalPrice)}</span>
                      </div>
                      <div className={styles.flashPriceLine}>
                        <span className={styles.flashPriceLabel}>Flash Sale:</span>
                        <span className={styles.flashPriceValue}>{formatKSH(product.unitPrice)} × {product.quantity}</span>
                      </div>
                    </div>
                  )}
                  
                  {!isFlashSale && (
                    <div className={styles.productPricing}>
                      <span>{formatKSH(product.unitPrice)} × {product.quantity}</span>
                      <strong>{formatKSH(product.productPrice)}</strong>
                    </div>
                  )}
                  
                  <div className={styles.stockInfo}>
                    {product.stock_quantity > 0 ? (
                      <span className={styles.inStock}>{product.stock_quantity} in stock</span>
                    ) : (
                      <span className={styles.outOfStock}>Out of stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Installment Section */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <div className={styles.card}>
              <h4 onClick={() => setShowInstallmentInfo(!showInstallmentInfo)}>
                Special Offer: Buy in Installments{" "}
                {showInstallmentInfo ? <FaChevronUp /> : <FaChevronDown />}
              </h4>
              <AnimatePresence>
                {showInstallmentInfo && (
                  <motion.div
                    className={styles.installmentDetails}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>
                      Pay <strong>{(products[0]?.installment_plan?.initial_percent || 0.3) * 100}%</strong> now and the remainder after delivery.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Delivery Section */}
          <div className={styles.card}>
            <h4>Delivery & Options</h4>
            <div className={styles.deliveryMethods}>
              {products[0]?.delivery_methods?.pickup && (
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dm"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                  />
                  <span>Pickup Station</span>
                </label>
              )}
              {products[0]?.delivery_methods?.door && (
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dm"
                    value="door"
                    checked={deliveryMethod === "door"}
                    onChange={() => setDeliveryMethod("door")}
                  />
                  <span>Door Delivery</span>
                </label>
              )}
            </div>

            {/* Door Delivery */}
            {deliveryMethod === "door" && (
              <>
                <div className={styles.formGroup}>
                  <label>Delivery Address:</label>
                  <div ref={addressInputRef} className={styles.addressAutocomplete}>
                    <input
                      type="text"
                      placeholder="Start typing your address (e.g. Kilimani, Nairobi)"
                      value={deliveryAddress}
                      onChange={handleAddressChange}
                      className={styles.addressInput}
                    />
                    
                    {isSearching && <div className={styles.searchLoading}>Searching...</div>}
                    
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className={styles.addressSuggestions}>
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className={styles.suggestionItem}
                            onClick={() => handleAddressSelect(suggestion)}
                          >
                            <div className={styles.suggestionText}>{suggestion.place_name}</div>
                            <div className={styles.suggestionType}>{getAddressType(suggestion)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Type Indicator */}
                {storeDeliverySettings && (
                  <div className={`${styles.deliveryTypeIndicator} ${storeDeliverySettings.delivery_type === 'self-delivery' ? styles.selfDelivery : styles.omniflowDelivery}`}>
                    {storeDeliverySettings.delivery_type === 'self-delivery' ? (
                      <>
                        <FaTruck />
                        <span>
                          <strong>Self Delivery</strong> - This seller handles their own delivery
                          {storeDeliverySettings.delivery_base_fee && (
                            <span className={styles.deliveryRateDetail}>
                              Base fee: {formatKSH(storeDeliverySettings.delivery_base_fee)} + {storeDeliverySettings.delivery_rate_per_km} KSh/km
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaMotorcycle />
                        <span>
                          <strong>Omniflow Delivery</strong> - Managed by OmniFlow
                          <span className={styles.deliveryRateDetail}>
                            Zone-based rates: 50 KSh base + up to 15 KSh/km
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Delivery Fee Display */}
                <div className={styles.deliveryFeeDisplay}>
                  <div className={styles.feeRow}>
                    <span>Delivery fee:</span>
                    {deliveryCalculating ? (
                      <span className={styles.calculating}>Calculating...</span>
                    ) : deliveryDistance ? (
                      <span className={isFreeDelivery ? styles.freeDelivery : styles.feeAmount}>
                        {isFreeDelivery ? 'FREE' : formatKSH(finalDeliveryFee)}
                      </span>
                    ) : deliveryAddress ? (
                      <span className={styles.cannotCalculate}>Could not calculate</span>
                    ) : (
                      <span className={styles.enterAddress}>Enter address to see fee</span>
                    )}
                  </div>
                  
                  {deliveryBreakdown && !isFreeDelivery && (
                    <div className={styles.feeBreakdown}>
                      {deliveryBreakdown.type === 'self-delivery' ? (
                        <>
                          <div>Base fee: {formatKSH(deliveryBreakdown.baseFee)}</div>
                          <div>Distance rate: {deliveryBreakdown.ratePerKm} KSh/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>Total: {formatKSH(deliveryBreakdown.total)}</div>
                        </>
                      ) : (
                        <>
                          <div>Zone {deliveryBreakdown.zone?.replace('zone', '')}: {deliveryBreakdown.rate} KSh/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>Total: {formatKSH(deliveryBreakdown.total)}</div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {storeDeliverySettings?.delivery_coverage_radius && (
                    <div className={styles.coverageNote}>
                      Max delivery radius: {storeDeliverySettings.delivery_coverage_radius} km
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Delivery speed:</label>
                  <select value={deliverySpeed} onChange={(e) => setDeliverySpeed(e.target.value)}>
                    <option value="standard">Standard</option>
                    <option value="express">Express (+{formatKSH(200)})</option>
                  </select>
                </div>

                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} />
                  <span>Fragile item (extra handling)</span>
                </label>
              </>
            )}

            {/* Pickup Station */}
            {deliveryMethod === "pickup" && (
              <div className={styles.formGroup}>
                <label>Pickup Station Address:</label>
                <input
                  type="text"
                  placeholder="Enter pickup station address"
                  value={pickupStation}
                  onChange={(e) => setPickupStation(e.target.value)}
                />
                <small>Enter the exact location where you'll pick up your order</small>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Contact / M-Pesa Phone:</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0712345678"
              />
              <small>This number will receive the M-Pesa payment prompt and delivery updates</small>
            </div>
          </div>

          {/* Installment Payment Button */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <button
              onClick={handleStartInstallment}
              disabled={processingInstallment || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              className={styles.installmentBtn}
            >
              {processingInstallment ? <FaSpinner className={styles.spinning} /> : <FaPercent />}
              Start Installment Plan (Pay Initial)
            </button>
          )}
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.orderSummary}>
            <h4>Order Summary</h4>
            
            {fromCart && seller && (
              <div className={styles.storeInfo}>
                <FaStore />
                <span>{seller.name}</span>
              </div>
            )}
            
            {isFlashSale && (
              <div className={styles.flashSummaryAlert}>
                <FaBolt /> Flash Sale Active
                <div className={styles.flashTimerSmall}>
                  <FaClock /> {flashSaleTimeLeft}
                </div>
              </div>
            )}
            
            <div className={styles.productsList}>
              {productTotals.map((product, index) => (
                <div key={index} className={styles.summaryProduct}>
                  <img src={product.image_gallery?.[0] || "/placeholder.jpg"} alt="thumb" className={styles.summaryImage} />
                  <div className={styles.summaryProductInfo}>
                    <div className={styles.summaryProductName}>{product.name}</div>
                    <div>Qty: {product.quantity}</div>
                    <div className={styles.summaryProductPrice}>{formatKSH(product.productPrice)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.priceBreakdown}>
              {isFlashSale && productTotals[0]?.originalPrice && (
                <div className={styles.flashSaleSavings}>
                  <span>Flash Sale Savings:</span>
                  <strong style={{ color: '#10B981' }}>
                    -{formatKSH((productTotals[0].originalPrice - productTotals[0].unitPrice) * productTotals[0].quantity)}
                  </strong>
                </div>
              )}
              <div className={styles.priceRow}>
                <span>Products total:</span>
                <strong>{formatKSH(totalProductPrice)}</strong>
              </div>
              {deliveryMethod === "door" && (
                <div className={styles.priceRow}>
                  <span>Delivery fee:</span>
                  <strong>{isFreeDelivery ? 'FREE' : formatKSH(finalDeliveryFee)}</strong>
                </div>
              )}
              <div className={styles.divider} />
              <div className={styles.depositRow}>
                <span>Deposit (25%):</span>
                <strong>{formatKSH(totalDeposit)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Pay now:</span>
                <strong className={styles.totalAmount}>{formatKSH(depositTotal)}</strong>
              </div>
              <div className={styles.balanceRow}>
                <span>Balance due after delivery:</span>
                <strong>{formatKSH(balanceDue)}</strong>
              </div>
            </div>

            <div className={styles.paymentMethods}>
              <button 
                className={styles.walletBtn} 
                onClick={handlePayWithWallet} 
                disabled={buying || mpesaLoading || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaWallet /> Pay 25% Deposit
              </button>

              <button 
                className={styles.mpesaBtn} 
                onClick={handleMpesaPayment} 
                disabled={buying || mpesaLoading || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaMobileAlt /> {mpesaLoading ? "Processing..." : "Pay via M-Pesa"}
              </button>

              <button 
                className={styles.paypalBtn} 
                onClick={() => handlePayExternal("paypal")} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaPaypal /> Pay via PayPal
              </button>
            </div>

            <div className={styles.infoNote}>
              <FaInfoCircle />
              <span>
                <strong>How it works:</strong> Pay 25% deposit now (held in escrow). After delivery is confirmed, pay the remaining 75% to complete the order.
              </span>
            </div>

            {storeDeliverySettings?.delivery_type === 'self-delivery' && (
              <div className={styles.deliveryNote}>
                <FaTruck />
                <span>
                  This seller handles their own delivery. Delivery fee calculated based on their rates.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}