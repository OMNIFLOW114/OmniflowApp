// src/services/mpesaService.js
import { supabase } from "@/supabase";

class MpesaService {
  constructor() {
    this.functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa`;
  }
  
  // Get auth token for the current user
  async getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Initiate STK Push
  async initiateSTKPush(params) {
    try {
      console.log('📤 Sending STK Push with params:', params);
      
      const headers = await this.getAuthHeader();
      console.log('📋 Headers:', headers);
      
      const response = await fetch(`${this.functionUrl}/stk-push`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });
      
      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }
      
      return {
        success: true,
        checkoutRequestID: data.checkoutRequestID,
        message: data.message
      };
    } catch (error) {
      console.error('STK Push error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment'
      };
    }
  }
  
  // Check transaction status
  async checkTransactionStatus(checkoutRequestID) {
    try {
      const headers = await this.getAuthHeader();
      
      const response = await fetch(`${this.functionUrl}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ checkoutRequestID })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return null;
      }
      
      return {
        checkoutRequestID: data.transaction.checkout_request_id,
        status: data.transaction.status,
        amount: data.transaction.amount,
        mpesaReceipt: data.transaction.mpesa_receipt,
        resultCode: data.transaction.result_code,
        resultDesc: data.transaction.result_desc
      };
    } catch (error) {
      console.error('Status check error:', error);
      return null;
    }
  }
  
  // Poll transaction status
  async pollTransactionStatus(checkoutRequestID, onComplete, onError, maxAttempts = 60, interval = 2000) {
    let attempts = 0;
    let isCompleted = false;
    
    const poll = setInterval(async () => {
      attempts++;
      
      if (isCompleted) {
        clearInterval(poll);
        return;
      }
      
      try {
        const status = await this.checkTransactionStatus(checkoutRequestID);
        
        if (status && status.status !== 'pending') {
          isCompleted = true;
          clearInterval(poll);
          onComplete(status);
        } else if (attempts >= maxAttempts) {
          clearInterval(poll);
          if (onError) {
            onError(new Error('Transaction timeout. Please check your M-Pesa app for status.'));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          if (onError) {
            onError(new Error('Failed to check transaction status. Please check your M-Pesa app.'));
          }
        }
      }
    }, interval);
    
    return () => {
      clearInterval(poll);
      isCompleted = true;
    };
  }
  
  // Wallet deposit with polling
  async depositToWallet(phoneNumber, amount, userId) {
    try {
      // Validate userId
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Format phone number (remove leading 0, add 254)
      const formattedPhone = phoneNumber.replace(/^0/, '254');
      const roundedAmount = Math.round(amount);
      
      console.log('Deposit params:', {
        phoneNumber: formattedPhone,
        amount: roundedAmount,
        type: 'WALLET',
        referenceId: userId
      });
      
      // Initiate payment
      const result = await this.initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: roundedAmount,
        type: 'WALLET',
        referenceId: userId
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        message: 'Please check your phone to complete the payment',
        checkoutRequestID: result.checkoutRequestID
      };
      
    } catch (error) {
      console.error('Deposit error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate deposit'
      };
    }
  }
  
  // Order payment
  async payForOrder(phoneNumber, amount, orderId) {
    try {
      const formattedPhone = phoneNumber.replace(/^0/, '254');
      
      const result = await this.initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: Math.round(amount),
        type: 'ORDER',
        referenceId: orderId,
        orderId: orderId
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        message: 'Please check your phone to complete the payment',
        checkoutRequestID: result.checkoutRequestID
      };
      
    } catch (error) {
      console.error('Order payment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate payment'
      };
    }
  }
  
  // Installment payment
  async payInstallment(phoneNumber, amount, installmentOrderId) {
    try {
      const formattedPhone = phoneNumber.replace(/^0/, '254');
      
      const result = await this.initiateSTKPush({
        phoneNumber: formattedPhone,
        amount: Math.round(amount),
        type: 'INSTALLMENT',
        referenceId: installmentOrderId,
        installmentOrderId: installmentOrderId
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        message: 'Please check your phone to complete the payment',
        checkoutRequestID: result.checkoutRequestID
      };
      
    } catch (error) {
      console.error('Installment payment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate payment'
      };
    }
  }
}

export const mpesaService = new MpesaService();