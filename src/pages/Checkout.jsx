import React, { useEffect, useMemo, useState, useRef } from "react";
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
  FaMotorcycle
} from "react-icons/fa";
import "./Checkout.css";

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Delivery constants
const DELIVERY = {
  BASE_FEE: 50,
  ZONES: {
    ZONE1: { max: 10, rate: 15 },
    ZONE2: { max: 50, rate: 10 },
    ZONE3: { max: Infinity, rate: 7 }
  },
  MAX_RADIUS_KM: 100,
  FREE_DELIVERY_THRESHOLD: 5000
};

export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
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
  const storeId = location.state?.storeId;
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

  // Helper function to determine weight class if not set
  const determineWeightClass = (product) => {
    if (product.weight_class) return product.weight_class;
    
    const category = (product.category || '').toLowerCase();
    
    if (category.includes('electronics') || 
        category.includes('phone') || 
        category.includes('fashion') || 
        category.includes('apparel') || 
        category.includes('book') ||
        category.includes('jewelry')) {
      return 'Small';
    }
    
    if (category.includes('furniture') || 
        category.includes('appliance') || 
        (category.includes('home') && category.includes('large'))) {
      return 'Heavy';
    }
    
    return 'Medium';
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
      
      const weightClass = determineWeightClass(product);
      
      return {
        ...product,
        unitPrice,
        productPrice,
        depositProduct,
        originalPrice: product.original_price || product.price,
        weightClass
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

  // Calculate delivery fee using the dynamic zone-based formula
  const calculateZoneDeliveryFee = (distance) => {
    if (!distance) return 0;
    
    let rate;
    let zone;
    
    if (distance <= DELIVERY.ZONES.ZONE1.max) {
      rate = DELIVERY.ZONES.ZONE1.rate;
      zone = 'zone1';
    } else if (distance <= DELIVERY.ZONES.ZONE2.max) {
      rate = DELIVERY.ZONES.ZONE2.rate;
      zone = 'zone2';
    } else {
      rate = DELIVERY.ZONES.ZONE3.rate;
      zone = 'zone3';
    }
    
    const totalFee = DELIVERY.BASE_FEE + (distance * rate);
    return {
      fee: Math.round(totalFee),
      rate,
      zone,
      baseFee: DELIVERY.BASE_FEE
    };
  };

  // Delivery fee calculation
  const deliveryFeeData = useMemo(() => {
    if (!deliveryDistance) return { fee: 0, rate: 0, zone: null, baseFee: DELIVERY.BASE_FEE };
    if (deliveryMethod !== "door") return { fee: 0, rate: 0, zone: null, baseFee: DELIVERY.BASE_FEE };
    
    return calculateZoneDeliveryFee(deliveryDistance);
  }, [deliveryDistance, deliveryMethod]);

  const deliveryFee = deliveryFeeData.fee;

  const depositTotal = useMemo(() => +(totalDeposit + (deliveryMethod === "door" ? deliveryFee : 0)).toFixed(2), [totalDeposit, deliveryFee, deliveryMethod]);
  const balanceDue = useMemo(() => +(totalProductPrice - totalDeposit).toFixed(2), [totalProductPrice, totalDeposit]);
  const totalOrder = useMemo(() => +(totalProductPrice + (deliveryMethod === "door" ? deliveryFee : 0)).toFixed(2), [totalProductPrice, deliveryFee, deliveryMethod]);

  // Check free delivery eligibility
  const isFreeDelivery = useMemo(() => {
    return totalProductPrice >= DELIVERY.FREE_DELIVERY_THRESHOLD;
  }, [totalProductPrice]);

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

  // Calculate distance when address is selected
  useEffect(() => {
    async function updateDistance() {
      if (!deliveryAddress || !seller?.location_coords || fromCart || deliveryMethod !== "door") return;
      
      const distance = await calculateDistance(seller.location_coords, deliveryAddress);
      setDeliveryDistance(distance);
      
      if (distance) {
        const feeData = calculateZoneDeliveryFee(distance);
        
        setDeliveryBreakdown({
          distance: distance.toFixed(1),
          zone: feeData.zone,
          rate: feeData.rate,
          baseFee: feeData.baseFee,
          total: feeData.fee
        });
      }
    }
    
    updateDistance();
  }, [deliveryAddress, seller, deliveryMethod]);

  // Calculate distance using Mapbox
  const calculateDistance = async (fromCoords, toAddress) => {
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
      
      if (distanceKm > DELIVERY.MAX_RADIUS_KM) {
        toast.error(`Delivery address is beyond our ${DELIVERY.MAX_RADIUS_KM}km service radius`);
        return null;
      }
      
      return distanceKm;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return null;
    } finally {
      setDeliveryCalculating(false);
    }
  };

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        console.log("🔄 Checkout loading...", { 
          productId, 
          fromCart, 
          fromFlashSale,
          locationState: location.state 
        });

        if (!user?.id) {
          toast.error("Please login to proceed to checkout");
          navigate("/login");
          return;
        }

        // Flash Sale Flow
        if (fromFlashSale && location.state?.product) {
          console.log("⚡ Flash sale checkout flow activated");
          
          const flashProduct = location.state.product;
          const flashPrice = location.state.flashPrice;
          const originalPrice = location.state.originalPrice;
          
          const now = new Date();
          const flashEndsAt = new Date(flashProduct.flash_sale_ends_at);
          if (flashEndsAt <= now) {
            toast.error("This flash sale has expired");
            navigate("/flash-sales");
            return;
          }

          setIsFlashSale(true);
          setFlashSaleEndsAt(flashProduct.flash_sale_ends_at);
          setOriginalPrice(originalPrice);

          const productWithFlashPrice = {
            ...flashProduct,
            price: flashPrice,
            original_price: originalPrice,
            discount: flashProduct.discount || 0,
            is_flash_sale: true,
            quantity: 1
          };

          setProducts([productWithFlashPrice]);

          // Fetch seller info with location coordinates and delivery type
          const { data: s, error: sellerError } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type")
            .eq("owner_id", flashProduct.owner_id)
            .maybeSingle();

          if (sellerError) {
            console.error("Error fetching seller:", sellerError);
          }
          
          if (s) {
            setSeller({
              ...s,
              location_coords: s.location_lat && s.location_lng ? 
                [s.location_lng, s.location_lat] : null
            });
          }

          const dm = flashProduct.delivery_methods || {};
          const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
          const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");

          console.log("✅ Flash sale checkout loaded successfully");
          setLoading(false);
          return;
        }

        // Cart Flow
        if (fromCart && location.state?.cartItems) {
          const cartItems = location.state.cartItems;
          console.log("🛒 Cart checkout items:", cartItems);
          
          setProducts(cartItems.map(item => ({
            ...item.products,
            cartItemId: item.id,
            quantity: item.quantity,
            variant: item.variant
          })));

          if (location.state.seller) {
            setSeller(location.state.seller);
          }

          const firstItem = cartItems[0];
          if (firstItem) {
            const dm = firstItem.products.delivery_methods || {};
            const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
            const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
            setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          }
        } else {
          // Single Product Flow
          let p = location.state?.product || null;

          if (!p) {
            const { data, error } = await supabase
              .from("products")
              .select(`
                *,
                delivery_methods,
                image_gallery,
                discount,
                installment_plan,
                variants,
                variant_options,
                price,
                description,
                store_id,
                metadata
              `)
              .eq("id", productId)
              .single();

            if (error) throw error;
            p = data;
          }

          setProducts([{ ...p, quantity: 1 }]);

          // Fetch seller info with location coordinates and delivery type
          const { data: s } = await supabase
            .from("stores")
            .select("id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type")
            .eq("owner_id", p.owner_id)
            .maybeSingle();
          
          if (s) {
            setSeller({
              ...s,
              location_coords: s.location_lat && s.location_lng ? 
                [s.location_lng, s.location_lat] : null
            });
          }

          const dm = p.delivery_methods || {};
          const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
          const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
        }

        console.log("✅ Checkout loaded successfully");
      } catch (err) {
        console.error("❌ Checkout load error:", err);
        toast.error("Failed to load checkout");
        navigate(isFlashSale ? "/flash-sales" : "/cart");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, location.state, user, fromCart, fromFlashSale, navigate, isFlashSale]);

  // ===== FIXED PAYMENT HANDLER WITH ESCROW =====
  async function handlePayWithWallet() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress && deliveryMethod === "door") return toast.error("Please enter a delivery address");

    const outOfStock = products.some(product => 
      product.stock_quantity < product.quantity
    );
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
      if (fromCart) {
        // Multi-product checkout from cart
        let createdOrders = [];
        
        for (const product of productTotals) {
          // First calculate commission
          const { data: commissionData, error: commissionError } = await supabase
            .rpc('calculate_order_commission', {
              p_product_id: product.id,
              p_total_amount: product.productPrice
            });

          if (commissionError) throw commissionError;

          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID
          };

          // Create order
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
              delivery_location: deliveryAddress,
              buyer_phone: contactPhone,
              payment_method: "wallet",
              deposit_amount: product.depositProduct,
              deposit_paid: true,
              balance_due: product.productPrice - product.depositProduct,
              delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
              delivery_distance: deliveryDistance,
              delivery_zone: deliveryBreakdown?.zone,
              delivery_base_fee: deliveryBreakdown?.baseFee,
              delivery_rate_per_km: deliveryBreakdown?.rate,
              commission_rate: commission.commission_rate,
              commission_amount: commission.commission_amount,
              status: "deposit_paid",
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              metadata: {
                is_flash_sale: false,
                delivery_speed: deliverySpeed,
                fragile,
                admin_email: commission.admin_email,
                admin_id: commission.admin_id,
                delivery_breakdown: deliveryBreakdown
              }
            })
            .select()
            .single();

          if (orderError) throw orderError;
          createdOrders.push(orderData);

          // Calculate total deposit amount for this product
          const totalDepositAmount = product.depositProduct + (deliveryMethod === "door" ? (deliveryFee / products.length) : 0);

          // ===== RECORD DEPOSIT IN WALLET TRANSACTIONS =====
          // Deduct deposit from buyer's wallet
          const { error: buyerWalletError } = await supabase
            .from("wallets")
            .update({ 
              balance: supabase.raw(`balance - ${totalDepositAmount}`),
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);

          if (buyerWalletError) throw buyerWalletError;

          // Get buyer's new balance
          const { data: buyerWallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

          // Record buyer's deposit transaction
          const { error: buyerTxError } = await supabase
            .from("wallet_transactions")
            .insert({
              user_id: user.id,
              type: 'purchase',
              amount: totalDepositAmount,
              gross_amount: totalDepositAmount,
              commission_paid: 0,
              status: 'completed',
              order_id: orderData.id,
              buyer_id: user.id,
              seller_id: product.owner_id,
              product_id: product.id,
              description: `Deposit payment for order ${orderData.id.slice(0, 8)} - ${product.name}`,
              metadata: {
                order_id: orderData.id,
                product_name: product.name,
                deposit_amount: product.depositProduct,
                delivery_fee: deliveryMethod === "door" ? (deliveryFee / products.length) : 0,
                payment_type: 'deposit',
                is_escrow: true,
                product_category: product.category
              },
              new_balance: buyerWallet?.balance,
              payment_method: 'wallet',
              reference: `DEP-${orderData.id.slice(0, 8)}`,
              source: 'marketplace',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (buyerTxError) throw buyerTxError;

          // Add deposit to admin wallet (escrow)
          const { error: adminWalletError } = await supabase
            .from("wallets")
            .update({ 
              balance: supabase.raw(`balance + ${totalDepositAmount}`),
              updated_at: new Date().toISOString()
            })
            .eq("user_id", ADMIN_ID);

          if (adminWalletError) throw adminWalletError;

          // Get admin's new balance
          const { data: adminWallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", ADMIN_ID)
            .single();

          // Record admin escrow transaction
          const { error: adminTxError } = await supabase
            .from("wallet_transactions")
            .insert({
              user_id: ADMIN_ID,
              type: 'escrow_receive',
              amount: totalDepositAmount,
              gross_amount: totalDepositAmount,
              commission_paid: 0,
              status: 'completed',
              order_id: orderData.id,
              buyer_id: user.id,
              seller_id: product.owner_id,
              product_id: product.id,
              description: `Escrow deposit for order ${orderData.id.slice(0, 8)} - ${product.name}`,
              metadata: {
                order_id: orderData.id,
                product_name: product.name,
                deposit_amount: product.depositProduct,
                delivery_fee: deliveryMethod === "door" ? (deliveryFee / products.length) : 0,
                payment_type: 'escrow_deposit',
                admin_email: ADMIN_EMAIL,
                product_category: product.category
              },
              new_balance: adminWallet?.balance,
              payment_method: 'wallet',
              reference: `ESC-${orderData.id.slice(0, 8)}`,
              source: 'marketplace',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (adminTxError) throw adminTxError;

          // Remove from cart
          await supabase
            .from("cart_items")
            .delete()
            .eq("id", product.cartItemId);
        }

        toast.dismiss(loadingToast);
        toast.success(`${createdOrders.length} orders created successfully!`);
        
      } else {
        // Single product checkout
        const product = productTotals[0];
        
        // First calculate commission
        const { data: commissionData, error: commissionError } = await supabase
          .rpc('calculate_order_commission', {
            p_product_id: product.id,
            p_total_amount: totalOrder
          });

        if (commissionError) throw commissionError;

        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID
        };

        // Create order
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
            delivery_location: deliveryAddress,
            buyer_phone: contactPhone,
            payment_method: "wallet",
            deposit_amount: totalDeposit,
            deposit_paid: true,
            balance_due: balanceDue,
            delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
            delivery_distance: deliveryDistance,
            delivery_zone: deliveryBreakdown?.zone,
            delivery_base_fee: deliveryBreakdown?.baseFee,
            delivery_rate_per_km: deliveryBreakdown?.rate,
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            status: "deposit_paid",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            metadata: {
              is_flash_sale: isFlashSale,
              flash_sale_ends_at: isFlashSale ? flashSaleEndsAt : null,
              original_price: isFlashSale ? originalPrice : null,
              delivery_speed: deliverySpeed,
              fragile,
              admin_email: commission.admin_email,
              admin_id: commission.admin_id,
              delivery_breakdown: deliveryBreakdown
            }
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // ===== RECORD DEPOSIT IN WALLET TRANSACTIONS =====
        // Calculate total deposit amount (product deposit + delivery fee if applicable)
        const totalDepositAmount = totalDeposit + (deliveryMethod === "door" ? deliveryFee : 0);

        // Deduct deposit from buyer's wallet
        const { error: buyerWalletError } = await supabase
          .from("wallets")
          .update({ 
            balance: supabase.raw(`balance - ${totalDepositAmount}`),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (buyerWalletError) throw buyerWalletError;

        // Get buyer's new balance
        const { data: buyerWallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        // Record buyer's deposit transaction
        const { error: buyerTxError } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: user.id,
            type: 'purchase',
            amount: totalDepositAmount,
            gross_amount: totalDepositAmount,
            commission_paid: 0,
            status: 'completed',
            order_id: orderData.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            product_id: product.id,
            description: `Deposit payment for order ${orderData.id.slice(0, 8)} - ${product.name}`,
            metadata: {
              order_id: orderData.id,
              product_name: product.name,
              deposit_amount: totalDeposit,
              delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
              payment_type: 'deposit',
              is_escrow: true,
              product_category: product.category
            },
            new_balance: buyerWallet?.balance,
            payment_method: 'wallet',
            reference: `DEP-${orderData.id.slice(0, 8)}`,
            source: 'marketplace',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (buyerTxError) throw buyerTxError;

        // Add deposit to admin wallet (escrow)
        const { error: adminWalletError } = await supabase
          .from("wallets")
          .update({ 
            balance: supabase.raw(`balance + ${totalDepositAmount}`),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", ADMIN_ID);

        if (adminWalletError) throw adminWalletError;

        // Get admin's new balance
        const { data: adminWallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", ADMIN_ID)
          .single();

        // Record admin escrow transaction
        const { error: adminTxError } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: ADMIN_ID,
            type: 'escrow_receive',
            amount: totalDepositAmount,
            gross_amount: totalDepositAmount,
            commission_paid: 0,
            status: 'completed',
            order_id: orderData.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            product_id: product.id,
            description: `Escrow deposit for order ${orderData.id.slice(0, 8)} - ${product.name}`,
            metadata: {
              order_id: orderData.id,
              product_name: product.name,
              deposit_amount: totalDeposit,
              delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
              payment_type: 'escrow_deposit',
              admin_email: ADMIN_EMAIL,
              product_category: product.category
            },
            new_balance: adminWallet?.balance,
            payment_method: 'wallet',
            reference: `ESC-${orderData.id.slice(0, 8)}`,
            source: 'marketplace',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (adminTxError) throw adminTxError;

        // Process delivery payment if door delivery
        if (deliveryMethod === "door" && deliveryFee > 0) {
          try {
            await supabase
              .rpc("process_delivery_payment", {
                p_order_id: orderData.id,
                p_delivery_fee: deliveryDistance,
                p_delivery_type: seller?.delivery_type || 'omniflow-managed'
              });
          } catch (deliveryError) {
            console.warn("Delivery payment processing failed:", deliveryError);
            // Don't throw - order is already created
          }
        }

        toast.dismiss(loadingToast);
        toast.success(
          <div>
            <strong>{isFlashSale ? "Flash deal secured!" : "Order created successfully!"}</strong>
            <br />
            <small>Deposit of {formatKSH(totalDepositAmount)} held in escrow</small>
          </div>
        );
      }

      navigate("/orders");
    } catch (err) {
      console.error("Wallet payment error:", err);
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
    if (!deliveryAddress && deliveryMethod === "door") return toast.error("Please enter a delivery address");

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

          const payload = {
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.owner_id,
            variant: product.variant || null,
            quantity: product.quantity,
            price_paid: 0,
            total_price: product.productPrice,
            store_id: product.store_id || null,
            delivery_method: deliveryMethod,
            delivery_location: deliveryAddress,
            buyer_phone: contactPhone,
            payment_method: method,
            deposit_amount: product.depositProduct,
            deposit_paid: false,
            balance_due: product.productPrice - product.depositProduct,
            delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
            delivery_distance: deliveryDistance,
            delivery_zone: deliveryBreakdown?.zone,
            delivery_base_fee: deliveryBreakdown?.baseFee,
            delivery_rate_per_km: deliveryBreakdown?.rate,
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            status: "pending",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            metadata: {
              delivery_speed: deliverySpeed,
              fragile,
              from_cart: true,
              is_flash_sale: false,
              admin_email: commission.admin_email,
              admin_id: commission.admin_id,
              delivery_distance: deliveryDistance,
              delivery_type: seller?.delivery_type || 'omniflow-managed',
              delivery_breakdown: deliveryBreakdown
            }
          };

          const { error } = await supabase.from("orders").insert([payload]);
          if (error) throw error;

          await supabase
            .from("cart_items")
            .delete()
            .eq("id", product.cartItemId);
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

        const payload = {
          product_id: product.id,
          buyer_id: user.id,
          seller_id: product.owner_id,
          variant: product.variant || null,
          quantity: product.quantity,
          price_paid: 0,
          total_price: totalOrder,
          store_id: product.store_id || null,
          delivery_method: deliveryMethod,
          delivery_location: deliveryAddress,
          buyer_phone: contactPhone,
          payment_method: method,
          deposit_amount: totalDeposit,
          deposit_paid: false,
          balance_due: balanceDue,
          delivery_fee: deliveryMethod === "door" ? deliveryFee : 0,
          delivery_distance: deliveryDistance,
          delivery_zone: deliveryBreakdown?.zone,
          delivery_base_fee: deliveryBreakdown?.baseFee,
          delivery_rate_per_km: deliveryBreakdown?.rate,
          commission_rate: commission.commission_rate,
          commission_amount: commission.commission_amount,
          status: "pending",
          delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          metadata: {
            delivery_speed: deliverySpeed,
            fragile,
            is_flash_sale: isFlashSale,
            flash_sale_ends_at: isFlashSale ? flashSaleEndsAt : null,
            original_price: isFlashSale ? originalPrice : null,
            admin_email: commission.admin_email,
            admin_id: commission.admin_id,
            delivery_distance: deliveryDistance,
            delivery_type: seller?.delivery_type || 'omniflow-managed',
            delivery_breakdown: deliveryBreakdown
          }
        };

        const { error } = await supabase.from("orders").insert([payload]);
        if (error) throw error;
      }

      toast.dismiss(loadingToast);
      toast.success(
        isFlashSale 
          ? "Flash deal secured! Complete payment externally" 
          : "Pending order created — complete payment externally"
      );
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
    if (!deliveryAddress && deliveryMethod === "door") return toast.error("Please enter a delivery address");
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

      const { data, error } = await supabase.rpc("start_installment_order", {
        p_buyer: user.id,
        p_product: product.id,
        p_variant: variantPayload,
        p_quantity: product.quantity,
        p_delivery_method: deliveryMethod,
        p_delivery_location: deliveryAddress,
        p_contact_phone: contactPhone,
      });

      if (error) throw error;

      const instOrderId = typeof data === "string" ? data : data?.id;

      toast.dismiss(dismiss);
      toast.success("Installment plan started ✅ Initial payment secured in escrow");
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
                        <span className="original-price-value">KSH {product.originalPrice?.toLocaleString() || product.price.toLocaleString()}</span>
                      </div>
                      <div className="flash-price-line">
                        <span className="flash-price-label">Flash Sale:</span>
                        <span className="flash-price-value">KSH {product.unitPrice.toLocaleString()} × {product.quantity}</span>
                      </div>
                    </div>
                  )}
                  
                  {!isFlashSale && (
                    <div className="product-pricing">
                      <span>KSH {product.unitPrice.toLocaleString()} × {product.quantity}</span>
                      <strong>KSH {product.productPrice.toLocaleString()}</strong>
                    </div>
                  )}
                  
                  <div className="stock-info">
                    {product.stock_quantity > 0 ? (
                      <span className="in-stock">{product.stock_quantity} in stock</span>
                    ) : (
                      <span className="out-of-stock">Out of stock</span>
                    )}
                    {isFlashSale && product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                      <span className="low-stock-warning">Selling fast!</span>
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
                    Terms: {products[0].installment_plan?.terms || "See seller terms"}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Flash Sale Notice */}
          {isFlashSale && products[0]?.installment_plan && (
            <div className="flash-sale-notice" style={{ marginBottom: 16 }}>
              <p>
                <FaClock style={{ marginRight: '8px', color: '#FF6B35' }} />
                <strong>Note:</strong> Installment plans are not available for flash sale items.
                Complete purchase now to secure this limited-time offer.
              </p>
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

            {/* Address Input - Only for door delivery */}
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
                    
                    {isSearching && (
                      <div className="search-loading">Searching Kenyan addresses...</div>
                    )}
                    
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
                  <small className="address-help-text">
                    Start typing to see precise Kenyan address suggestions
                  </small>
                </label>

                {/* Delivery Type Indicator */}
                {seller?.delivery_type && (
                  <div className="delivery-type-indicator" style={{
                    marginTop: '4px',
                    marginBottom: '8px',
                    fontSize: '0.85em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: seller.delivery_type === 'self-delivery' ? '#f59e0b' : '#667eea'
                  }}>
                    {seller.delivery_type === 'self-delivery' ? (
                      <>
                        <FaStore size={12} />
                        <span>This seller uses their own delivery service</span>
                      </>
                    ) : (
                      <>
                        <FaMotorcycle size={12} />
                        <span>Omniflow managed delivery</span>
                      </>
                    )}
                  </div>
                )}

                {/* Simple delivery fee display */}
                <div className="delivery-fee-display" style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>Delivery fee:</span>
                    {deliveryCalculating ? (
                      <span style={{ color: '#666' }}>Calculating...</span>
                    ) : deliveryDistance ? (
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: '1.1em',
                        color: isFreeDelivery ? '#10B981' : '#667eea' 
                      }}>
                        {isFreeDelivery ? 'FREE' : `KSH ${deliveryFee.toFixed(2)}`}
                      </span>
                    ) : deliveryAddress ? (
                      <span style={{ color: '#f59e0b' }}>Could not calculate</span>
                    ) : (
                      <span style={{ color: '#666' }}>Enter address</span>
                    )}
                  </div>
                  
                  {deliveryBreakdown && !isFreeDelivery && (
                    <div style={{
                      fontSize: '0.85em',
                      color: '#666',
                      borderTop: '1px dashed #ddd',
                      marginTop: '4px',
                      paddingTop: '4px'
                    }}>
                      <div>Zone {deliveryBreakdown.zone?.replace('zone', '')}: {deliveryBreakdown.rate} KSH/km</div>
                      <div>Distance: {deliveryBreakdown.distance} km</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {deliveryMethod === "door" && (
              <>
                <label>
                  Delivery speed:
                  <select
                    value={deliverySpeed}
                    onChange={(e) => setDeliverySpeed(e.target.value)}
                  >
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                  </select>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={fragile}
                    onChange={(e) => setFragile(e.target.checked)}
                  />
                  Fragile item
                </label>
              </>
            )}

            <label>
              Contact phone:
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="07..."
              />
            </label>
          </div>

          {/* Installment Payment */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <div className="installment-section" style={{ marginTop: 12 }}>
              <h4>Buy in Installments</h4>
              <div className="installment-details">
                <p>
                  Initial payment: <strong>{(products[0].installment_plan.initial_percent || 0.3) * 100}%</strong> (
                  <strong>KSH {( (productTotals[0].unitPrice * productTotals[0].quantity) * (products[0].installment_plan.initial_percent || 0.3) ).toFixed(2)}</strong>)
                </p>
                <p>Installment schedule:</p>
                <ul>
                  {(products[0].installment_plan.installments || []).map((it, idx) => (
                    <li key={idx}>
                      {it.percent}% after {it.due_in_days} days
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={handleStartInstallment}
                    disabled={processingInstallment || (deliveryMethod === "door" && !deliveryAddress)}
                    className="wallet"
                    style={{ marginRight: 8 }}
                  >
                    Start Installment Plan (Pay Initial)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT SECTION */}
          <div className="payment-methods" style={{ marginTop: 16 }}>
            <h4>Payment</h4>
            <div className="price-breakdown">
              {isFlashSale && (
                <div className="flash-sale-savings">
                  <span>Flash Sale Savings:</span>
                  <strong style={{ color: '#10B981' }}>
                    -KSH {productTotals[0]?.originalPrice 
                      ? ((productTotals[0].originalPrice - productTotals[0].unitPrice) * productTotals[0].quantity).toLocaleString()
                      : '0'}
                  </strong>
                </div>
              )}
              <div>
                <span>Product{products.length > 1 ? 's' : ''} total:</span>
                <strong>KSH {totalProductPrice.toLocaleString()}</strong>
              </div>
              {deliveryMethod === "door" && (
                <div>
                  <span>Delivery fee:</span>
                  <strong>
                    {isFreeDelivery ? (
                      <span style={{ color: '#10B981' }}>FREE</span>
                    ) : (
                      `KSH ${deliveryFee.toFixed(2)}`
                    )}
                  </strong>
                </div>
              )}
              <div>
                <span>Total:</span>
                <strong>KSH {(totalProductPrice + (deliveryMethod === "door" && !isFreeDelivery ? deliveryFee : 0)).toFixed(2)}</strong>
              </div>
              <div className="separator" />
              <div>
                <span>Deposit ({depositPercent * 100}%):</span>
                <strong>KSH {totalDeposit.toFixed(2)}</strong>
              </div>
              <div>
                <span>Deposit + Delivery:</span>
                <strong>KSH {(totalDeposit + (deliveryMethod === "door" && !isFreeDelivery ? deliveryFee : 0)).toFixed(2)}</strong>
              </div>
              <div>
                <span>Balance Due:</span>
                <strong>KSH {balanceDue.toFixed(2)}</strong>
              </div>
            </div>

            <div className="methods">
              <button 
                className="wallet" 
                onClick={handlePayWithWallet} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress)}
              >
                <FaWallet /> 
                {isFlashSale ? "Secure Flash Deal with Wallet" : "Pay deposit with Wallet"}
              </button>

              <button 
                className="mpesa" 
                onClick={() => handlePayExternal("mpesa")} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress)}
              >
                <FaMobileAlt /> 
                {isFlashSale ? "Secure Flash Deal via M-Pesa" : "Pay deposit via M-Pesa"}
              </button>

              <button 
                className="paypal" 
                onClick={() => handlePayExternal("paypal")} 
                disabled={buying || (deliveryMethod === "door" && !deliveryAddress)}
              >
                <FaPaypal /> 
                {isFlashSale ? "Secure Flash Deal via PayPal" : "Pay via PayPal"}
              </button>
            </div>

            <p className="muted">
              {isFlashSale ? (
                <>
                  <strong>⚠️ Flash Sale Notice:</strong> Complete payment within the time limit to secure this exclusive price. 
                  The remaining balance is paid on delivery.
                </>
              ) : (
                "Note: you pay the deposit now + delivery fee. Remaining amount is paid on delivery (cash or as seller agrees)."
              )}
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
                    {isFlashSale && product.originalPrice && (
                      <div style={{ fontSize: '0.85em', color: '#888', textDecoration: 'line-through' }}>
                        Was: KSH {(product.originalPrice * product.quantity).toLocaleString()}
                      </div>
                    )}
                    <div style={{ 
                      color: isFlashSale ? '#FF6B35' : 'inherit',
                      fontWeight: isFlashSale ? 700 : 'normal'
                    }}>
                      KSH {product.productPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="summary-details">
              <div>Delivery: {deliveryMethod || "—"}</div>
              {deliveryMethod === "door" && (
                <div>Address: {deliveryAddress ? "✓ Selected" : "—"}</div>
              )}
              <div>Shipping: 
                {deliveryMethod === "door" ? (
                  isFreeDelivery ? 'FREE' : `KSH ${deliveryFee.toFixed(2)}`
                ) : (
                  "KSH 0.00"
                )}
              </div>
              
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', fontWeight: 700 }}>
                Pay now: KSH {(totalDeposit + (deliveryMethod === "door" && !isFreeDelivery ? deliveryFee : 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                Balance due: KSH {balanceDue.toFixed(2)}
              </div>
              
              {isFlashSale && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  background: '#FFF5F0', 
                  borderRadius: 6,
                  fontSize: '0.85em',
                  color: '#FF6B35'
                }}>
                  ⚡ Flash sale price locked in
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}