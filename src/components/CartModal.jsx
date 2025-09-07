// components/CartModal.jsx
import React from 'react';

const CartModal = ({ cart, onClose, onRemoveFromCart }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center backdrop-blur-md">
      <div className="bg-[#0f0f0f] text-white p-6 rounded-2xl shadow-xl border border-[#3f3f3f] w-[90%] md:w-[600px] max-h-[80vh] overflow-y-auto relative">
        <h2 className="text-2xl font-bold text-neonblue mb-4">🛒 Your Cart</h2>
        {cart.length === 0 ? (
          <p className="text-gray-400">Your cart is empty. Start adding some cosmic finds!</p>
        ) : (
          <>
            {cart.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#1a1a1a] rounded-xl p-3 mb-3 hover:scale-[1.02] transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.images?.[0]}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[#444]"
                  />
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-400">${item.price}</p>
                  </div>
                </div>
                <button
                  className="text-sm text-red-500 hover:text-red-300 transition"
                  onClick={() => onRemoveFromCart(item.id)}
                >
                  ✖ Remove
                </button>
              </div>
            ))}
            <div className="mt-6 text-right">
              <button
                className="bg-gradient-to-br from-neonblue to-purple-500 px-5 py-2 rounded-lg font-semibold shadow-lg hover:scale-105 transition-all"
                onClick={onClose}
              >
                Checkout 🚀
              </button>
            </div>
          </>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          ✖
        </button>
      </div>
    </div>
  );
};

export default CartModal;
