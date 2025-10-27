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
  FaArrowLeft
} from "react-icons/fa";
import "./Checkout.css";

export default function Checkout() {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const addressInputRef = useRef(null);

  // installments UI
  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  // Check if coming from cart
  const fromCart = location.state?.fromCart;
  const storeId = location.state?.storeId;

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
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    
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
        console.log("🔄 Checkout loading...", { productId, fromCart, locationState: location.state });

        // Check if user is logged in FIRST
        if (!user?.id) {
          toast.error("Please login to proceed to checkout");
          navigate("/login");
          return;
        }

        if (fromCart && location.state?.cartItems) {
          // Cart checkout flow
          const cartItems = location.state.cartItems;
          console.log("🛒 Cart checkout items:", cartItems);
          
          setProducts(cartItems.map(item => ({
            ...item.products,
            cartItemId: item.id,
            quantity: item.quantity,
            variant: item.variant
          })));

          // Get store info from state (already passed from cart)
          if (location.state.seller) {
            setSeller(location.state.seller);
          }

          // Set delivery method based on store preferences from first item
          const firstItem = cartItems[0];
          if (firstItem) {
            const dm = firstItem.products.delivery_methods || {};
            const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
            const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
            setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
          }
        } else {
          // Single product checkout flow (original logic)
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

          setProducts([{ ...p, quantity: 1 }]);

          const { data: s } = await supabase
            .from("stores")
            .select("id,name,contact_phone,location,owner_id")
            .eq("owner_id", p.owner_id)
            .maybeSingle();
          setSeller(s || null);

          const dm = p.delivery_methods || {};
          const offersPickup = dm && (dm.pickup === "Yes" || dm.pickup === true || (typeof dm.pickup === "string" && dm.pickup.trim() !== "") || typeof dm.pickup === "object");
          const offersDoor = dm && (dm.door === "Yes" || dm.door === true || (typeof dm.door === "string" && dm.door.trim() !== "") || typeof dm.door === "object");
          setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");
        }

        console.log("✅ Checkout loaded successfully");
      } catch (err) {
        console.error("❌ Checkout load error:", err);
        toast.error("Failed to load checkout");
        navigate("/cart");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, location.state, user, fromCart, navigate]);

  // delivery fee calculation
  function computeDeliveryFee() {
    try {
      if (!products.length) return 0;
      
      const product = products[0];
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
    products,
    deliveryMethod,
    deliverySpeed,
    fragile
  ]);

  // Calculate totals
  const productTotals = useMemo(() => {
    return products.map(product => {
      const rawPrice = Number(product.price || 0);
      const discount = Number(product.discount || 0);
      const unitPrice = rawPrice * (1 - discount / 100);
      const productPrice = +(unitPrice * product.quantity).toFixed(2);
      const depositProduct = +(productPrice * depositPercent).toFixed(2);
      
      return {
        ...product,
        unitPrice,
        productPrice,
        depositProduct
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

  const depositTotal = useMemo(() => +(totalDeposit + deliveryFee).toFixed(2), [totalDeposit, deliveryFee]);
  const balanceDue = useMemo(() => +(totalProductPrice - totalDeposit).toFixed(2), [totalProductPrice, totalDeposit]);
  const totalOrder = useMemo(() => +(totalProductPrice + deliveryFee).toFixed(2), [totalProductPrice, deliveryFee]);

  // Check if any product has installment plan (disable for multi-product)
  const hasInstallmentPlan = useMemo(() => {
    if (fromCart && products.length > 1) return false;
    return products[0]?.installment_plan;
  }, [products, fromCart]);

  // Payment handlers
  async function handlePayWithWallet() {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress) return toast.error("Please enter a delivery address");

    // Check stock
    const outOfStock = products.some(product => 
      product.stock_quantity < product.quantity
    );
    if (outOfStock) return toast.error("Some items are out of stock");

    setBuying(true);
    toast.loading("Processing deposit...");

    try {
      if (fromCart) {
        // Multi-product checkout from cart
        for (const product of productTotals) {
          const rpcArgs = {
            p_buyer: user.id,
            p_product: product.id,
            p_variant: product.variant || null,
            p_quantity: product.quantity,
            p_delivery_method: deliveryMethod,
            p_location: deliveryAddress,
            p_contact_phone: contactPhone,
            p_payment_method: "wallet",
            p_deposit_percent: depositPercent,
          };

          const { error } = await supabase.rpc("create_order_with_deposit", rpcArgs);
          if (error) throw error;

          // Remove from cart after successful order creation
          await supabase
            .from("cart_items")
            .delete()
            .eq("id", product.cartItemId);
        }
      } else {
        // Single product checkout
        const product = productTotals[0];
        const rpcArgs = {
          p_buyer: user.id,
          p_product: product.id,
          p_variant: product.variant || null,
          p_quantity: product.quantity,
          p_delivery_method: deliveryMethod,
          p_location: deliveryAddress,
          p_contact_phone: contactPhone,
          p_payment_method: "wallet",
          p_deposit_percent: depositPercent,
        };

        const { data, error } = await supabase.rpc("create_order_with_deposit", rpcArgs);
        if (error) throw error;
      }

      toast.dismiss();
      toast.success("Deposit collected — order created");
      navigate("/orders");
    } catch (err) {
      console.error("Wallet payment error:", err);
      toast.dismiss();
      toast.error("Payment error: " + (err.message || ""));
    } finally {
      setBuying(false);
    }
  }

  async function handlePayExternal(method) {
    if (!user?.id) return toast.error("Login required");
    if (!deliveryMethod) return toast.error("Choose a delivery option");
    if (!contactPhone) return toast.error("Enter contact phone");
    if (!deliveryAddress) return toast.error("Please enter a delivery address");

    setBuying(true);
    toast.loading("Creating pending order...");

    try {
      if (fromCart) {
        // Multi-product checkout
        for (const product of productTotals) {
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
            delivery_fee: deliveryFee / products.length, // Split delivery fee
            deposit_amount: product.depositProduct,
            deposit_paid: false,
            balance_due: product.productPrice - product.depositProduct,
            payment_method: method,
            buyer_phone: contactPhone,
            buyer_location: deliveryAddress,
            delivery_location: deliveryAddress,
            metadata: { delivery_speed: deliverySpeed, fragile, from_cart: true },
          };

          const { error } = await supabase.from("orders").insert([payload]);
          if (error) throw error;

          // Remove from cart
          await supabase
            .from("cart_items")
            .delete()
            .eq("id", product.cartItemId);
        }
      } else {
        // Single product checkout
        const product = productTotals[0];
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
          delivery_fee: deliveryFee,
          deposit_amount: totalDeposit,
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
      }

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
    if (!hasInstallmentPlan) return toast.error("Installments not available");
    if (fromCart && products.length > 1) return toast.error("Installments only available for single products");

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
  if (!products.length) return <div className="loading">No products found</div>;

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>
          {fromCart ? (
            <>
              <FaStore /> Checkout - {seller?.name}
            </>
          ) : (
            <>
              <FaBox /> Checkout
            </>
          )}
        </h1>
      </div>

      <div className="checkout-grid">
        <div className="left">
          {/* Products Display */}
          <div className="products-section">
            <h3>
              {fromCart ? `Ordering from ${seller?.name}` : "Product Details"}
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
                  <div className="product-pricing">
                    <span>KSH {product.unitPrice.toLocaleString()} × {product.quantity}</span>
                    <strong>KSH {product.productPrice.toLocaleString()}</strong>
                  </div>
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

          {/* Installment Section - Only for single product without cart */}
          {hasInstallmentPlan && !fromCart && (
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

            {/* MAPBOX ADDRESS AUTOCOMPLETE */}
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

          {/* Installment Payment - Only for single product */}
          {hasInstallmentPlan && !fromCart && (
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

          {/* PAYMENT SECTION */}
          <div className="payment-methods" style={{ marginTop: 16 }}>
            <h4>Payment</h4>
            <div className="price-breakdown">
              <div>
                <span>Product{products.length > 1 ? 's' : ''} total:</span>
                <strong>KSH {totalProductPrice.toLocaleString()}</strong>
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
                <strong>KSH {totalDeposit.toFixed(2)}</strong>
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
            
            {fromCart && seller && (
              <div className="store-info">
                <FaStore />
                <span>{seller.name}</span>
              </div>
            )}
            
            <div className="products-list">
              {productTotals.map((product, index) => (
                <div key={index} className="summary-product">
                  <img src={product.image_gallery?.[0] || "/placeholder.jpg"} alt="thumb" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div>Qty: {product.quantity}</div>
                    <div>KSH {product.productPrice.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="summary-details">
              <div>Delivery: {deliveryMethod || "—"}</div>
              <div>Address: {deliveryAddress ? "✓ Selected" : "—"}</div>
              <div>Shipping: KSH {deliveryFee.toFixed(2)}</div>
              
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', fontWeight: 700 }}>
                Pay now: KSH {depositTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                Balance due: KSH {balanceDue.toFixed(2)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}