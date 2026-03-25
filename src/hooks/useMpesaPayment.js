// src/hooks/useMpesaPayment.js
import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { mpesaService } from '@/services/mpesaService';

export const useMpesaPayment = () => {
  const [loading, setLoading] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [currentCheckoutId, setCurrentCheckoutId] = useState(null);
  
  const initiateWalletDeposit = useCallback(async (
    phoneNumber, 
    amount, 
    userId,
    onSuccess,
    onError
  ) => {
    setLoading(true);
    
    try {
      const result = await mpesaService.depositToWallet(phoneNumber, amount, userId);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Show initial success toast
      toast.success(result.message || 'Payment initiated!', {
        duration: 5000,
        icon: '📱'
      });
      
      setCurrentCheckoutId(result.checkoutRequestID);
      setPollingActive(true);
      
      // Start polling for transaction status
      const cleanup = await mpesaService.pollTransactionStatus(
        result.checkoutRequestID,
        (status) => {
          setPollingActive(false);
          setCurrentCheckoutId(null);
          
          if (status.status === 'completed') {
            // Success!
            toast.success(
              `Payment successful!\nAmount: KES ${status.amount?.toLocaleString()}\nReceipt: ${status.mpesaReceipt}`,
              { duration: 8000, icon: '✅' }
            );
            if (onSuccess) onSuccess(status.mpesaReceipt, status.amount);
          } else {
            // Failed
            toast.error('Payment failed. Please try again.', { duration: 5000 });
            if (onError) onError('Payment failed');
          }
          setLoading(false);
        },
        (error) => {
          setPollingActive(false);
          setCurrentCheckoutId(null);
          toast.error(error.message, { duration: 5000 });
          if (onError) onError(error.message);
          setLoading(false);
        }
      );
      
      return { checkoutRequestID: result.checkoutRequestID, cleanup };
      
    } catch (error) {
      console.error('Deposit initiation error:', error);
      const errorMessage = error.message || 'Failed to initiate payment';
      toast.error(errorMessage, { duration: 5000 });
      if (onError) onError(errorMessage);
      setLoading(false);
      throw error;
    }
  }, []);
  
  const initiateOrderPayment = useCallback(async (
    phoneNumber,
    amount,
    orderId,
    onSuccess,
    onError
  ) => {
    setLoading(true);
    
    try {
      const result = await mpesaService.payForOrder(phoneNumber, amount, orderId);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      toast.success(result.message || 'Payment initiated!', {
        duration: 5000,
        icon: '📱'
      });
      
      setCurrentCheckoutId(result.checkoutRequestID);
      setPollingActive(true);
      
      const cleanup = await mpesaService.pollTransactionStatus(
        result.checkoutRequestID,
        (status) => {
          setPollingActive(false);
          setCurrentCheckoutId(null);
          
          if (status.status === 'completed') {
            toast.success('Payment successful! Your order has been placed.', { duration: 5000, icon: '✅' });
            if (onSuccess) onSuccess(status.mpesaReceipt, status.amount);
          } else {
            toast.error('Payment failed. Please try again.', { duration: 5000 });
            if (onError) onError('Payment failed');
          }
          setLoading(false);
        },
        (error) => {
          setPollingActive(false);
          setCurrentCheckoutId(null);
          toast.error(error.message, { duration: 5000 });
          if (onError) onError(error.message);
          setLoading(false);
        }
      );
      
      return { checkoutRequestID: result.checkoutRequestID, cleanup };
      
    } catch (error) {
      console.error('Order payment error:', error);
      const errorMessage = error.message || 'Failed to initiate payment';
      toast.error(errorMessage, { duration: 5000 });
      if (onError) onError(errorMessage);
      setLoading(false);
      throw error;
    }
  }, []);
  
  const cancelPolling = useCallback(() => {
    setPollingActive(false);
    setCurrentCheckoutId(null);
    setLoading(false);
  }, []);
  
  return {
    initiateWalletDeposit,
    initiateOrderPayment,
    loading,
    pollingActive,
    currentCheckoutId,
    cancelPolling
  };
};