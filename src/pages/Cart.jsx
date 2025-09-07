import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaTrash, FaShoppingCart } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, products (*)")
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to load cart.");
        return;
      }

      setCartItems(data || []);
      setLoading(false);
    };

    fetchCart();
  }, [user]);

  const handleRemoveFromCart = async (cartId) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", cartId);
    if (error) {
      toast.error("Failed to remove item.");
    } else {
      setCartItems((prev) => prev.filter((item) => item.id !== cartId));
      toast.success("Removed from cart.");
    }
  };

  const handleCheckout = () => {
    // You can expand this with your actual checkout route
    toast.success("Redirecting to checkout...");
    navigate("/checkout");
  };

  const totalAmount = cartItems.reduce((acc, item) => {
    const product = item.products;
    if (!product) return acc;
    const price = Number(product.price) || 0;
    const quantity = item.quantity || 1;
    const discountedPrice = price - (price * (Number(product.discount) || 0) / 100);
    return acc + discountedPrice * quantity;
  }, 0);

  if (loading) return <div className="cart-container">Loading...</div>;

  return (
    <div className="cart-container">
      <h2><FaShoppingCart /> My Cart</h2>
      {cartItems.length === 0 ? (
        <p className="empty">No items in cart.</p>
      ) : (
        <>
          <div className="cart-grid">
            {cartItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              const discountedPrice =
                Number(product.price) - (Number(product.price) * Number(product.discount || 0)) / 100;

              return (
                <div className="cart-card" key={item.id}>
                  <img
                    src={product.image_gallery?.[0] || product.image_url}
                    alt={product.name}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                  <div className="cart-info">
                    <h4>{product.name}</h4>
                    <p>
                      KSH {discountedPrice.toLocaleString()} x {item.quantity}
                    </p>
                    <button className="remove" onClick={() => handleRemoveFromCart(item.id)}>
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <p>Total: <strong>KSH {totalAmount.toLocaleString()}</strong></p>
            <button className="checkout-btn" onClick={handleCheckout}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
