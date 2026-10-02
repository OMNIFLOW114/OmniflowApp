// src/pages/Checkout.jsx - GOOGLE PLACES (NEW) + ROUTES ROUTEMATRIX
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
  FaArrowLeft,
  FaSpinner,
  FaPercent,
  FaInfoCircle,
  FaPlus,
  FaMinus,
  FaHistory,
} from "react-icons/fa";
import styles from "./Checkout.module.css";

// ============================================================
// GOOGLE MAPS CONFIG
// ============================================================
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LAST_ADDRESS_KEY = "omniflow_last_delivery_address";

if (GOOGLE_MAPS_API_KEY) {
  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
    libraries: ["places", "routes"], // routes = RouteMatrixService
  });
}

// ============================================================
// HELPERS
// ============================================================
const formatKSH = (amount) => {
  const num = Number(amount || 0);
  if (Number.isInteger(num) || num % 1 === 0) {
    return `KSh ${num.toLocaleString("en-KE")}`;
  }
  return `KSh ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getDeliveryOptions = (product) => {
  if (!product || !product.delivery_methods) {
    return { offersPickup: false, offersDoor: false };
  }
  const dm = product.delivery_methods;
  const offersPickup =
    dm.pickup === "Yes" ||
    dm.pickup === true ||
    dm.pickup === "true" ||
    (typeof dm.pickup === "string" && dm.pickup.toLowerCase() === "yes");
  const offersDoor =
    dm.door === "Yes" ||
    dm.door === true ||
    dm.door === "true" ||
    (typeof dm.door === "string" && dm.door.toLowerCase() === "yes");
  return { offersPickup, offersDoor };
};

// ============================================================
// SKELETON
// ============================================================
const CheckoutSkeleton = () => {
  const { darkMode } = useDarkMode();
  return (
    <div
      className={`${styles.container} ${
        darkMode ? styles.darkMode : styles.lightMode
      }`}
    >
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonBackBtn}></div>
        <div className={styles.skeletonTitle}></div>
      </div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLeft}>
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useDarkMode();
  const location = useLocation();

  const {
    initiateWalletDeposit,
    loading: mpesaLoading,
    cancelPolling,
  } = useMpesaPayment();

  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [storeDeliverySettings, setStoreDeliverySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null);

  // Flash sale
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashSaleEndsAt, setFlashSaleEndsAt] = useState(null);
  const [flashSaleTimeLeft, setFlashSaleTimeLeft] = useState("");
  const [originalPrice, setOriginalPrice] = useState(null);

  // Checkout
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [buying, setBuying] = useState(false);
  const [pickupStation, setPickupStation] = useState("");

  // Google Places
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

  // M-Pesa
  const [mpesaPaymentStep, setMpesaPaymentStep] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [paymentCheckoutId, setPaymentCheckoutId] = useState(null);

  // Installments
  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  const fromCart = location.state?.fromCart;
  const fromFlashSale = location.state?.fromFlashSale;

  const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";
  const ADMIN_EMAIL = "omniflow718@gmail.com";

  // ============================================================
  // LOAD PLACES
  // ============================================================
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error(
        "[Checkout] Missing VITE_GOOGLE_MAPS_API_KEY in .env — address autocomplete disabled"
      );
      return;
    }
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
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // WALLET HELPER
  // ============================================================
  const updateWalletBalance = async (userId, amount, operation) => {
    try {
      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentBalance = 0;
      if (wallet) currentBalance = wallet.balance || 0;

      const newBalance =
        operation === "subtract" ? currentBalance - amount : currentBalance + amount;

      if (operation === "subtract" && newBalance < 0) {
        throw new Error("Insufficient balance");
      }

      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;
      return newBalance;
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  };

  // ============================================================
  // TOTALS
  // ============================================================
  const productTotals = useMemo(() => {
    return products.map((product) => {
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

  const totalProductPrice = useMemo(
    () => productTotals.reduce((sum, item) => sum + item.productPrice, 0),
    [productTotals]
  );

  const totalDeposit = useMemo(
    () => productTotals.reduce((sum, item) => sum + item.depositProduct, 0),
    [productTotals]
  );

  const calculateDeliveryFeeFromStore = useCallback((distance, storeSettings) => {
    if (!distance || distance <= 0) return 0;
    if (!storeSettings) return 0;

    if (storeSettings.delivery_type === "self-delivery") {
      const baseFee = Number(storeSettings.delivery_base_fee) || 100;
      const ratePerKm = Number(storeSettings.delivery_rate_per_km) || 15;
      return Math.round(baseFee + distance * ratePerKm);
    }

    const DELIVERY_RATES = {
      BASE_FEE: 50,
      ZONES: [
        { maxDistance: 10, ratePerKm: 15 },
        { maxDistance: 50, ratePerKm: 10 },
        { maxDistance: Infinity, ratePerKm: 7 },
      ],
    };

    let zoneRate = DELIVERY_RATES.ZONES[2].ratePerKm;
    if (distance <= DELIVERY_RATES.ZONES[0].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[0].ratePerKm;
    } else if (distance <= DELIVERY_RATES.ZONES[1].maxDistance) {
      zoneRate = DELIVERY_RATES.ZONES[1].ratePerKm;
    }
    return Math.round(DELIVERY_RATES.BASE_FEE + distance * zoneRate);
  }, []);

  const deliveryFee = useMemo(() => {
    if (!deliveryDistance || deliveryMethod !== "door") return 0;
    return calculateDeliveryFeeFromStore(deliveryDistance, storeDeliverySettings);
  }, [deliveryDistance, deliveryMethod, storeDeliverySettings, calculateDeliveryFeeFromStore]);

  const FREE_DELIVERY_THRESHOLD = 5000;
  const isFreeDelivery = useMemo(() => {
    if (storeDeliverySettings?.delivery_type === "self-delivery") return false;
    return totalProductPrice >= FREE_DELIVERY_THRESHOLD;
  }, [totalProductPrice, storeDeliverySettings]);

  const finalDeliveryFee = useMemo(
    () => (isFreeDelivery ? 0 : deliveryFee),
    [isFreeDelivery, deliveryFee]
  );
  const depositTotal = useMemo(
    () =>
      +(totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2),
    [totalDeposit, finalDeliveryFee, deliveryMethod]
  );
  const balanceDue = useMemo(
    () => +(totalProductPrice - totalDeposit).toFixed(2),
    [totalProductPrice, totalDeposit]
  );
  const totalOrder = useMemo(
    () =>
      +(totalProductPrice + (deliveryMethod === "door" ? finalDeliveryFee : 0)).toFixed(2),
    [totalProductPrice, finalDeliveryFee, deliveryMethod]
  );

  // ============================================================
  // FLASH SALE TIMER
  // ============================================================
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

// ============================================================
// ROUTE MATRIX — Calculate driving distance
// ============================================================
const calculateDistance = useCallback(
  async (fromCoords, destLatLng) => {
    if (!fromCoords || !destLatLng) return null;
    if (!GOOGLE_MAPS_API_KEY) return null;

    setDeliveryCalculating(true);
    try {
      const routesLib = await importLibrary("routes");
      const RouteMatrix = routesLib.RouteMatrix;
      const { LatLng } = await importLibrary("core");

      if (!RouteMatrix || !LatLng) {
        console.error("[Checkout] RouteMatrix or LatLng not available");
        return null;
      }

      // Seller origin: [lng, lat] → LatLng(lat, lng)
      const origin = new LatLng(fromCoords[1], fromCoords[0]);
      // Delivery destination: {lat, lng} → LatLng(lat, lng)
      const destination = new LatLng(destLatLng.lat, destLatLng.lng);

      // IMPORTANT: computeRouteMatrix returns a Promise<{matrix: RouteMatrix}>
      const response = await RouteMatrix.computeRouteMatrix({
        origins: [origin],
        destinations: [destination],
        travelMode: "DRIVING",
        routingPreference: "TRAFFIC_UNAWARE",
        // Include 'condition' and 'distanceMeters' in fields
        fields: ["distanceMeters", "condition"],
      });

      // Access the nested structure correctly
      const matrix = response?.matrix;
      const row = matrix?.rows?.[0];
      const item = row?.items?.[0];

      if (!item) {
        console.warn("[Checkout] No route matrix item returned");
        return null;
      }

      // Check the condition to ensure route exists
      if (item.condition !== "ROUTE_EXISTS") {
        console.warn(
          "[Checkout] RouteMatrix condition:",
          item.condition,
          "— no route found"
        );
        return null;
      }

      const distanceMeters = item.distanceMeters;
      if (typeof distanceMeters !== "number" || distanceMeters <= 0) {
        console.warn("[Checkout] Invalid distanceMeters:", distanceMeters);
        return null;
      }

      const distanceKm = distanceMeters / 1000;

      if (storeDeliverySettings?.delivery_type === "self-delivery") {
        const baseFee = Number(storeDeliverySettings.delivery_base_fee) || 100;
        const ratePerKm = Number(storeDeliverySettings.delivery_rate_per_km) || 15;
        setDeliveryBreakdown({
          distance: distanceKm.toFixed(1),
          type: "self-delivery",
          baseFee,
          ratePerKm,
          total: Math.round(baseFee + distanceKm * ratePerKm),
        });
      } else {
        const DELIVERY_RATES = {
          BASE_FEE: 50,
          ZONES: [
            { maxDistance: 10, ratePerKm: 15 },
            { maxDistance: 50, ratePerKm: 10 },
            { maxDistance: Infinity, ratePerKm: 7 },
          ],
        };
        let rate = DELIVERY_RATES.ZONES[2].ratePerKm;
        let zone = "zone3";
        if (distanceKm <= DELIVERY_RATES.ZONES[0].maxDistance) {
          rate = DELIVERY_RATES.ZONES[0].ratePerKm;
          zone = "zone1";
        } else if (distanceKm <= DELIVERY_RATES.ZONES[1].maxDistance) {
          rate = DELIVERY_RATES.ZONES[1].ratePerKm;
          zone = "zone2";
        }
        setDeliveryBreakdown({
          distance: distanceKm.toFixed(1),
          type: "omniflow-managed",
          zone,
          rate,
          baseFee: DELIVERY_RATES.BASE_FEE,
          total: Math.round(DELIVERY_RATES.BASE_FEE + distanceKm * rate),
        });
      }
      return distanceKm;
    } catch (error) {
      console.error("[Checkout] Route Matrix error:", error);
      return null;
    } finally {
      setDeliveryCalculating(false);
    }
  },
  [storeDeliverySettings]
);

  useEffect(() => {
    async function updateDistance() {
      if (
        !selectedLocation ||
        !seller?.location_coords ||
        fromCart ||
        deliveryMethod !== "door"
      )
        return;

      const distance = await calculateDistance(
        seller.location_coords,
        selectedLocation
      );
      setDeliveryDistance(distance);

      if (distance) {
        const maxRadius = storeDeliverySettings?.delivery_coverage_radius || 100;
        if (distance > maxRadius) {
          toast.error(
            `Delivery address is beyond the seller's ${maxRadius}km service radius`
          );
          setDeliveryDistance(null);
        }
      }
    }
    updateDistance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, seller, deliveryMethod, storeDeliverySettings, fromCart]);

  // ============================================================
  // GOOGLE PLACES AUTOCOMPLETE
  // ============================================================
  const fetchSuggestions = useCallback(async (input) => {
    if (!placesLibRef.current) return;
    if (!input || input.trim().length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    const requestId = ++autocompleteRequestIdRef.current;

    try {
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        placesLibRef.current;

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      const request = {
        input: input.trim(),
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ["ke"],
        language: "en",
      };

      const { suggestions } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (requestId !== autocompleteRequestIdRef.current) return;

      const mapped = (suggestions || []).slice(0, 6).map((s) => {
        const p = s.placePrediction;
        return {
          placeId: p.placeId,
          mainText: p.mainText?.text || p.text?.text || "",
          secondaryText: p.secondaryText?.text || "",
          fullText: p.text?.text || "",
          raw: p,
        };
      });

      setAddressSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch (err) {
      console.error("[Checkout] Autocomplete error:", err);
      if (requestId === autocompleteRequestIdRef.current) {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      if (requestId === autocompleteRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    setSelectedLocation(null);
    setDeliveryDistance(null);
    setDeliveryBreakdown(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 250);
  };

  const handleAddressSelect = async (suggestion) => {
    try {
      setDeliveryAddress(suggestion.fullText || suggestion.mainText);
      setShowSuggestions(false);
      setAddressSuggestions([]);

      const place = suggestion.raw?.toPlace?.();
      if (!place) return;

      await place.fetchFields({
        fields: ["formattedAddress", "location", "displayName"],
      });

      const loc = place.location;
      const finalAddress = place.formattedAddress || suggestion.fullText;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;

      if (typeof lat !== "number" || typeof lng !== "number") {
        console.warn("[Checkout] No coordinates returned for place");
        return;
      }

      setDeliveryAddress(finalAddress);
      setSelectedLocation({ lat, lng });

      const saved = {
        address: finalAddress,
        lat,
        lng,
        placeId: place.id || suggestion.placeId,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(LAST_ADDRESS_KEY, JSON.stringify(saved));
      } catch (_) {}

      if (placesLibRef.current) {
        const { AutocompleteSessionToken } = placesLibRef.current;
        sessionTokenRef.current = new AutocompleteSessionToken();
      }
    } catch (err) {
      console.error("[Checkout] Place details error:", err);
      toast.error("Failed to load address details. Please try again.");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ADDRESS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.address && typeof parsed.lat === "number") {
        setSavedAddress(parsed);
      }
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
      if (
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ============================================================
  // LOAD CHECKOUT DATA
  // ============================================================
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!user?.id) {
          toast.error("Please login to proceed to checkout");
          navigate("/login");
          return;
        }

        // ---- FLASH SALE ----
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
            quantity: 1,
          };
          setProducts([productWithFlashPrice]);

          const { data: store } = await supabase
            .from("stores")
            .select(
              "id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county"
            )
            .eq("owner_id", flashProduct.owner_id)
            .maybeSingle();

          if (store) {
            setSeller({
              ...store,
              location_coords:
                store.location_lat && store.location_lng
                  ? [store.location_lng, store.location_lat]
                  : null,
            });
            setStoreDeliverySettings({
              delivery_type: store.delivery_type,
              has_delivery_fleet: store.has_delivery_fleet,
              delivery_fleet_size: store.delivery_fleet_size,
              delivery_coverage_radius: store.delivery_coverage_radius,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              county: store.county,
            });
          }

          const { offersPickup, offersDoor } = getDeliveryOptions(flashProduct);
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          setLoading(false);
          return;
        }

        // ---- CART ----
        if (fromCart && location.state?.cartItems) {
          const cartItems = location.state.cartItems;
          const enhancedProducts = cartItems.map((item) => ({
            ...item.products,
            cartItemId: item.id,
            quantity: item.quantity,
            variant: item.variant,
            delivery_methods: item.products.delivery_methods || {
              pickup: "Yes",
              door: "Yes",
            },
          }));
          setProducts(enhancedProducts);

          if (location.state.seller) {
            setSeller(location.state.seller);
            const { data: storeSettings } = await supabase
              .from("stores")
              .select(
                "delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county"
              )
              .eq("owner_id", location.state.seller.owner_id)
              .maybeSingle();
            if (storeSettings) setStoreDeliverySettings(storeSettings);
          }

          const firstItem = cartItems[0];
          if (firstItem && firstItem.products) {
            const { offersPickup, offersDoor } = getDeliveryOptions(
              firstItem.products
            );
            setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          }
        } else {
          // ---- SINGLE PRODUCT ----
          let p = location.state?.product || null;
          if (!p) {
            const { data, error } = await supabase
              .from("products")
              .select(
                `*, delivery_methods, image_gallery, discount, installment_plan, variants, variant_options, price, description, store_id, metadata, stock_quantity`
              )
              .eq("id", productId)
              .single();
            if (error) throw error;
            p = data;
          }
          if (!p.delivery_methods) {
            p.delivery_methods = { pickup: "Yes", door: "Yes" };
          }
          setProducts([{ ...p, quantity: 1 }]);

          const { data: store } = await supabase
            .from("stores")
            .select(
              "id, name, contact_phone, location, location_lat, location_lng, owner_id, delivery_type, has_delivery_fleet, delivery_fleet_size, delivery_coverage_radius, delivery_base_fee, delivery_rate_per_km, county"
            )
            .eq("owner_id", p.owner_id)
            .maybeSingle();

          if (store) {
            setSeller({
              ...store,
              location_coords:
                store.location_lat && store.location_lng
                  ? [store.location_lng, store.location_lat]
                  : null,
            });
            setStoreDeliverySettings({
              delivery_type: store.delivery_type,
              has_delivery_fleet: store.has_delivery_fleet,
              delivery_fleet_size: store.delivery_fleet_size,
              delivery_coverage_radius: store.delivery_coverage_radius,
              delivery_base_fee: store.delivery_base_fee,
              delivery_rate_per_km: store.delivery_rate_per_km,
              county: store.county,
            });
          }

          const { offersPickup, offersDoor } = getDeliveryOptions(p);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, location.state, user, fromCart, fromFlashSale, navigate]);

  // ============================================================
  // QUANTITY
  // ============================================================
  const handleIncrement = useCallback((productId) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          const maxQuantity = product.stock_quantity || 999;
          const newQuantity = Math.min(product.quantity + 1, maxQuantity);
          return { ...product, quantity: newQuantity };
        }
        return product;
      })
    );
  }, []);

  const handleDecrement = useCallback((productId) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === productId) {
          const newQuantity = Math.max(product.quantity - 1, 1);
          return { ...product, quantity: newQuantity };
        }
        return product;
      })
    );
  }, []);

  // ============================================================
  // M-PESA PAYMENT
  // ============================================================
  const handleMpesaPayment = async () => {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone number");
    if (deliveryMethod === "door" && !deliveryAddress)
      return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation)
      return toast.error("Please enter pickup station address");

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

    const outOfStock = products.some(
      (product) => product.stock_quantity < product.quantity
    );
    if (outOfStock) return toast.error("Some items are out of stock");

    setBuying(true);
    setMpesaPaymentStep(2);
    const loadingToast = toast.loading("Initiating M-Pesa payment...");

    try {
      const deliveryLocation =
        deliveryMethod === "door" ? deliveryAddress : pickupStation;
      const totalDepositAmount = depositTotal;

      let orderId = null;

      if (fromCart) {
        const createdOrders = [];
        for (const product of productTotals) {
          const { data: commissionData } = await supabase.rpc(
            "calculate_order_commission",
            { p_product_id: product.id, p_total_amount: product.productPrice }
          );
          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID,
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
              delivery_fee:
                deliveryMethod === "door" ? finalDeliveryFee / products.length : 0,
              delivery_distance: deliveryDistance,
              status: "pending",
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              commission_rate: commission.commission_rate,
              commission_amount: commission.commission_amount,
              metadata: {
                is_flash_sale: isFlashSale,
                payment_type: "mpesa_pending",
                store_delivery_type: storeDeliverySettings?.delivery_type,
                delivery_lat: selectedLocation?.lat ?? null,
                delivery_lng: selectedLocation?.lng ?? null,
              },
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
        const { data: commissionData } = await supabase.rpc(
          "calculate_order_commission",
          { p_product_id: product.id, p_total_amount: totalOrder }
        );
        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID,
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
              payment_type: "mpesa_pending",
              store_delivery_type: storeDeliverySettings?.delivery_type,
              delivery_lat: selectedLocation?.lat ?? null,
              delivery_lng: selectedLocation?.lng ?? null,
            },
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
                deposit_amount_paid: paidAmount,
              },
            })
            .eq("id", orderId);

          await updateWalletBalance(ADMIN_ID, paidAmount, "add");
          await supabase.from("wallet_transactions").insert({
            user_id: ADMIN_ID,
            type: "escrow_receive",
            amount: paidAmount,
            status: "completed",
            order_id: orderId,
            description: `Escrow deposit for order ${orderId.slice(0, 8)} via M-Pesa`,
          });

          setMpesaPaymentStep(3);
          toast.success(`Payment successful! Amount: ${formatKSH(paidAmount)}`, {
            duration: 5000,
            icon: "✅",
          });

          setTimeout(() => navigate("/orders"), 3000);
        },
        (error) => {
          console.error("M-Pesa payment failed:", error);
          setMpesaPaymentStep(1);
          toast.error(`Payment failed: ${error}. Please try again.`);
          setBuying(false);
        }
      );

      setPaymentCheckoutId(result?.checkoutRequestID);
    } catch (err) {
      console.error("Checkout error:", err);
      toast.dismiss(loadingToast);
      toast.error(
        "Failed to create order: " + (err.message || "Please try again")
      );
      setMpesaPaymentStep(1);
      setBuying(false);
    }
  };

  // ============================================================
  // WALLET PAYMENT
  // ============================================================
  async function handlePayWithWallet() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress)
      return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation)
      return toast.error("Please enter pickup station address");

    const outOfStock = products.some(
      (product) => product.stock_quantity < product.quantity
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
      const deliveryLocation =
        deliveryMethod === "door" ? deliveryAddress : pickupStation;

      if (fromCart) {
        let createdOrders = [];
        for (const product of productTotals) {
          const { data: commissionData } = await supabase.rpc(
            "calculate_order_commission",
            { p_product_id: product.id, p_total_amount: product.productPrice }
          );
          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID,
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
              delivery_fee:
                deliveryMethod === "door" ? finalDeliveryFee / products.length : 0,
              delivery_distance: deliveryDistance,
              commission_rate: commission.commission_rate,
              commission_amount: commission.commission_amount,
              status: "deposit_paid",
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              delivered: false,
              escrow_released: false,
              metadata: {
                is_flash_sale: false,
                store_delivery_type: storeDeliverySettings?.delivery_type,
                pickup_station:
                  deliveryMethod === "pickup" ? pickupStation : null,
                delivery_lat: selectedLocation?.lat ?? null,
                delivery_lng: selectedLocation?.lng ?? null,
              },
            })
            .select()
            .single();

          if (orderError) throw orderError;
          createdOrders.push(orderData);

          const productDepositAmount =
            product.depositProduct +
            (deliveryMethod === "door"
              ? finalDeliveryFee / products.length
              : 0);

          const { data: paymentResult, error: paymentError } = await supabase.rpc(
            "pay_order_deposit",
            {
              p_order_id: orderData.id,
              p_buyer_id: user.id,
              p_amount: productDepositAmount,
            }
          );
          if (paymentError) throw paymentError;
          if (!paymentResult?.success)
            throw new Error(paymentResult?.error || "Payment failed");

          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }
        toast.dismiss(loadingToast);
        toast.success(
          `${createdOrders.length} orders created! 25% deposit held in escrow.`
        );
      } else {
        const product = productTotals[0];
        const { data: commissionData } = await supabase.rpc(
          "calculate_order_commission",
          { p_product_id: product.id, p_total_amount: totalOrder }
        );
        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID,
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
              store_delivery_type: storeDeliverySettings?.delivery_type,
              pickup_station: deliveryMethod === "pickup" ? pickupStation : null,
              delivery_lat: selectedLocation?.lat ?? null,
              delivery_lng: selectedLocation?.lng ?? null,
            },
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const totalDepositAmount =
          totalDeposit + (deliveryMethod === "door" ? finalDeliveryFee : 0);

        const { data: paymentResult, error: paymentError } = await supabase.rpc(
          "pay_order_deposit",
          {
            p_order_id: orderData.id,
            p_buyer_id: user.id,
            p_amount: totalDepositAmount,
          }
        );
        if (paymentError) throw paymentError;
        if (!paymentResult?.success)
          throw new Error(paymentResult?.error || "Payment failed");

        toast.dismiss(loadingToast);
        toast.success(
          <div>
            <strong>
              {isFlashSale ? "Flash deal secured!" : "Order created!"}
            </strong>
            <br />
            <small>
              25% deposit ({formatKSH(totalDepositAmount)}) held in escrow.
            </small>
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

  // ============================================================
  // EXTERNAL PAYMENT
  // ============================================================
  async function handlePayExternal(method) {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress)
      return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation)
      return toast.error("Please enter pickup station address");

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
      const deliveryLocation =
        deliveryMethod === "door" ? deliveryAddress : pickupStation;

      if (fromCart) {
        for (const product of productTotals) {
          const { data: commissionData } = await supabase.rpc(
            "calculate_order_commission",
            { p_product_id: product.id, p_total_amount: product.productPrice }
          );
          const commission = commissionData?.[0] || {
            commission_rate: 0.09,
            commission_amount: product.productPrice * 0.09,
            seller_amount: product.productPrice * 0.91,
            admin_email: ADMIN_EMAIL,
            admin_id: ADMIN_ID,
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
            delivery_fee:
              deliveryMethod === "door" ? finalDeliveryFee / products.length : 0,
            commission_rate: commission.commission_rate,
            commission_amount: commission.commission_amount,
            status: "pending",
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            metadata: { payment_type: "external_pending" },
          });
          if (product.cartItemId) {
            await supabase.from("cart_items").delete().eq("id", product.cartItemId);
          }
        }
      } else {
        const product = productTotals[0];
        const { data: commissionData } = await supabase.rpc(
          "calculate_order_commission",
          { p_product_id: product.id, p_total_amount: totalOrder }
        );
        const commission = commissionData?.[0] || {
          commission_rate: 0.09,
          commission_amount: totalOrder * 0.09,
          seller_amount: totalOrder * 0.91,
          admin_email: ADMIN_EMAIL,
          admin_id: ADMIN_ID,
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
          metadata: {
            is_flash_sale: isFlashSale,
            payment_type: "external_pending",
          },
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

  // ============================================================
  // INSTALLMENTS
  // ============================================================
  async function handleStartInstallment() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (deliveryMethod === "door" && !deliveryAddress)
      return toast.error("Please enter a delivery address");
    if (deliveryMethod === "pickup" && !pickupStation)
      return toast.error("Please enter pickup station address");
    if (!hasInstallmentPlan) return toast.error("Installments not available");
    if (fromCart && products.length > 1)
      return toast.error("Installments only available for single products");
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
      const deliveryLocation =
        deliveryMethod === "door" ? deliveryAddress : pickupStation;

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
  if (!products.length)
    return (
      <div
        className={`${styles.container} ${
          darkMode ? styles.darkMode : styles.lightMode
        }`}
      >
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛒</div>
          <h3>No products found</h3>
          <p>Your cart is empty or the product doesn't exist</p>
          <button
            onClick={() => navigate("/student/marketplace")}
            className={styles.emptyBtn}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );

  return (
    <div
      className={`${styles.container} ${
        darkMode ? styles.darkMode : styles.lightMode
      }`}
    >
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

      {/* M-Pesa modals */}
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
                  Please check your phone ({contactPhone}) and enter your M-Pesa PIN
                  to complete the payment of {formatKSH(depositTotal)}
                </p>
                {paymentCheckoutId && (
                  <p className={styles.referenceText}>
                    Reference: {paymentCheckoutId.slice(-8)}
                  </p>
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
          {/* ============================================================
              PRODUCT DETAILS SECTION (no card — full page section)
             ============================================================ */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>
                {fromCart ? `Ordering from ${seller?.name}` : "Product Details"}
              </h3>
              {isFlashSale && (
                <span className={styles.flashBadge}>
                  <FaBolt /> FLASH SALE
                </span>
              )}
            </div>

            {productTotals.map((product, index) => (
              <div key={product.id || index} className={styles.checkoutProduct}>
                <div className={styles.productImageWrap}>
                  <img
                    src={
                      product.image_gallery?.[0] ||
                      product.image_url ||
                      "/placeholder.jpg"
                    }
                    alt={product.name}
                    className={styles.productImage}
                  />
                </div>

                <div className={styles.productBody}>
                  <h4>{product.name}</h4>

                  {product.variant && (
                    <div className={styles.variantDisplay}>
                      Variant:{" "}
                      {typeof product.variant === "string"
                        ? product.variant
                        : JSON.stringify(product.variant)}
                    </div>
                  )}

                  {!fromCart && (
                    <div className={styles.productQuantityRow}>
                      <span className={styles.quantityLabel}>Quantity</span>
                      <div className={styles.quantityControls}>
                        <button
                          className={styles.quantityBtn}
                          onClick={() => handleDecrement(product.id)}
                          disabled={product.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <FaMinus />
                        </button>
                        <span className={styles.quantityDisplay}>
                          {product.quantity}
                        </span>
                        <button
                          className={styles.quantityBtn}
                          onClick={() => handleIncrement(product.id)}
                          disabled={
                            product.quantity >= (product.stock_quantity || 999)
                          }
                          aria-label="Increase quantity"
                        >
                          <FaPlus />
                        </button>
                      </div>
                      <span className={styles.stockDisplay}>
                        {product.stock_quantity > 0 ? (
                          <span className={styles.inStockSmall}>
                            {product.stock_quantity} available
                          </span>
                        ) : (
                          <span className={styles.outOfStockSmall}>
                            Out of stock
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {isFlashSale && (
                    <div className={styles.flashPriceDisplay}>
                      <div className={styles.originalPriceLine}>
                        <span className={styles.originalPriceLabel}>Original:</span>
                        <span className={styles.originalPriceValue}>
                          {formatKSH(product.originalPrice)}
                        </span>
                      </div>
                      <div className={styles.flashPriceLine}>
                        <span className={styles.flashPriceLabel}>Flash Sale:</span>
                        <span className={styles.flashPriceValue}>
                          {formatKSH(product.unitPrice)} × {product.quantity}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isFlashSale && (
                    <div className={styles.productPricing}>
                      <span>
                        {formatKSH(product.unitPrice)} × {product.quantity}
                      </span>
                      <strong>{formatKSH(product.productPrice)}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Installment info */}
          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <section className={styles.section}>
              <div
                className={styles.sectionHeader}
                onClick={() => setShowInstallmentInfo(!showInstallmentInfo)}
                style={{ cursor: "pointer" }}
              >
                <h3>Special Offer: Buy in Installments</h3>
                {showInstallmentInfo ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              <AnimatePresence>
                {showInstallmentInfo && (
                  <motion.div
                    className={styles.installmentDetails}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p>
                      Pay{" "}
                      <strong>
                        {(products[0]?.installment_plan?.initial_percent || 0.3) *
                          100}
                        %
                      </strong>{" "}
                      now and the remainder after delivery.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* Delivery section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Delivery & Options</h3>
            </div>

            <div className={styles.deliveryMethods}>
              {currentDeliveryOptions.offersPickup && (
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dm"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => {
                      setDeliveryMethod("pickup");
                      setPickupStation("");
                    }}
                  />
                  <span> Pickup Station</span>
                </label>
              )}

              {currentDeliveryOptions.offersDoor && (
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dm"
                    value="door"
                    checked={deliveryMethod === "door"}
                    onChange={() => {
                      setDeliveryMethod("door");
                    }}
                  />
                  <span> Door Delivery</span>
                </label>
              )}

              {!currentDeliveryOptions.offersPickup &&
                !currentDeliveryOptions.offersDoor && (
                  <div className={styles.noDeliveryOptions}>
                    <FaInfoCircle />
                    <div>
                      <strong>No delivery options available</strong>
                      <p>
                        Please contact the seller to arrange delivery or pickup.
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {deliveryMethod === "door" && currentDeliveryOptions.offersDoor && (
              <>
                <div className={styles.formGroup}>
                  <label>Delivery Address:</label>
                  <div ref={addressInputRef} className={styles.addressAutocomplete}>
                    <div className={styles.addressInputWrap}>
                      <FaMapMarkerAlt className={styles.addressIcon} />
                      <input
                        type="text"
                        placeholder="Search for area, street, landmark..."
                        value={deliveryAddress}
                        onChange={handleAddressChange}
                        onFocus={() => {
                          if (addressSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        className={styles.addressInput}
                        autoComplete="off"
                      />
                      {isSearching && (
                        <FaSpinner
                          className={`${styles.spinning} ${styles.inputSpinner}`}
                        />
                      )}
                    </div>

                    {savedAddress &&
                      !deliveryAddress &&
                      !showSuggestions &&
                      savedAddress.address && (
                        <button
                          type="button"
                          className={styles.savedAddressBtn}
                          onClick={applySavedAddress}
                        >
                          <FaHistory />
                          <span className={styles.savedAddressText}>
                            <strong>Use last address:</strong>{" "}
                            {savedAddress.address}
                          </span>
                        </button>
                      )}

                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className={styles.addressSuggestions}>
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.placeId || index}
                            className={styles.suggestionItem}
                            onClick={() => handleAddressSelect(suggestion)}
                          >
                            <FaMapMarkerAlt className={styles.suggestionIcon} />
                            <div className={styles.suggestionContent}>
                              <div className={styles.suggestionText}>
                                {suggestion.mainText}
                              </div>
                              {suggestion.secondaryText && (
                                <div className={styles.suggestionType}>
                                  {suggestion.secondaryText}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {storeDeliverySettings && (
                  <div
                    className={`${styles.deliveryTypeIndicator} ${
                      storeDeliverySettings.delivery_type === "self-delivery"
                        ? styles.selfDelivery
                        : styles.omniflowDelivery
                    }`}
                  >
                    {storeDeliverySettings.delivery_type === "self-delivery" ? (
                      <>
                        <FaTruck />
                        <span>
                          <strong>Self Delivery</strong> - This seller handles
                          their own delivery
                          {storeDeliverySettings.delivery_base_fee && (
                            <span className={styles.deliveryRateDetail}>
                              Base fee:{" "}
                              {formatKSH(storeDeliverySettings.delivery_base_fee)}{" "}
                              + {storeDeliverySettings.delivery_rate_per_km}{" "}
                              KSh/km
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

                <div className={styles.deliveryFeeDisplay}>
                  <div className={styles.feeRow}>
                    <span>Delivery fee:</span>
                    {deliveryCalculating ? (
                      <span className={styles.calculating}>Calculating...</span>
                    ) : deliveryDistance ? (
                      <span
                        className={
                          isFreeDelivery ? styles.freeDelivery : styles.feeAmount
                        }
                      >
                        {isFreeDelivery ? "FREE" : formatKSH(finalDeliveryFee)}
                      </span>
                    ) : deliveryAddress ? (
                      <span className={styles.cannotCalculate}>
                        Could not calculate
                      </span>
                    ) : (
                      <span className={styles.enterAddress}>
                        Enter address to see fee
                      </span>
                    )}
                  </div>

                  {deliveryBreakdown && !isFreeDelivery && (
                    <div className={styles.feeBreakdown}>
                      {deliveryBreakdown.type === "self-delivery" ? (
                        <>
                          <div>
                            Base fee: {formatKSH(deliveryBreakdown.baseFee)}
                          </div>
                          <div>
                            Distance rate: {deliveryBreakdown.ratePerKm} KSh/km
                          </div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>
                            Total: {formatKSH(deliveryBreakdown.total)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            Zone {deliveryBreakdown.zone?.replace("zone", "")}:{" "}
                            {deliveryBreakdown.rate} KSh/km
                          </div>
                          <div>Distance: {deliveryBreakdown.distance} km</div>
                          <div className={styles.totalFee}>
                            Total: {formatKSH(deliveryBreakdown.total)}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {storeDeliverySettings?.delivery_coverage_radius && (
                    <div className={styles.coverageNote}>
                      Max delivery radius:{" "}
                      {storeDeliverySettings.delivery_coverage_radius} km
                    </div>
                  )}
                </div>
              </>
            )}

            {deliveryMethod === "pickup" && currentDeliveryOptions.offersPickup && (
              <div className={styles.formGroup}>
                <label>Pickup Station Address:</label>
                <input
                  type="text"
                  placeholder="Enter pickup station address"
                  value={pickupStation}
                  onChange={(e) => setPickupStation(e.target.value)}
                />
                <small>
                  Enter the exact location where you'll pick up your order
                </small>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Contact / M-Pesa Phone:</label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0712345678"
              />
              <small>
                This number will receive the M-Pesa payment prompt and delivery
                updates
              </small>
            </div>
          </section>

          {hasInstallmentPlan && !fromCart && !isFlashSale && (
            <button
              onClick={handleStartInstallment}
              disabled={
                processingInstallment ||
                (deliveryMethod === "door" && !deliveryAddress) ||
                (deliveryMethod === "pickup" && !pickupStation) ||
                !deliveryMethod
              }
              className={styles.installmentBtn}
            >
              {processingInstallment ? (
                <FaSpinner className={styles.spinning} />
              ) : (
                <FaPercent />
              )}
              Start Installment Plan (Pay Initial)
            </button>
          )}
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Order Summary</h3>
            </div>

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
                  <img
                    src={product.image_gallery?.[0] || "/placeholder.jpg"}
                    alt="thumb"
                    className={styles.summaryImage}
                  />
                  <div className={styles.summaryProductInfo}>
                    <div className={styles.summaryProductName}>
                      {product.name}
                    </div>
                    <div>Qty: {product.quantity}</div>
                    <div className={styles.summaryProductPrice}>
                      {formatKSH(product.productPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.priceBreakdown}>
              {isFlashSale && productTotals[0]?.originalPrice && (
                <div className={styles.flashSaleSavings}>
                  <span>Flash Sale Savings:</span>
                  <strong style={{ color: "#10B981" }}>
                    -
                    {formatKSH(
                      (productTotals[0].originalPrice -
                        productTotals[0].unitPrice) *
                        productTotals[0].quantity
                    )}
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
                  <strong>
                    {isFreeDelivery ? "FREE" : formatKSH(finalDeliveryFee)}
                  </strong>
                </div>
              )}
              <div className={styles.divider} />
              <div className={styles.depositRow}>
                <span>Deposit (25%):</span>
                <strong>{formatKSH(totalDeposit)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Pay now:</span>
                <strong className={styles.totalAmount}>
                  {formatKSH(depositTotal)}
                </strong>
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
                disabled={
                  buying ||
                  mpesaLoading ||
                  (deliveryMethod === "door" && !deliveryAddress) ||
                  (deliveryMethod === "pickup" && !pickupStation) ||
                  !deliveryMethod
                }
              >
                <FaWallet /> Pay 25% Deposit
              </button>

              <button
                className={styles.mpesaBtn}
                onClick={handleMpesaPayment}
                disabled={
                  buying ||
                  mpesaLoading ||
                  (deliveryMethod === "door" && !deliveryAddress) ||
                  (deliveryMethod === "pickup" && !pickupStation) ||
                  !deliveryMethod
                }
              >
                <FaMobileAlt />{" "}
                {mpesaLoading ? "Processing..." : "Pay via M-Pesa"}
              </button>

              <button
                className={styles.paypalBtn}
                onClick={() => handlePayExternal("paypal")}
                disabled={
                  buying ||
                  (deliveryMethod === "door" && !deliveryAddress) ||
                  (deliveryMethod === "pickup" && !pickupStation) ||
                  !deliveryMethod
                }
              >
                <FaPaypal /> Pay via PayPal
              </button>
            </div>

            <div className={styles.infoNote}>
              <FaInfoCircle />
              <span>
                <strong>How it works:</strong> Pay 25% deposit now (held in
                escrow). After delivery is confirmed, pay the remaining 75% to
                complete the order.
              </span>
            </div>

            {storeDeliverySettings?.delivery_type === "self-delivery" && (
              <div className={styles.deliveryNote}>
                <FaTruck />
                <span>
                  This seller handles their own delivery. Delivery fee calculated
                  based on their rates.
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}