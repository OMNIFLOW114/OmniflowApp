// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaArrowLeft,
  FaWallet,
  FaMobileAlt,
  FaPaypal,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "./Checkout.css";

export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  // checkout fields
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState("standard");
  const [fragile, setFragile] = useState(false);
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [variantsList, setVariantsList] = useState([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  // Mapbox address state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const addressInputRef = useRef(null);

  // installments UI
  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  // OPTIMIZED Mapbox search for deep Kenyan addresses
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
        `access_token=pk.eyJ1Ijoib21uaWZsb3ciLCJhIjoiY21oMDl0NW41MGRzZmxncXVrdnQxeXVqdyJ9.kq5_wsP11uOBxwV0Wacoeg` +
        `&country=ke` + // Kenya only
        `&types=address,place,neighborhood,locality,poi` + // Specific location types
        `&bbox=33.83,-4.73,41.91,5.06` + // Kenya bounding box (excludes neighboring countries)
        `&limit=8` + // More results
        `&language=en` + // English results
        `&autocomplete=true` + // Better autocomplete
        `&proximity=36.8219,-1.2921` // Center on Nairobi
      );

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Filter to ensure Kenya-only results
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
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    
    // Debounce the search
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

  // parse variants helper
  function parseVariants(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          if (parsed && typeof parsed === "object") {
            return Object.values(parsed);
          }
        } catch (e) {
          console.warn("Variants parsing failed (JSON):", e);
        }
      }

      if (trimmed.includes(",") || trimmed.includes("\n")) {
        const parts = trimmed
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length) return parts;
      }
      return [trimmed];
    }
    return [];
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let p = location.state?.product || null;

        if (!p) {
          const { data, error } = await supabase
            .from("products")
            .select(
              "*, delivery_methods, image_gallery, discount, installment_plan, variants, variant_options, price, description, store_id"
            )
            .eq("id", productId)
            .single();

          if (error) throw error;
          p = data;
        }

        setProduct(p);

        const { data: s } = await supabase
          .from("stores")
          .select("id,name,contact_phone,location")
          .eq("owner_id", p.owner_id)
          .maybeSingle();
        setSeller(s || null);

        const dm = p.delivery_methods || {};
        const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
        const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
        setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");

        let normalized = [];
        if ("variants" in p && p.variants != null) {
          normalized = parseVariants(p.variants);
        } else if ("variant_options" in p && p.variant_options != null) {
          if (Array.isArray(p.variant_options)) normalized = p.variant_options;
          else normalized = parseVariants(p.variant_options);
        }

        setVariantsList(normalized || []);
        setSelectedVariantIndex(normalized && normalized.length ? 0 : null);

        if (p.stock_quantity && p.stock_quantity > 0) {
          setQuantity((q) => Math.min(q, p.stock_quantity));
        }
      } catch (err) {
        console.error("Checkout load error:", err);
        toast.error("Failed to load product for checkout");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, location.state, user]);

  // delivery fee calculation
  function computeDeliveryFee() {
    try {
      if (!product) return 0;
      const dm = product.delivery_methods || {};
      if (!deliveryMethod) return 0;

      if (dm[deliveryMethod] && typeof dm[deliveryMethod] === "object") {
        const rates = dm[deliveryMethod].rates || dm[deliveryMethod].rate || {};
        if (rates && rates.Nairobi != null) {
          return Number(rates.Nairobi);
        }
        if (dm[deliveryMethod].fee != null) return Number(dm[deliveryMethod].fee);
      }

      if (dm.rates && dm.rates[deliveryMethod] && dm.rates[deliveryMethod].Nairobi) {
        return Number(dm.rates[deliveryMethod].Nairobi);
      }

      let base = deliveryMethod === "door" ? 200 : 0;
      if (deliverySpeed === "express") base *= 1.5;
      if (fragile) base += 100;
      return base;
    } catch (e) {
      console.warn("computeDeliveryFee err", e);
      return 0;
    }
  }

  const deliveryFee = useMemo(() => computeDeliveryFee(), [
    product,
    deliveryMethod,
    deliverySpeed,
    fragile,
  ]);

  const unitPrice = useMemo(() => {
    const rawPrice = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);
    return rawPrice * (1 - discount / 100);
  }, [product]);

  const productPrice = useMemo(() => +(unitPrice * quantity).toFixed(2), [unitPrice, quantity]);
  const depositProduct = useMemo(() => +(productPrice * depositPercent).toFixed(2), [productPrice]);
  const depositTotal = useMemo(() => +(depositProduct + deliveryFee).toFixed(2), [depositProduct, deliveryFee]);
  const balanceDue = useMemo(() => +(productPrice - depositProduct).toFixed(2), [productPrice, depositProduct]);
  const totalOrder = useMemo(() => +(productPrice + deliveryFee).toFixed(2), [productPrice, deliveryFee]);

  // Payment handlers
  async function handlePayWithWallet() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress) return toast.error("Please enter a delivery address");
    if (variantsList.length && selectedVariantIndex == null) return toast.error("Select a variant");

    setBuying(true);
    toast.loading("Processing deposit...");

    try {
      const rpcArgs = {
        p_buyer: user.id,
        p_product: product.id,
        p_variant: selectedVariantIndex != null
          ? JSON.stringify(variantsList[selectedVariantIndex])
          : null,
        p_quantity: quantity,
        p_delivery_method: deliveryMethod,
        p_location: deliveryAddress,
        p_contact_phone: contactPhone,
        p_payment_method: "wallet",
        p_deposit_percent: depositPercent,
      };

      const { data, error } = await supabase.rpc("create_order_with_deposit", rpcArgs);

      if (error) {
        console.error("Wallet RPC error:", error);
        toast.dismiss();
        toast.error("Deposit failed: " + (error.message || error.details || ""));
        return;
      }

      toast.dismiss();
      toast.success("Deposit collected — order created");
      navigate("/orders");
    } catch (err) {
      console.error("Wallet payment error:", err);
      toast.dismiss();
      toast.error("Payment error");
    } finally {
      setBuying(false);
    }
  }

  async function handlePayExternal(method) {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress) return toast.error("Please enter a delivery address");
    if (variantsList.length && selectedVariantIndex == null) return toast.error("Select a variant");

    setBuying(true);
    toast.loading("Creating pending order...");

    try {
      const payload = {
        product_id: product.id,
        buyer_id: user.id,
        seller_id: product.owner_id,
        variant: selectedVariantIndex != null ? JSON.stringify(variantsList[selectedVariantIndex]) : null,
        quantity,
        price_paid: 0,
        total_price: totalOrder,
        store_id: product.store_id || null,
        delivery_method: deliveryMethod,
        delivery_fee: deliveryFee,
        deposit_amount: depositProduct,
        deposit_paid: false,
        balance_due: balanceDue,
        payment_method: method,
        buyer_phone: contactPhone,
        buyer_location: deliveryAddress,
        delivery_location: deliveryAddress,
        metadata: { delivery_speed: deliverySpeed, fragile },
      };

      const { data, error } = await supabase.from("orders").insert([payload]).select().single();
      if (error) throw error;

      toast.dismiss();
      toast.success("Pending order created — complete payment externally");
      navigate("/orders");
    } catch (err) {
      console.error("External order creation error:", err);
      toast.dismiss();
      toast.error("Failed to create order: " + (err.message || ""));
    } finally {
      setBuying(false);
    }
  }

  async function handleStartInstallment() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress) return toast.error("Please enter a delivery address");
    if (!product?.installment_plan) return toast.error("Installments not available for this product");
    if (quantity < 1) return toast.error("Quantity must be at least 1");
    if (product?.stock_quantity != null && quantity > product.stock_quantity) {
      return toast.error("Quantity exceeds available stock");
    }

    setProcessingInstallment(true);
    const dismiss = toast.loading("Starting installment plan…");

    try {
      const variantPayload =
        selectedVariantIndex != null ? JSON.stringify(variantsList[selectedVariantIndex]) : null;

      const { data, error } = await supabase.rpc("start_installment_order", {
        p_buyer: user.id,
        p_product: product.id,
        p_variant: variantPayload,
        p_quantity: quantity,
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

  // UI helpers
  function variantLabel(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      return v.name || v.label || v.color || JSON.stringify(v);
    }
    return String(v);
  }

  function increaseQty() {
    const max = product?.stock_quantity || 999999;
    setQuantity((q) => Math.min(max, q + 1));
  }
  
  function decreaseQty() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  // Helper function for address type display
  const getAddressType = (suggestion) => {
    const types = suggestion.place_type || [];
    if (types.includes('address')) return 'Exact Address';
    if (types.includes('poi')) return 'Place';
    if (types.includes('neighborhood')) return 'Area';
    if (types.includes('locality')) return 'Town/City';
    return 'Location';
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (!product) return <div className="loading">Product not found</div>;

  return (
    <div className="checkout-page">
      <button className="back" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>

      <div className="checkout-grid">
        <div className="left">
          <h2>{product.name}</h2>
          <p>{product.description}</p>

          {product.installment_plan && (
            <div className="installment-section" style={{ marginBottom: 16 }}>
              <h4 onClick={() => setShowInstallmentInfo((s) => !s)}>
                Special Offer: Buy in Installments{" "}
                {showInstallmentInfo ? <FaChevronUp /> : <FaChevronDown />}
              </h4>
              {showInstallmentInfo && (
                <div className="installment-details">
                  <p>
                    Pay <strong>{(product.installment_plan.initial_percent || 0.3) * 100}%</strong> now and the remainder after delivery.
                    Terms: {product.installment_plan?.terms || "See seller terms"}.
                  </p>
                </div>
              )}
            </div>
          )}

          {variantsList && variantsList.length > 0 && (
            <div className="variant-section">
              <h4>Choose Variant</h4>
              <div className="variants">
                {variantsList.map((v, i) => (
                  <button
                    key={i}
                    className={i === selectedVariantIndex ? "active" : ""}
                    onClick={() => setSelectedVariantIndex(i)}
                    type="button"
                  >
                    {variantLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="quantity-selector" style={{ marginBottom: 12 }}>
            <h4>Quantity</h4>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={decreaseQty} type="button" className="qty-btn">-</button>
              <input
                type="number"
                value={quantity}
                min={1}
                max={product?.stock_quantity || 999999}
                onChange={(e) => {
                  const val = Number(e.target.value) || 1;
                  const max = product?.stock_quantity || 999999;
                  setQuantity(Math.max(1, Math.min(max, val)));
                }}
              />
              <button onClick={increaseQty} type="button" className="qty-btn">+</button>
              <div style={{ marginLeft: 8, color: "#666", fontSize: 0.95 }}>
                {product.stock_quantity != null ? `${product.stock_quantity} in stock` : null}
              </div>
            </div>
          </div>

          {/* DELIVERY SECTION WITH OPTIMIZED MAPBOX AUTOCOMPLETE */}
          <div className="delivery-settings">
            <h4>Delivery & Options</h4>
            <div className="delivery-methods" style={{ marginBottom: 12 }}>
              {product.delivery_methods?.pickup && (
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
              {product.delivery_methods?.door && (
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

            {/* OPTIMIZED MAPBOX ADDRESS AUTOCOMPLETE */}
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

            <label>
              Delivery speed:
              <select
                value={deliverySpeed}
                onChange={(e) => setDeliverySpeed(e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="express">Express (+cost)</option>
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

            <label>
              Contact phone:
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="07..."
              />
            </label>
          </div>

          {product.installment_plan && (
            <div className="installment-section" style={{ marginTop: 12 }}>
              <h4>Buy in Installments</h4>
              <div className="installment-details">
                <p>
                  Initial payment: <strong>{(product.installment_plan.initial_percent || 0.3) * 100}%</strong> (
                  <strong>KSH {( (unitPrice * quantity) * (product.installment_plan.initial_percent || 0.3) ).toFixed(2)}</strong>)
                </p>
                <p>Installment schedule:</p>
                <ul>
                  {(product.installment_plan.installments || []).map((it, idx) => (
                    <li key={idx}>
                      {it.percent}% after {it.due_in_days} days
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={handleStartInstallment}
                    disabled={processingInstallment || !deliveryAddress}
                    className="wallet"
                    style={{ marginRight: 8 }}
                  >
                    Start Installment Plan (Pay Initial)
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="payment-methods" style={{ marginTop: 16 }}>
            <h4>Payment</h4>
            <div className="price-breakdown">
              <div>
                <span>Unit price:</span>
                <strong>KSH {unitPrice.toLocaleString()}</strong>
              </div>
              <div>
                <span>Product price ({quantity}):</span>
                <strong>KSH {productPrice.toLocaleString()}</strong>
              </div>
              <div>
                <span>Delivery fee:</span>
                <strong>KSH {deliveryFee.toFixed(2)}</strong>
              </div>
              <div>
                <span>Total:</span>
                <strong>KSH {totalOrder.toFixed(2)}</strong>
              </div>
              <div className="separator" />
              <div>
                <span>Deposit ({depositPercent * 100}%):</span>
                <strong>KSH {depositProduct.toFixed(2)}</strong>
              </div>
              <div>
                <span>Deposit + Delivery:</span>
                <strong>KSH {depositTotal.toFixed(2)}</strong>
              </div>
              <div>
                <span>Balance Due:</span>
                <strong>KSH {balanceDue.toFixed(2)}</strong>
              </div>
            </div>

            <div className="methods">
              <button className="wallet" onClick={handlePayWithWallet} disabled={buying || !deliveryAddress}>
                <FaWallet /> Pay deposit with Wallet
              </button>

              <button className="mpesa" onClick={() => handlePayExternal("mpesa")} disabled={buying || !deliveryAddress}>
                <FaMobileAlt /> Pay deposit via M-Pesa
              </button>

              <button className="paypal" onClick={() => handlePayExternal("paypal")} disabled={buying || !deliveryAddress}>
                <FaPaypal /> Pay via PayPal
              </button>
            </div>

            <p className="muted">
              Note: you pay the deposit now + delivery fee. Remaining amount is paid on delivery (cash or as seller agrees).
            </p>
          </div>
        </div>

        <aside className="right">
          <div className="order-summary">
            <h4>Order Summary</h4>
            <img src={product.image_gallery?.[0] || "/placeholder.jpg"} alt="thumb" />
            <div>
              <div style={{ fontWeight: 600 }}>{product.name}</div>
              <div>Unit: KSH {unitPrice.toLocaleString()}</div>
              <div>Qty: {quantity}</div>
              <div>Delivery: {deliveryMethod || "—"}</div>
              <div>Address: {deliveryAddress ? "✓ Selected" : "—"}</div>
              {selectedVariantIndex != null && (
                <div>Variant: {variantLabel(variantsList[selectedVariantIndex])}</div>
              )}
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                Pay now: KSH {depositTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}