import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import {
  FaStar,
  FaUser,
  FaArrowLeft,
  FaHeart,
  FaShoppingCart,
  FaComment,
  FaMapMarkerAlt,
  FaTruck,
  FaUndo,
  FaShieldAlt,
  FaEye,
  FaMobileAlt,
} from "react-icons/fa";
import VerifiedBadge from "@/components/VerifiedBadge";
import Slider from "react-slick";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core data
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [storeId, setStoreId] = useState(null);

  // UI state
  const [activeInfoButton, setActiveInfoButton] = useState(null);

  // Buyer interactions
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(""); // 'pickup' | 'door'
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Ratings & reviews
  const [hasRated, setHasRated] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviews, setReviews] = useState([]);

  // Seller performance
  const [sellerScore, setSellerScore] = useState({ avgRating: 0, totalSales: 0 });

  // Ref for image gallery
  const galleryRef = useRef(null);
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 4000,
  };

  useEffect(() => {
    async function loadAll() {
      // Product details
      const { data: p, error: pErr } = await supabase
        .from("products")
        .select(`
          *,
          variant_options,
          image_gallery,
          delivery_methods,
          return_policy,
          warranty,
          usage_guide
        `)
        .eq("id", id)
        .single();

      if (pErr || !p) return toast.error("Product not found");
      setProduct(p);
      const safeVariants = Array.isArray(p.variant_options) ? p.variant_options : [];
       p.variant_options = safeVariants;
       setSelectedVariant(safeVariants[0] || null);

      setSelectedVariant(p.variant_options?.[0] || null);

      // Seller info
      const { data: s, error: sErr } = await supabase
        .from("stores")
        .select("id,name,contact_phone,contact_email,location,is_verified")
        .eq("owner_id", p.owner_id)
        .single();

      if (sErr || !s) return toast.error("Seller not found");
      setSeller(s);
      setStoreId(s.id);

      // Seller stats
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("seller_id", p.owner_id);

      const inIds = Array.isArray(p.variant_options)
  ? p.variant_options.map(v => v.product_id).concat(p.id)
  : [p.id];

      const { data: ratingsAll } = await supabase
        .from("ratings")
        .select("rating")
        .in("product_id", inIds);

      const totalSales = orders?.length || 0;
      const avgRating =
        ratingsAll && ratingsAll.length
          ? (
              ratingsAll.reduce((sum, r) => sum + r.rating, 0) /
              ratingsAll.length
            ).toFixed(1)
          : "0.0";
      setSellerScore({ avgRating, totalSales });

      // User-specific flags
      if (user?.id) {
        const [{ data: r }, { data: c }, { data: w }] = await Promise.all([
          supabase
            .from("ratings")
            .select("rating")
            .eq("product_id", p.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("cart_items")
            .select("id")
            .eq("product_id", p.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("wishlist_items")
            .select("id")
            .eq("product_id", p.id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (r) {
          setHasRated(true);
          setSelectedRating(r.rating);
        }
        setIsInCart(!!c);
        setIsInWishlist(!!w);
      }

      // Recent reviews (with verified badge if buyer ordered this item)
      const { data: rawRatings, error: rawErr } = await supabase
        .from("ratings")
        .select("id, rating, comment, created_at, user_id")
        .eq("product_id", id)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!rawErr && rawRatings?.length) {
        const enriched = await Promise.all(
          rawRatings.map(async (r) => {
            const { data: profile } = await supabase
              .from("users")
              .select("email, phone, full_name")
              .eq("id", r.user_id)
              .single();
            const { data: order } = await supabase
              .from("orders")
              .select("id")
              .eq("buyer_id", r.user_id)
              .eq("product_id", id)
              .maybeSingle();
            return {
              ...r,
              profiles: profile,
              isVerified: !!order,
            };
          })
        );
        setReviews(enriched);
      }
    }

    loadAll();
  }, [id, user]);

  // ——— Messaging ———
const handleSendMessage = async () => {
  if (!user?.id) return toast.error("Login to send message.");
  if (!message.trim()) return toast.error("Message is empty.");
  setSending(true);
  const { error } = await supabase.from("store_messages").insert([
    {
      store_id: storeId,
      product_id: product.id,
      user_id: user.id,
      sender_role: "buyer",
      content: message.trim(),
      status: "sent",
    },
  ]);
  setSending(false);
  if (error) {
    console.error("Error sending message:", error);
    toast.error("Message failed");
  } else {
    toast.success("Message sent! Redirecting to Messages...");
    setMessage("");
    navigate("/messages");
  }
};

  // ——— Rate product ———
  const handleRateProduct = async () => {
    if (!user?.id) return toast.error("Login to rate.");
    if (hasRated || selectedRating === 0)
      return toast.error("Already rated or select stars");
    const { error } = await supabase.from("ratings").insert([
      {
        user_id: user.id,
        product_id: product.id,
        rating: selectedRating,
        comment: null,
      },
    ]);
    if (error) toast.error("Rating failed");
    else {
      setHasRated(true);
      toast.success("Thanks for rating!");
    }
  };

  const handleAddToCart = async () => {
    if (!user?.id) return toast.error("Login to add to cart.");
    setIsProcessing(true);
    const { error } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      },
    ]);
    setIsProcessing(false);
    if (error) return toast.error("Already in cart or failed.");
    setIsInCart(true);
    toast.success("Added to cart!");
  };

  const handleAddToWishlist = async () => {
    if (!user?.id) return toast.error("Login to wishlist.");
    setIsProcessing(true);
    const { error } = await supabase.from("wishlist_items").insert([
      { user_id: user.id, product_id: product.id },
    ]);
    setIsProcessing(false);
    if (error) return toast.error("Already in wishlist or failed.");
    setIsInWishlist(true);
    toast.success("Wishlisted!");
  };

  const handleInfoButtonClick = (buttonName) => {
    setActiveInfoButton(activeInfoButton === buttonName ? null : buttonName);
  };

  // ——— Checkout ———
  const handleCheckout = () => {
    if (!user?.id) {
      toast.error("Login to proceed to checkout.");
      return;
    }
    if (!selectedDelivery) {
      toast.error("Please select a delivery option.");
      return;
    }
    navigate(`/checkout/${product.id}`, {
      state: {
        productId: product.id,
        deliveryMethod: selectedDelivery, // 'pickup' | 'door'
        variant: selectedVariant || null,
        seller,
        storeId,
      },
    });
  };

  if (!product || !seller) return <div className="loading">Loading…</div>;

  const stockPercent =
    product.initial_stock && product.initial_stock > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (Number(product.stock_quantity || 0) /
              Number(product.initial_stock)) *
              100
          )
        )
      : 0;

  // Delivery availability (support "Yes"/true or a non-empty string info)
  const dm = product.delivery_methods || {};
  const offersPickup =
    dm &&
    (dm.pickup === "Yes" ||
      dm.pickup === true ||
      (typeof dm.pickup === "string" && dm.pickup.trim() !== ""));
  const offersDoor =
    dm &&
    (dm.door === "Yes" ||
      dm.door === true ||
      (typeof dm.door === "string" && dm.door.trim() !== ""));

  // Friendly text fallback if values are just "Yes"/"No"
  const pickupInfoText =
    typeof dm.pickup === "string" && !["Yes", "No"].includes(dm.pickup)
      ? dm.pickup
      : "Pickup available. Exact pickup point will be shown at checkout.";
  const doorInfoText =
    typeof dm.door === "string" && !["Yes", "No"].includes(dm.door)
      ? dm.door
      : "Door delivery available. Cost depends on distance/urgency (calculated at checkout).";

  return (
    <div className="product-detail-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>

      <div className="product-detail-card">
        <Slider {...sliderSettings} className="image-gallery-slider">
          {product.image_gallery?.map((url, i) => (
            <div key={i}>
              <img src={url} alt={`Slide ${i}`} />
            </div>
          ))}
        </Slider>

        <div className="product-info">
          <h1>{product.name}</h1>

          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <FaStar
                key={n}
                className={
                  selectedRating >= n || product.rating >= n
                    ? "star-filled"
                    : "star-empty"
                }
                onClick={() => setSelectedRating(n)}
              />
            ))}
            <span className="review-count">({product.review_count})</span>
            {!hasRated && (
              <button onClick={handleRateProduct} className="rate-button">
                Rate
              </button>
            )}
          </div>

          <div className="price-row">
            <span className="price">
              KSH {(+product.price).toLocaleString()}
            </span>
            {product.discount > 0 && (
              <span className="discount">-{product.discount}%</span>
            )}
          </div>

          {/* Warranty & Return summary (quick view) */}
          <div className="policy-summary">
            {product.warranty && (
              <div className="policy-chip">
                <FaShieldAlt /> Warranty: {product.warranty}
              </div>
            )}
            {product.return_policy && (
              <div className="policy-chip">
                <FaUndo /> Returns: {product.return_policy}
              </div>
            )}
          </div>

          {/* Delivery selection (REQUIRED before checkout) */}
          {(offersPickup || offersDoor) && (
            <div className="delivery-options">
              <h4>Delivery Options</h4>
              <div className="delivery-radio-group">
                {offersPickup && (
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="delivery_method"
                      value="pickup"
                      checked={selectedDelivery === "pickup"}
                      onChange={() => setSelectedDelivery("pickup")}
                    />
                    <span>
                      <FaMapMarkerAlt /> Pickup station
                    </span>
                  </label>
                )}
                {offersDoor && (
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="delivery_method"
                      value="door"
                      checked={selectedDelivery === "door"}
                      onChange={() => setSelectedDelivery("door")}
                    />
                    <span>
                      <FaTruck /> Door delivery
                    </span>
                  </label>
                )}
              </div>
              <small className="muted">
                Delivery cost is calculated at checkout based on distance,
                urgency, fragility, and seller rates.
              </small>
            </div>
          )}

          {/* Info buttons (details) */}
          <div className="info-buttons-container">
            {offersPickup && (
              <button
                className={`info-button ${
                  activeInfoButton === "pickup" ? "active" : ""
                }`}
                onClick={() => handleInfoButtonClick("pickup")}
              >
                <FaMapMarkerAlt /> Pickup Info
              </button>
            )}
            {offersDoor && (
              <button
                className={`info-button ${
                  activeInfoButton === "delivery" ? "active" : ""
                }`}
                onClick={() => handleInfoButtonClick("delivery")}
              >
                <FaTruck /> Delivery Info
              </button>
            )}
            {product.warranty && product.warranty !== "No warranty" && (
              <button
                className={`info-button ${
                  activeInfoButton === "warranty" ? "active" : ""
                }`}
                onClick={() => handleInfoButtonClick("warranty")}
              >
                <FaShieldAlt /> Warranty
              </button>
            )}
            {product.return_policy && (
              <button
                className={`info-button ${
                  activeInfoButton === "return" ? "active" : ""
                }`}
                onClick={() => handleInfoButtonClick("return")}
              >
                <FaUndo /> Returns
              </button>
            )}
          </div>

          {/* Info display sections */}
          {activeInfoButton === "pickup" && (
            <div className="info-display">
              <h4>Pickup Information</h4>
              <p>{pickupInfoText}</p>
            </div>
          )}

          {activeInfoButton === "delivery" && (
            <div className="info-display">
              <h4>Delivery Information</h4>
              <p>{doorInfoText}</p>
              {dm.fee && <p>Typical delivery fee: {dm.fee}</p>}
            </div>
          )}

          {activeInfoButton === "warranty" && (
            <div className="info-display">
              <h4>Warranty Details</h4>
              <p>{product.warranty}</p>
            </div>
          )}

          {activeInfoButton === "return" && (
            <div className="info-display">
              <h4>Return Policy</h4>
              <p>{product.return_policy}</p>
            </div>
          )}

          {/* Variants */}
{Array.isArray(product.variant_options) && (
  <div className="variants">
    <h4>Select Variant:</h4>
    {product.variant_options.map((v, i) => (
      <button
        key={i}
        className={selectedVariant === v ? "variant-selected" : "variant-btn"}
        onClick={() => setSelectedVariant(v)}
      >
        {v.color || v.name || `Option ${i + 1}`}
      </button>
    ))}
  </div>
)}

          {/* Usage guide */}
          {product.usage_guide && (
            <div className="usage-guide">
              <h4>How to Use</h4>
              <p>{product.usage_guide}</p>
            </div>
          )}

          {/* Stock meter */}
          <div className="stock-status-bar">
            <label>Stock Remaining:</label>
            <div className="progress-wrapper">
              <div
                className="progress-bar"
                style={{ width: `${stockPercent}%` }}
              />
            </div>
            <span>
              {product.stock_quantity} of {product.initial_stock || 0}
            </span>
          </div>

          {/* Seller */}
          <div className="seller-info">
            <FaUser /> {seller.name} {seller.is_verified && <VerifiedBadge />}
            <div className="seller-performance">
              <span>Avg Rating: {sellerScore.avgRating} ★</span>
              <span>Sales: {sellerScore.totalSales}</span>
            </div>
            <div className="contact-info">
              <span>
                <FaMobileAlt /> {seller.contact_phone}
              </span>
              <span>
                <FaComment /> {seller.contact_email}
              </span>
            </div>
            <div className="location-info">
              <FaMapMarkerAlt /> {seller.location}
            </div>
          </div>

          {/* Actions */}
          <div className="action-buttons">
            <button
              className="buy-now"
              onClick={handleCheckout}
              disabled={isProcessing || !selectedDelivery}
              title={!selectedDelivery ? "Select a delivery option first" : ""}
            >
              <FaShoppingCart /> Proceed to Checkout
            </button>

            <button
              className="add-to-cart"
              onClick={handleAddToCart}
              disabled={isProcessing || isInCart}
            >
              <FaShoppingCart /> {isInCart ? "Already in Cart" : "Add to Cart"}
            </button>

            <button
              className="wishlist"
              onClick={handleAddToWishlist}
              disabled={isProcessing || isInWishlist}
            >
              <FaHeart /> {isInWishlist ? "In Wishlist" : "Wishlist"}
            </button>

            <button className="view-button" onClick={() => navigate("/cart")}>
              <FaEye /> View Cart
            </button>
            <button className="view-button" onClick={() => navigate("/wishlist")}>
              <FaEye /> View Wishlist
            </button>
            <button className="view-button" onClick={() => navigate("/orders")}>
              <FaEye /> View Orders
            </button>
          </div>

          {/* Ask seller */}
          <div className="interaction-zone">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the seller…"
            />
            <button onClick={handleSendMessage} disabled={sending}>
              <FaComment />
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="verified-feedback">
          <h3>Customer Feedback</h3>
          {reviews.map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-header">
                <strong>{r.profiles?.full_name || "Anonymous"}</strong>
                {r.isVerified && <VerifiedBadge />}
                <span className="stars">
                  {[...Array(r.rating)].map((_, i) => (
                    <FaStar key={i} />
                  ))}
                </span>
              </div>
              <p>"{r.comment}"</p>
              <small>{new Date(r.created_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}