import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
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
  FaBuilding
} from "react-icons/fa";
import "./Checkout.css";

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

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

  // ===== KENYAN CURRENCY FORMATTING =====
  const formatKSH = (amount) => {
    const num = Number(amount || 0);
    if (Number.isInteger(num) || num % 1 === 0) {
      return `KSH ${num.toLocaleString('en-KE')}`;
    }
    return `KSH ${num.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

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

  // Calculate product totals FIRST
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
    
    console.log("Calculating delivery fee with store settings:", storeSettings);
    
    // For self-delivery stores, use their rates
    if (storeSettings.delivery_type === 'self-delivery') {
      const baseFee = Number(storeSettings.delivery_base_fee) || 100;
      const ratePerKm = Number(storeSettings.delivery_rate_per_km) || 15;
      const totalFee = baseFee + (distance * ratePerKm);
      
      console.log(`Self-delivery fee: base=${baseFee}, rate=${ratePerKm}, distance=${distance}, total=${totalFee}`);
      
      return Math.round(totalFee);
    }
    
    // For Omniflow managed delivery, use zone-based rates
    const DELIVERY_RATES = {
      BASE_FEE: 50,
      ZONES: [
        { maxDistance: 10, ratePerKm: 15 },   // Zone 1: up to 10km
        { maxDistance: 50, ratePerKm: 10 },   // Zone 2: up to 50km
        { maxDistance: Infinity, ratePerKm: 7 } // Zone 3: beyond 50km
      ]
    };
    
    let zoneRate = DELIVERY_RATES.ZONES[2].ratePerKm;
    if (distance <= DELIVERY_RATES.ZONES[0].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[0].ratePerKm;
    } else if (distance <= DELIVERY_RATES.ZONES[1].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[1].ratePerKm;
    }
    
    const totalFee = DELIVERY_RATES.BASE_FEE + (distance * zoneRate);
    
    console.log(`Omniflow delivery fee: distance=${distance}, rate=${zoneRate}, total=${totalFee}`);
    
    return Math.round(totalFee);
  }, []);

  // Delivery fee calculation
  const deliveryFee = useMemo(() => {
    if (!deliveryDistance || deliveryMethod !== "door") return 0;
    return calculateDeliveryFeeFromStore(deliveryDistance, storeDeliverySettings);
  }, [deliveryDistance, deliveryMethod, storeDeliverySettings, calculateDeliveryFeeFromStore]);

  // Check free delivery eligibility (for Omniflow managed only)
  const FREE_DELIVERY_THRESHOLD = 5000;
  const isFreeDelivery = useMemo(() => {
    // Self-delivery stores don't offer free delivery
    if (storeDeliverySettings?.delivery_type === 'self-delivery') return false;
    return totalProductPrice >= FREE_DELIVERY_THRESHOLD;
  }, [totalProductPrice, storeDeliverySettings]);

  const finalDeliveryFee = useMemo(() => {
    return isFreeDelivery ? 0 : deliveryFee;
  }, [isFreeDelivery, deliveryFee]);

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
      
      // Update delivery breakdown for display
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

          // Fetch store delivery settings from stores table
          const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
            .eq("owner_id", flashProduct.owner_id)
            .maybeSingle();

          if (storeError) {
            console.error("Error fetching store:", storeError);
          }
          
          if (store) {
            console.log("Store delivery settings loaded:", {
              delivery_type: store.delivery_type,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              delivery_coverage_radius: store.delivery_coverage_radius
            });
            
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
            
            // Fetch store delivery settings from stores table
            const { data: storeSettings, error: storeError } = await supabase
              .from("stores")
              .select("delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
              .eq("owner_id", location.state.seller.owner_id)
              .maybeSingle();
              
            if (storeError) {
              console.error("Error fetching store settings:", storeError);
            }
            
            if (storeSettings) {
              console.log("Store delivery settings loaded:", storeSettings);
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

          // Fetch store delivery settings from stores table
          const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county")
            .eq("owner_id", p.owner_id)
            .maybeSingle();
          
          if (storeError) {
            console.error("Error fetching store:", storeError);
          }
          
          if (store) {
            console.log("Store delivery settings loaded:", {
              delivery_type: store.delivery_type,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              delivery_coverage_radius: store.delivery_coverage_radius
            });
            
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

  // Payment handler
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
      // Check user balance
      const { data: userWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const userBalance = userWallet?.balance || 0;
      const totalDueNow = depositTotal;
      
      if (userBalance < totalDueNow) {
        toast.dismiss(loadingToast);
        toast.error(`Insufficient balance. You need ${formatKSH(totalDueNow)} but have ${formatKSH(userBalance)}`);
        setBuying(false);
        return;
      }

      const deliveryLocation = deliveryMethod === "door" ? deliveryAddress : pickupStation;

      if (fromCart) {
        let createdOrders = [];
        
        for (const product of productTotals) {
          // Calculate commission
          const { data: commissionData } = await supabase
            .rpc('calculate_order_commission', {
              p_product_id: product.id,
              p_total_amount: product.productPrice
            });

          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID
          };

          // Create order with deposit_paid status
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
              delivery_base_fee: storeDeliverySettings?.delivery_base_fee,
              delivery_rate_per_km: storeDeliverySettings?.delivery_rate_per_km,
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

          // Deduct deposit from buyer
          await updateWalletBalance(user.id, productDepositAmount, 'subtract');

          // Record buyer transaction
          await supabase.from("wallet_transactions").insert({
            user_id: user.id,
            type: 'purchase',
            amount: productDepositAmount,
            status: 'completed',
            order_id: orderData.id,
            description: `Deposit payment for order ${orderData.id.slice(0, 8)}`,
            metadata: { payment_type: 'deposit', is_escrow: true }
          });

          // Add deposit to admin wallet escrow
          await updateWalletBalance(ADMIN_ID, productDepositAmount, 'add');

          // Record admin escrow transaction
          await supabase.from("wallet_transactions").insert({
            user_id: ADMIN_ID,
            type: 'escrow_receive',
            amount: productDepositAmount,
            status: 'completed',
            order_id: orderData.id,
            description: `Escrow deposit for order ${orderData.id.slice(0, 8)}`,
            metadata: { payment_type: 'escrow_deposit' }
          });

          // Remove from cart
          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }

        toast.dismiss(loadingToast);
        toast.success(`${createdOrders.length} orders created! 25% deposit held in escrow.`);
        
      } else {
        // Single product
        const product = productTotals[0];
        
        const { data: commissionData } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: product.id,
            p_total_amount: totalOrder
          });

        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
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
            delivery_base_fee: storeDeliverySettings?.delivery_base_fee,
            delivery_rate_per_km: storeDeliverySettings?.delivery_rate_per_km,
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

        // Deduct from buyer
        await updateWalletBalance(user.id, totalDepositAmount, 'subtract');

        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: 'purchase',
          amount: totalDepositAmount,
          status: 'completed',
          order_id: orderData.id,
          description: `Deposit payment for order ${orderData.id.slice(0, 8)}`,
          metadata: { payment_type: 'deposit', is_escrow: true }
        });

        // Add to admin escrow
        await updateWalletBalance(ADMIN_ID, totalDepositAmount, 'add');

        await supabase.from("wallet_transactions").insert({
          user_id: ADMIN_ID,
          type: 'escrow_receive',
          amount: totalDepositAmount,
          status: 'completed',
          order_id: orderData.id,
          description: `Escrow deposit for order ${orderData.id.slice(0, 8)}`,
          metadata: { payment_type: 'escrow_deposit' }
        });

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
      <div className="flash-sale-banner">
        <div className="flash-sale-content">
          <FaBolt className="flash-sale-icon" />
          <div className="flash-sale-text">
            <strong>FLASH SALE ACTIVE</strong>
            <span>Special price expires in: {flashSaleTimeLeft}</span>
          </div>
        </div>
        <div className="flash-sale-note">
          Complete checkout before time runs out to lock in this exclusive price
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (!products.length) return <div className="loading">No products found</div>;

  return (
    <div className="checkout-page">
      <div className="checkout-header" style={{ justifyContent: 'center' }}>
        <h1>
          {fromCart ? (
            <>
              <FaStore /> Checkout - {seller?.name}
            </>
          ) : (
            <>
              <FaBox /> Checkout {isFlashSale && "(Flash Sale)"}
            </>
          )}
        </h1>
      </div>

      <FlashSaleBanner />

      <div className="checkout-grid">
        <div className="left">
          {/* Products Display */}
          <div className="products-section">
            <h3>
              {fromCart ? `Ordering from ${seller?.name}` : "Product Details"}
              {isFlashSale && (
                <span className="flash-badge">
                  <FaBolt /> FLASH SALE
                </span>
              )}
            </h3>
            
            {productTotals.map((product, index) => (
              <div key={product.id || index} className="checkout-product">
                <img 
                  src={product.image_gallery?.[0] || product.image_url || "/placeholder.jpg"} 
                  alt={product.name}
                />
                <div className="product-info">
                  <h4>{product.name}</h4>
                  {product.variant && (
                    <div className="variant-display">
                      Variant: {typeof product.variant === 'string' ? product.variant : JSON.stringify(product.variant)}
                    </div>
                  )}
                  
                  {isFlashSale && (
                    <div className="flash-price-display">
                      <div className="original-price-line">
                        <span className="original-price-label">Original:</span>
                        <span className="original-price-value">{formatKSH(product.originalPrice)}</span>
                      </div>
                      <div className="flash-price-line">
                        <span className="flash-price-label">Flash Sale:</span>
                        <span className="flash-price-value">{formatKSH(product.unitPrice)} × {product.quantity}</span>
                      </div>
                    </div>
                  )}
                  
                  {!isFlashSale && (
                    <div className="product-pricing">
                      <span>{formatKSH(product.unitPrice)} × {product.quantity}</span>
                      <strong>{formatKSH(product.productPrice)}</strong>
                    </div>
                  )}
                  
                  <div className="stock-info">
                    {product.stock_quantity > 0 ? (
                      <span className="in-stock">{product.stock_quantity} in stock</span>
                    ) : (
                      <span className="out-of-stock">Out of stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Installment Section */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <div className="installment-section" style={{ marginBottom: 16 }}>
              <h4 onClick={() => setShowInstallmentInfo((s) => !s)}>
                Special Offer: Buy in Installments{" "}
                {showInstallmentInfo ? <FaChevronUp /> : <FaChevronDown />}
              </h4>
              {showInstallmentInfo && (
                <div className="installment-details">
                  <p>
                    Pay <strong>{(products[0].installment_plan.initial_percent || 0.3) * 100}%</strong> now and the remainder after delivery.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DELIVERY SECTION */}
          <div className="delivery-settings">
            <h4>Delivery & Options</h4>
            <div className="delivery-methods" style={{ marginBottom: 12 }}>
              {products[0]?.delivery_methods?.pickup && (
                <label>
                  <input
                    type="radio"
                    name="dm"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                  />
                  Pickup Station
                </label>
              )}
              {products[0]?.delivery_methods?.door && (
                <label>
                  <input
                    type="radio"
                    name="dm"
                    value="door"
                    checked={deliveryMethod === "door"}
                    onChange={() => setDeliveryMethod("door")}
                  />
                  Door Delivery
                </label>
              )}
            </div>

            {/* Door Delivery */}
            {deliveryMethod === "door" && (
              <>
                <label>
                  Delivery Address:
                  <div ref={addressInputRef} className="address-autocomplete-container">
                    <input
                      type="text"
                      placeholder="Start typing your address (e.g. Kilimani, Nairobi)"
                      value={deliveryAddress}
                      onChange={handleAddressChange}
                      className="address-input"
                    />
                    
                    {isSearching && <div className="search-loading">Searching...</div>}
                    
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="address-suggestions">
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => handleAddressSelect(suggestion)}
                          >
                            <div className="suggestion-text">{suggestion.place_name}</div>
                            <div className="suggestion-type">{getAddressType(suggestion)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                {/* Delivery Type Indicator */}
                {storeDeliverySettings && (
                  <div className="delivery-type-indicator" style={{
                    marginTop: '8px',
                    marginBottom: '8px',
                    padding: '8px 12px',
                    background: storeDeliverySettings.delivery_type === 'self-delivery' ? '#FEF3C7' : '#EFF6FF',
                    borderRadius: '8px',
                    fontSize: '0.85em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: storeDeliverySettings.delivery_type === 'self-delivery' ? '#D97706' : '#2563EB'
                  }}>
                    {storeDeliverySettings.delivery_type === 'self-delivery' ? (
                      <>
                        <FaTruck size={14} />
                        <span>
                          <strong>Self Delivery</strong> - This seller handles their own delivery
                          {storeDeliverySettings.delivery_base_fee && (
                            <span style={{ display: 'block', fontSize: '0.75em', marginTop: '2px' }}>
                              Base fee: {formatKSH(storeDeliverySettings.delivery_base_fee)} + {storeDeliverySettings.delivery_rate_per_km} KSH/km
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaMotorcycle size={14} />
                        <span>
                          <strong>Omniflow Delivery</strong> - Managed by OmniFlow
                          <span style={{ display: 'block', fontSize: '0.75em', marginTop: '2px' }}>
                            Zone-based rates: 50 KSH base + up to 15 KSH/km
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Delivery Fee Display */}
                <div className="delivery-fee-display" style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>Delivery fee:</span>
                    {deliveryCalculating ? (
                      <span style={{ color: '#666' }}>Calculating...</span>
                    ) : deliveryDistance ? (
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: '1.1em',
                        color: isFreeDelivery ? '#10B981' : (storeDeliverySettings?.delivery_type === 'self-delivery' ? '#D97706' : '#2563EB')
                      }}>
                        {isFreeDelivery ? 'FREE' : formatKSH(finalDeliveryFee)}
                      </span>
                    ) : deliveryAddress ? (
                      <span style={{ color: '#f59e0b' }}>Could not calculate</span>
                    ) : (
                      <span style={{ color: '#666' }}>Enter address to see fee</span>
                    )}
                  </div>
                  
                  {deliveryBreakdown && !isFreeDelivery && (
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #ddd' }}>
                      {deliveryBreakdown.type === 'self-delivery' ? (
                        <>
                          <div>Base fee: {formatKSH(deliveryBreakdown.baseFee)}</div>
                          <div>Distance rate: {deliveryBreakdown.ratePerKm} KSH/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div style={{ marginTop: '4px', fontWeight: 500, color: '#D97706' }}>
                            Total: {formatKSH(deliveryBreakdown.total)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>Zone {deliveryBreakdown.zone?.replace('zone', '')}: {deliveryBreakdown.rate} KSH/km</div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div style={{ marginTop: '4px', fontWeight: 500, color: '#2563EB' }}>
                            Total: {formatKSH(deliveryBreakdown.total)}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {storeDeliverySettings?.delivery_coverage_radius && (
                    <div style={{ fontSize: '0.75em', color: '#888', marginTop: '8px' }}>
                      Max delivery radius: {storeDeliverySettings.delivery_coverage_radius} km
                    </div>
                  )}
                </div>

                <label style={{ marginTop: '12px' }}>
                  Delivery speed:
                  <select value={deliverySpeed} onChange={(e) => setDeliverySpeed(e.target.value)}>
                    <option value="standard">Standard</option>
                    <option value="express">Express (+{formatKSH(200)})</option>
                  </select>
                </label>

                <label>
                  <input type="checkbox" checked={fragile} onChange={(e) => setFragile(e.target.checked)} />
                  Fragile item (extra handling)
                </label>
              </>
            )}

            {/* Pickup Station */}
            {deliveryMethod === "pickup" && (
              <label>
                Pickup Station Address:
                <input
                  type="text"
                  placeholder="Enter pickup station address"
                  value={pickupStation}
                  onChange={(e) => setPickupStation(e.target.value)}
                />
                <small>Enter the exact location where you'll pick up your order</small>
              </label>
            )}

            <label>
              Contact phone:
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="07XXXXXXXX"
              />
              <small>We'll use this for delivery updates</small>
            </label>
          </div>

          {/* Installment Payment Button */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <div className="installment-section" style={{ marginTop: 12 }}>
              <button
                onClick={handleStartInstallment}
                disabled={processingInstallment || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
                className="wallet"
              >
                Start Installment Plan (Pay Initial)
              </button>
            </div>
          )}

          {/* PAYMENT SECTION */}
          <div className="payment-methods" style={{ marginTop: 16 }}>
            <h4>Payment Summary</h4>
            <div className="price-breakdown">
              {isFlashSale && productTotals[0]?.originalPrice && (
                <div className="flash-sale-savings">
                  <span>Flash Sale Savings:</span>
                  <strong style={{ color: '#10B981' }}>
                    -{formatKSH((productTotals[0].originalPrice - productTotals[0].unitPrice) * productTotals[0].quantity)}
                  </strong>
                </div>
              )}
              <div>
                <span>Products total:</span>
                <strong>{formatKSH(totalProductPrice)}</strong>
              </div>
              {deliveryMethod === "door" && (
                <div>
                  <span>Delivery fee:</span>
                  <strong>{isFreeDelivery ? 'FREE' : formatKSH(finalDeliveryFee)}</strong>
                </div>
              )}
              <div className="separator" />
              <div style={{ color: '#667eea', fontWeight: 600 }}>
                <span>Deposit (25%):</span>
                <strong>{formatKSH(totalDeposit)}</strong>
              </div>
              <div>
                <span>Pay now:</span>
                <strong style={{ fontSize: '1.1em' }}>{formatKSH(depositTotal)}</strong>
              </div>
              <div>
                <span>Balance due after delivery:</span>
                <strong>{formatKSH(balanceDue)}</strong>
              </div>
            </div>

            <div className="methods">
              <button 
                className="wallet" 
                onClick={handlePayWithWallet} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaWallet /> Pay 25% Deposit
              </button>

              <button 
                className="mpesa" 
                onClick={() => handlePayExternal("mpesa")} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaMobileAlt /> Pay via M-Pesa
              </button>

              <button 
                className="paypal" 
                onClick={() => handlePayExternal("paypal")} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress) || (deliveryMethod === "pickup" && !pickupStation)}
              >
                <FaPaypal /> Pay via PayPal
              </button>
            </div>

            <p className="muted">
              <strong>How it works:</strong> Pay 25% deposit now (held in escrow). After delivery is confirmed, pay the remaining 75% to complete the order.
            </p>
          </div>
        </div>

        <aside className="right">
          <div className="order-summary">
            <h4>Order Summary</h4>
            
            {fromCart && seller && (
              <div className="store-info">
                <FaStore />
                <span>{seller.name}</span>
              </div>
            )}
            
            {isFlashSale && (
              <div className="flash-summary-alert">
                <FaBolt /> Flash Sale Active
                <div className="flash-timer-small">
                  <FaClock /> {flashSaleTimeLeft}
                </div>
              </div>
            )}
            
            <div className="products-list">
              {productTotals.map((product, index) => (
                <div key={index} className="summary-product">
                  <img src={product.image_gallery?.[0] || "/placeholder.jpg"} alt="thumb" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div>Qty: {product.quantity}</div>
                    <div>{formatKSH(product.productPrice)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="summary-details">
              <div>Delivery: {deliveryMethod === "door" ? "Door Delivery" : deliveryMethod === "pickup" ? "Pickup Station" : "—"}</div>
              {deliveryMethod === "door" && deliveryAddress && (
                <div className="summary-address">
                  <FaMapMarkerAlt style={{ fontSize: '0.75em', marginRight: '4px' }} />
                  <span>{deliveryAddress.substring(0, 50)}...</span>
                </div>
              )}
              {deliveryMethod === "pickup" && pickupStation && (
                <div className="summary-address">
                  <FaBuilding style={{ fontSize: '0.75em', marginRight: '4px' }} />
                  <span>{pickupStation.substring(0, 50)}...</span>
                </div>
              )}
              
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', fontWeight: 700 }}>
                Pay now: {formatKSH(depositTotal)}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                Pay later: {formatKSH(balanceDue)}
              </div>

              {storeDeliverySettings?.delivery_type === 'self-delivery' && (
                <div style={{ marginTop: 8, padding: 8, background: '#FEF3C7', borderRadius: 6, fontSize: '0.85em', color: '#D97706' }}>
                  <FaTruck style={{ marginRight: '4px' }} />
                  This seller handles their own delivery. Delivery fee calculated based on their rates.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}