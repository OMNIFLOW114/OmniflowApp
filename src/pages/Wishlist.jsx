import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { FaHeart, FaTrash, FaShoppingCart } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "./Wishlist.css";

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product_id, products (*)")
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to load wishlist.");
        return;
      }

      setWishlistItems(data || []);
      setLoading(false);
    };

    fetchWishlist();
  }, [user]);

  const handleRemoveFromWishlist = async (wishlistId) => {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", wishlistId);

    if (error) {
      toast.error("Failed to remove item.");
    } else {
      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistId));
      toast.success("Removed from wishlist.");
    }
  };

  const handleMoveToCart = async (item) => {
    const { error: insertError } = await supabase.from("cart_items").insert([
      {
        user_id: user.id,
        product_id: item.product_id,
        quantity: 1,
      },
    ]);

    if (insertError) {
      toast.error("Already in cart or failed.");
      return;
    }

    // Remove from wishlist after adding to cart
    await handleRemoveFromWishlist(item.id);
    toast.success("Moved to cart!");
  };

  if (loading) return <div className="wishlist-container">Loading...</div>;

  return (
    <div className="wishlist-container">
      <h2><FaHeart /> My Wishlist</h2>
      {wishlistItems.length === 0 ? (
        <p className="empty">No items in wishlist.</p>
      ) : (
        <div className="wishlist-grid">
          {wishlistItems.map((item) => {
            const product = item.products;
            if (!product) return null;

            return (
              <div className="wishlist-card" key={item.id}>
                <img
                  src={product.image_gallery?.[0] || product.image_url}
                  alt={product.name}
                  onClick={() => navigate(`/product/${product.id}`)}
                />
                <div className="wishlist-info">
                  <h4>{product.name}</h4>
                  <p>KSH {Number(product.price).toLocaleString()}</p>
                  <div className="wishlist-buttons">
                    <button onClick={() => handleMoveToCart(item)}>
                      <FaShoppingCart /> Move to Cart
                    </button>
                    <button
                      className="remove"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
