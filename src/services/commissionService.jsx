// src/services/commissionService.js

export const calculateDepositFee = (amount) => {
    return amount * 0.014; // 1.4% fee
  };
  
  export const calculateWithdrawFee = (amount) => {
    if (amount <= 100) return amount * 0.0045; // 0.45%
    if (amount <= 500) return amount * 0.015;  // 1.5%
    return amount * 0.0175;                    // 1.75%
  };
  
  export const calculateSendFee = (amount) => {
    const withdrawFee = calculateWithdrawFee(amount);
    const sendFee = withdrawFee - (withdrawFee * 0.25); // 25% lower than withdraw fee
    return sendFee;
  };
  