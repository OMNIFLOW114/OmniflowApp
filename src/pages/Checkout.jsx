// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState("standard");
  const [fragile, setFragile] = useState(false);
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [variantsList, setVariantsList] = useState([]); // normalized array
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [detailedAddress, setDetailedAddress] = useState("");


  // installments UI
  const depositPercent = 0.25;
  const [showInstallmentInfo, setShowInstallmentInfo] = useState(false);
  const [processingInstallment, setProcessingInstallment] = useState(false);

  // parse variants helper (robust)
  function parseVariants(raw) {
    if (!raw) return [];
    // If already array
    if (Array.isArray(raw)) return raw;

    // Try JSON.parse if it's JSON
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      // quick test: if string starts with [ or {, attempt JSON.parse
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          // if object, maybe keyed variants -> convert to array
          if (parsed && typeof parsed === "object") {
            // If it's object with keys -> return values
            return Object.values(parsed);
          }
        } catch (e) {
          // JSON parse failed - fallthrough to other strategies
          console.warn("Variants parsing failed (JSON):", e);
        }
      }

      // If string is comma/newline separated — split
      if (trimmed.includes(",") || trimmed.includes("\n")) {
        const parts = trimmed
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length) return parts;
      }

      // Otherwise treat whole string as a single variant (e.g., "All quantities")
      return [trimmed];
    }

    // fallback
    return [];
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // product from location.state? if so, use it (fast path)
        let p = location.state?.product || null;

        if (!p) {
          const { data, error } = await supabase
            .from("products")
            // request both 'variants' (text) and variant_options (jsonb) and delivery_methods, installment_plan etc.
            .select(
              "*, delivery_methods, image_gallery, discount, installment_plan, variants, variant_options, price, description, store_id"
            )
            .eq("id", productId)
            .single();

          if (error) throw error;
          p = data;
        }

        setProduct(p);

        // seller/store info
        const { data: s } = await supabase
          .from("stores")
          .select("id,name,contact_phone,location")
          .eq("owner_id", p.owner_id)
          .maybeSingle();
        setSeller(s || null);

        // delivery method default
        const dm = p.delivery_methods || {};
        const offersPickup =
          dm &&
          (dm.pickup === "Yes" ||
            dm.pickup === true ||
            (typeof dm.pickup === "string" && dm.pickup.trim() !== "") ||
            typeof dm.pickup === "object");
        const offersDoor =
          dm &&
          (dm.door === "Yes" ||
            dm.door === true ||
            (typeof dm.door === "string" && dm.door.trim() !== "") ||
            typeof dm.door === "object");
        setDeliveryMethod(offersDoor ? "door" : offersPickup ? "pickup" : "");

        // delivery location default
        if (dm && Array.isArray(dm.locations) && dm.locations.length > 0) {
          setDeliveryLocation(dm.locations[0]);
        } else if (s?.location) {
          setDeliveryLocation(s.location);
        } else {
          setDeliveryLocation("Nairobi");
        }

        // normalize variants: prefer `variants` (text/array), fallback to variant_options (jsonb)
        let normalized = [];
        if ("variants" in p && p.variants != null) {
          normalized = parseVariants(p.variants);
        } else if ("variant_options" in p && p.variant_options != null) {
          // variant_options may be array of objects
          if (Array.isArray(p.variant_options)) normalized = p.variant_options;
          else normalized = parseVariants(p.variant_options);
        }

        setVariantsList(normalized || []);
        setSelectedVariantIndex(normalized && normalized.length ? 0 : null);

        // clamp quantity to available stock if provided
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

  // utility: safe delivery fee calculation
  function computeDeliveryFee() {
    try {
      if (!product) return 0;
      const dm = product.delivery_methods || {};
      if (!deliveryMethod) return 0;

      // if dm[deliveryMethod] is object with rates
      if (dm[deliveryMethod] && typeof dm[deliveryMethod] === "object") {
        const rates = dm[deliveryMethod].rates || dm[deliveryMethod].rate || {};
        if (rates && deliveryLocation && rates[deliveryLocation] != null) {
          return Number(rates[deliveryLocation]);
        }
        if (dm[deliveryMethod].fee != null) return Number(dm[deliveryMethod].fee);
      }

      // top-level rates structure
      if (dm.rates && dm.rates[deliveryMethod] && dm.rates[deliveryMethod][deliveryLocation]) {
        return Number(dm.rates[deliveryMethod][deliveryLocation]);
      }

      // fallback heuristics
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
    deliveryLocation,
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

  // Payment: wallet RPC (create_order_with_deposit) — we send variant as JSON string
  // ------------------------------
// BUYER PAYMENT HANDLERS
// ------------------------------

async function handlePayWithWallet() {
  if (!user?.id) return toast.error("Login required");
  if (!deliveryMethod) return toast.error("Choose a delivery option");
  if (!contactPhone) return toast.error("Enter contact phone");
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
      p_location: `${deliveryLocation}, ${detailedAddress}`,
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

// ------------------------------
// EXTERNAL PAYMENT (pending order)
// ------------------------------

async function handlePayExternal(method) {
  if (!user?.id) return toast.error("Login required");
  if (!deliveryMethod) return toast.error("Choose a delivery option");
  if (!contactPhone) return toast.error("Enter contact phone");
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
      buyer_location: `${deliveryLocation}, ${detailedAddress}`,
      delivery_location: `${deliveryLocation}, ${detailedAddress}`,
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

// ------------------------------
// INSTALLMENT PAYMENT FLOW (Kenya Lipa Mdogo Mdogo style)
// ------------------------------

/**
 * Start a new installment order
 */
async function handleStartInstallment() {
  if (!user?.id) return toast.error("Login required");
  if (!deliveryMethod) return toast.error("Choose a delivery option");
  if (!contactPhone) return toast.error("Enter contact phone");
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

    // 🔹 Call RPC to create installment order + debit initial payment into escrow
    const { data, error } = await supabase.rpc("start_installment_order", {
      p_buyer: user.id,
      p_product: product.id,
      p_variant: variantPayload,
      p_quantity: quantity,
      p_delivery_method: deliveryMethod,
      p_delivery_location: `${deliveryLocation}${detailedAddress ? `, ${detailedAddress}` : ""}`,
      p_contact_phone: contactPhone,
    });

    if (error) throw error;

    const instOrderId = typeof data === "string" ? data : data?.id;

    toast.dismiss(dismiss);
    toast.success("Installment plan started ✅ Initial payment secured in escrow");

    // Navigate user to order details
    navigate("/orders", { state: { highlight: instOrderId } });
  } catch (err) {
    console.error("Installment flow error:", err);
    toast.dismiss(dismiss);
    toast.error(err?.message || "Failed to start installment plan");
  } finally {
    setProcessingInstallment(false);
  }
}

/**
 * Confirm delivery → release partial escrow to seller (minus commission)
 */
async function handleConfirmDelivery(orderId) {
  if (!orderId) return toast.error("Order ID missing");

  const dismiss = toast.loading("Confirming delivery…");
  try {
    const { error } = await supabase.rpc("release_on_delivery", { p_order: orderId });
    if (error) throw error;

    toast.dismiss(dismiss);
    toast.success("Delivery confirmed ✅ Partial payout released to seller");
  } catch (err) {
    console.error("Delivery release error:", err);
    toast.dismiss(dismiss);
    toast.error(err?.message || "Failed to confirm delivery");
  }
}

/**
 * Pay one installment → release installment payout to seller + admin
 */
async function handlePayInstallment(orderId, paymentId) {
  if (!orderId || !paymentId) return toast.error("Order ID and Payment ID required");

  const dismiss = toast.loading("Processing installment payment…");
  try {
    const { error } = await supabase.rpc("release_on_installment", {
      p_order: orderId,
      p_payment: paymentId,
    });
    if (error) throw error;

    toast.dismiss(dismiss);
    toast.success("Installment paid ✅ Payout released to seller & admin");
  } catch (err) {
    console.error("Installment release error:", err);
    toast.dismiss(dismiss);
    toast.error(err?.message || "Failed to process installment");
  }
}

/**
 * Finalize order → clear escrow & mark order complete
 */
async function handleFinalizeOrder(orderId) {
  if (!orderId) return toast.error("Order ID missing");

  const dismiss = toast.loading("Finalizing order…");
  try {
    const { error } = await supabase.rpc("finalize_installment_order", { p_order: orderId });
    if (error) throw error;

    toast.dismiss(dismiss);
    toast.success("Order finalized ✅ Escrow cleared and seller fully paid");
  } catch (err) {
    console.error("Finalize order error:", err);
    toast.dismiss(dismiss);
    toast.error(err?.message || "Failed to finalize order");
  }
}


  // UI helpers: variant label
  function variantLabel(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      // common keys
      return v.name || v.label || v.color || JSON.stringify(v);
    }
    return String(v);
  }

  // quantity controls
  function increaseQty() {
    const max = product?.stock_quantity || 999999;
    setQuantity((q) => Math.min(max, q + 1));
  }
  function decreaseQty() {
    setQuantity((q) => Math.max(1, q - 1));
  }

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

          {/* Catchy Installment header at top (if available) */}
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

          {/* Variants */}
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

          {/* Quantity */}
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

          {/* Delivery */}
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

          {/* Delivery location (Kenyan counties) */}
<label>
  County:
  <select
    value={deliveryLocation}
    onChange={(e) => setDeliveryLocation(e.target.value)}
  >
    {[
      "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret",
      "Kiambu", "Machakos", "Kajiado", "Nyeri", "Meru",
      "Uasin Gishu", "Kericho", "Kakamega", "Bungoma", "Siaya",
      "Homa Bay", "Migori", "Kisii", "Narok", "Laikipia",
      "Kilifi", "Taita Taveta", "Kitui", "Embu", "Garissa",
      "Mandera", "Wajir", "Turkana", "Marsabit", "Isiolo",
      "Samburu", "Baringo", "West Pokot", "Trans Nzoia", "Busia",
      "Vihiga", "Nandi", "Bomet", "Kericho", "Nyamira",
      "Tharaka Nithi", "Murang’a", "Kirinyaga", "Tana River",
      "Lamu", "Kwale", "Other"
    ].map((county, i) => (
      <option key={i} value={county}>
        {county}
      </option>
    ))}
  </select>
</label>

{/* Detailed address input */}
<label>
  Detailed Address (Estate, Street, Building, House No.):
  <input
    type="text"
    placeholder="e.g. Kilimani, Ngong Rd, Apartment 12"
    value={detailedAddress}
    onChange={(e) => setDetailedAddress(e.target.value)}
    required
  />
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

          {/* Installment CTA (detailed) */}
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
                    disabled={processingInstallment}
                    className="wallet"
                    style={{ marginRight: 8 }}
                  >
                    Start Installment Plan (Pay Initial)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
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
              <button className="wallet" onClick={handlePayWithWallet} disabled={buying}>
                <FaWallet /> Pay deposit with Wallet
              </button>

              <button className="mpesa" onClick={() => handlePayExternal("mpesa")} disabled={buying}>
                <FaMobileAlt /> Pay deposit via M-Pesa
              </button>

              <button className="paypal" onClick={() => handlePayExternal("paypal")} disabled={buying}>
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
              <div>Location: {deliveryLocation}</div>
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
