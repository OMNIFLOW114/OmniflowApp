import React from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaPaperPlane,
  FaGift,
  FaPercentage,
  FaMoneyBillWave,
  FaLock,
  FaUnlock,
  FaShoppingCart,
  FaWallet,
  FaClipboardList,
} from "react-icons/fa";

const WalletTransactions = ({ transactions, loading, user }) => {
  if (loading) {
    return (
      <p className="text-center text-sm text-gray-400">
        Loading transactions...
      </p>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400">
        No transactions yet.
      </p>
    );
  }

  // --- Icon rendering ---
  const renderIcon = (type) => {
    switch (type) {
      case "deposit":
        return <FaArrowDown className="text-green-500" />;
      case "withdraw":
        return <FaArrowUp className="text-red-500" />;
      case "send":
        return <FaPaperPlane className="text-yellow-400" />;
      case "receive":
        return <FaGift className="text-blue-400" />;
      case "commission":
        return <FaPercentage className="text-purple-400" />;
      case "installment":
      case "purchase_balance":
        return <FaMoneyBillWave className="text-orange-500" />;
      case "purchase":
        return <FaShoppingCart className="text-indigo-500" />;
      case "escrow_hold":
        return <FaLock className="text-gray-500" />;
      case "escrow_receive":
        return <FaUnlock className="text-green-600" />;
      case "credit":
        return <FaWallet className="text-teal-500" />;
      case "admin_log":
        return <FaClipboardList className="text-gray-700" />;
      default:
        return <span className="text-gray-400">•</span>;
    }
  };

  const formatOMC = (amount) =>
    `${Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })} OMC`;

  // --- Human readable messages ---
  const getMessage = (txn) => {
    switch (txn.type) {
      /** ========== BUYER SIDE ========== **/
      case "deposit":
        return `You deposited ${formatOMC(txn.amount)} via ${txn.payment_method || "an external method"}.`;

      case "withdraw":
        return `You withdrew ${formatOMC(txn.amount)} to ${txn.phone || txn.payment_method || "your account"}.`;

      case "purchase":
        return `You purchased a product for ${formatOMC(txn.amount)} (Order #${txn.order_id}).`;

      case "escrow_hold":
        return `Your funds of ${formatOMC(txn.amount)} have been held in escrow for Order #${txn.order_id}.`;

      case "escrow_release": // logged for buyer
        return `Escrow released to the seller for Order #${txn.order_id}. Thank you for your purchase!`;

      /** ========== SELLER SIDE ========== **/
      case "escrow_receive": // logged for seller
        return `Escrow released: You received ${formatOMC(txn.amount)} for Order #${txn.order_id}.`;

      case "installment":
      case "purchase_balance":
        if (txn.role === "buyer") {
          return `You paid ${formatOMC(txn.amount)} as a balance payment for Order #${txn.order_id}.`;
        } else if (txn.role === "seller") {
          return `You received ${formatOMC(txn.amount)} as a balance payment from the buyer for Order #${txn.order_id}.`;
        } else {
          return `Balance installment of ${formatOMC(txn.amount)} processed.`;
        }

      /** ========== ADMIN SIDE ========== **/
      case "admin_log":
        return txn.message || `Admin log: Sale recorded for Order #${txn.order_id}.`;

      /** ========== GENERAL ========== **/
      case "send":
        return `You sent ${formatOMC(txn.amount)} to ${txn.receiver_email || "another user"}.`;

      case "receive":
        return `You received ${formatOMC(txn.amount)} from ${txn.sender_email || "another user"}.`;

      case "commission":
        return `Commission earned: ${formatOMC(txn.amount)}.`;

      case "credit":
        return `You were credited ${formatOMC(txn.amount)} to your wallet.`;

      default:
        return txn.message || "Transaction completed.";
    }
  };

  return (
    <div className="wallet-transaction-timeline">
      <h4 className="text-lg font-semibold text-yellow-500 mb-4">
        Your Recent Transactions
      </h4>

      {transactions.map((txn, index) => (
        <div
          key={index}
          className={`wallet-transaction-card ${txn.type} border-b border-gray-200 py-3`}
        >
          <div className="flex items-center gap-4">
            <div className="text-2xl">{renderIcon(txn.type)}</div>
            <div className="flex flex-col">
              {/* Main message */}
              <p className="txn-message font-medium text-gray-800">
                {getMessage(txn)}
              </p>

              {/* Amount */}
              <span className="txn-amount text-sm font-semibold text-gray-600">
                Amount: {formatOMC(txn.amount)}
              </span>

              {/* New balance (auto-calculated by trigger) */}
              {txn.new_balance !== undefined && (
                <span className="txn-balance text-xs text-gray-500">
                  New Balance: {formatOMC(txn.new_balance)}
                </span>
              )}

              {/* Date */}
              <span className="txn-date text-xs text-gray-400 mt-1">
                {new Date(txn.created_at).toLocaleString("en-KE", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WalletTransactions;
