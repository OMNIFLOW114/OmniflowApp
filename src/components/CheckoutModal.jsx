import React from "react";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";

const CheckoutModal = ({ cart, buyer, onClose }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (!buyer) return toast.error("Login required");

    try {
      const { data: buyerWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", buyer.id)
        .single();

      if (!buyerWallet || buyerWallet.balance < total) {
        return toast.error("Insufficient OmniCash");
      }

      for (let item of cart) {
        const subtotal = item.price * item.qty;
        const commission = subtotal * 0.02;
        const netToSeller = subtotal - commission;

        // Credit seller
        await supabase
          .from("wallets")
          .update({ balance: supabase.literal(`balance + ${netToSeller}`) })
          .eq("id", item.ownerId);

        // Credit admin
        await supabase
          .from("wallets")
          .update({ balance: supabase.literal(`balance + ${commission}`) })
          .eq("id", "omni_admin_wallet");

        // Insert order
        await supabase.from("orders").insert({
          buyer_id: buyer.id,
          buyer_email: buyer.email,
          product_id: item.id,
          product_name: item.name,
          quantity: item.qty,
          price_per_item: item.price,
          total: subtotal,
          commission,
          seller_id: item.ownerId,
          store_id: item.storeId,
          status: "Pending",
        });
      }

      // Deduct from buyer
      await supabase
        .from("wallets")
        .update({ balance: supabase.literal(`balance - ${total}`) })
        .eq("id", buyer.id);

      toast.success("✅ Order placed successfully!");
      onClose();
    } catch (err) {
      console.error("Checkout Error", err);
      toast.error("Transaction failed");
    }
  };

  return (
    <motion.div
      className="checkout-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="checkout-modal glow glass-blur"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
      >
        <h2 className="neon-text">🛍 Confirm Your Purchase</h2>
        <ul className="checkout-items">
          {cart.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong> × {item.qty} —{" "}
              <span>KSH {(item.price * item.qty).toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <p className="checkout-total">
          Total: <strong className="gold-text">KSH {total.toLocaleString()}</strong>
        </p>
        <div className="checkout-actions">
          <button className="gold-button" onClick={handleCheckout}>
            Confirm & Pay
          </button>
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CheckoutModal;
