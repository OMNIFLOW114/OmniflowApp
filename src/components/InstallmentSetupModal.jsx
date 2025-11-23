// src/components/InstallmentSetupModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaMoneyBillWave, FaCalendar, FaPercentage, FaDollarSign, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabaseClient';
import './InstallmentSetupModal.css';

const InstallmentSetupModal = ({ product, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState({
    enabled: false,
    initialDeposit: 30,
    frequency: 'monthly',
    duration: 3,
    minPaymentAmount: 0,
    gracePeriod: 3,
    allowPartialPayments: true,
    allowEarlyCompletion: true,
    installmentSchedule: []
  });

  // Initialize with product's existing installment plan if available
  useEffect(() => {
    if (product?.installment_plan) {
      setInstallmentPlan(prev => ({
        ...prev,
        ...product.installment_plan,
        enabled: true
      }));
    }
  }, [product]);

  // Generate installment schedule based on settings
  useEffect(() => {
    if (installmentPlan.enabled && installmentPlan.duration > 0) {
      const schedule = [];
      const totalInstallments = installmentPlan.duration;
      const remainingPercentage = 100 - installmentPlan.initialDeposit;
      const installmentPercentage = remainingPercentage / totalInstallments;

      for (let i = 0; i < totalInstallments; i++) {
        schedule.push({
          installmentNumber: i + 1,
          percentage: parseFloat(installmentPercentage.toFixed(2)),
          dueInDays: (i + 1) * getDaysFromFrequency(installmentPlan.frequency)
        });
      }

      // Adjust last installment to account for rounding
      const totalCalculated = installmentPlan.initialDeposit + (installmentPercentage * totalInstallments);
      if (Math.abs(totalCalculated - 100) > 0.01) {
        schedule[schedule.length - 1].percentage = parseFloat(
          (100 - installmentPlan.initialDeposit - (installmentPercentage * (totalInstallments - 1))).toFixed(2)
        );
      }

      setInstallmentPlan(prev => ({
        ...prev,
        installmentSchedule: schedule
      }));
    }
  }, [installmentPlan.enabled, installmentPlan.initialDeposit, installmentPlan.duration, installmentPlan.frequency]);

  const getDaysFromFrequency = (frequency) => {
    switch (frequency) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'biweekly': return 14;
      case 'monthly': return 30;
      default: return 30;
    }
  };

  const handleInputChange = (field, value) => {
    setInstallmentPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...installmentPlan.installmentSchedule];
    updatedSchedule[index][field] = parseFloat(value) || 0;
    setInstallmentPlan(prev => ({
      ...prev,
      installmentSchedule: updatedSchedule
    }));
  };

  const validatePlan = () => {
    if (!installmentPlan.enabled) return true;

    const totalPercentage = installmentPlan.installmentSchedule.reduce(
      (sum, installment) => sum + installment.percentage, 0
    ) + installmentPlan.initialDeposit;

    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error(`Total percentage must be 100%. Current: ${totalPercentage.toFixed(2)}%`);
      return false;
    }

    if (installmentPlan.initialDeposit < 10) {
      toast.error('Initial deposit must be at least 10%');
      return false;
    }

    if (installmentPlan.minPaymentAmount < 0) {
      toast.error('Minimum payment amount cannot be negative');
      return false;
    }

    return true;
  };

  const saveInstallmentPlan = async () => {
    if (!validatePlan()) return;

    setLoading(true);
    try {
      const planData = installmentPlan.enabled ? {
        lipa_polepole: true,
        installment_plan: {
          enabled: true,
          initialDeposit: installmentPlan.initialDeposit,
          frequency: installmentPlan.frequency,
          duration: installmentPlan.duration,
          minPaymentAmount: installmentPlan.minPaymentAmount,
          gracePeriod: installmentPlan.gracePeriod,
          allowPartialPayments: installmentPlan.allowPartialPayments,
          allowEarlyCompletion: installmentPlan.allowEarlyCompletion,
          installmentSchedule: installmentPlan.installmentSchedule
        }
      } : {
        lipa_polepole: false,
        installment_plan: null
      };

      const { error } = await supabase
        .from('products')
        .update(planData)
        .eq('id', product.id);

      if (error) throw error;

      toast.success(installmentPlan.enabled ? 'Installment plan saved successfully!' : 'Installment plan disabled');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving installment plan:', error);
      toast.error('Failed to save installment plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop installment-modal">
      <motion.div 
        className="modal-content installment-modal-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="modal-header">
          <div className="modal-title">
            <FaMoneyBillWave className="title-icon" />
            <h2>Lipa Mdogo Mdogo Setup</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          {/* Enable/Disable Toggle */}
          <div className="toggle-section">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={installmentPlan.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Enable Lipa Mdogo Mdogo for this product</span>
            </label>
          </div>

          <AnimatePresence>
            {installmentPlan.enabled && (
              <motion.div
                className="installment-settings"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Basic Settings */}
                <div className="settings-section">
                  <h3>Payment Plan Settings</h3>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <FaPercentage className="input-icon" />
                        Initial Deposit (%)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="90"
                        step="1"
                        value={installmentPlan.initialDeposit}
                        onChange={(e) => handleInputChange('initialDeposit', parseFloat(e.target.value))}
                      />
                      <small>Minimum 10% of product price</small>
                    </div>

                    <div className="form-group">
                      <label>
                        <FaCalendar className="input-icon" />
                        Payment Frequency
                      </label>
                      <select
                        value={installmentPlan.frequency}
                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        <FaCalendar className="input-icon" />
                        Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={installmentPlan.duration}
                        onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <FaDollarSign className="input-icon" />
                        Min Payment (Ksh)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={installmentPlan.minPaymentAmount}
                        onChange={(e) => handleInputChange('minPaymentAmount', parseFloat(e.target.value))}
                        placeholder="0 for no minimum"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="settings-section">
                  <h3>Advanced Settings</h3>
                  
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={installmentPlan.allowPartialPayments}
                        onChange={(e) => handleInputChange('allowPartialPayments', e.target.checked)}
                      />
                      Allow partial payments
                      <FaInfoCircle className="info-icon" title="Buyers can pay any amount above minimum" />
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={installmentPlan.allowEarlyCompletion}
                        onChange={(e) => handleInputChange('allowEarlyCompletion', e.target.checked)}
                      />
                      Allow early completion
                      <FaInfoCircle className="info-icon" title="Buyers can pay full amount anytime" />
                    </label>
                  </div>

                  <div className="form-group">
                    <label>Grace Period (Days)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={installmentPlan.gracePeriod}
                      onChange={(e) => handleInputChange('gracePeriod', parseInt(e.target.value))}
                    />
                    <small>Days allowed after due date before marking as overdue</small>
                  </div>
                </div>

                {/* Installment Schedule Preview */}
                <div className="settings-section">
                  <h3>Payment Schedule</h3>
                  <div className="schedule-preview">
                    <div className="schedule-header">
                      <span>Installment</span>
                      <span>Percentage</span>
                      <span>Due After</span>
                    </div>
                    {installmentPlan.installmentSchedule.map((installment, index) => (
                      <div key={index} className="schedule-item">
                        <span>#{installment.installmentNumber}</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="0.01"
                          value={installment.percentage}
                          onChange={(e) => handleScheduleChange(index, 'percentage', e.target.value)}
                        />
                        <span>{installment.dueInDays} days</span>
                      </div>
                    ))}
                    <div className="schedule-total">
                      <span>Total</span>
                      <span className="total-percentage">
                        {(
                          installmentPlan.initialDeposit + 
                          installmentPlan.installmentSchedule.reduce((sum, i) => sum + i.percentage, 0)
                        ).toFixed(2)}%
                      </span>
                      <span></span>
                    </div>
                  </div>
                </div>

                {/* Price Calculation Preview */}
                {product?.price && (
                  <div className="price-preview">
                    <h4>Price Breakdown</h4>
                    <div className="price-items">
                      <div className="price-item">
                        <span>Product Price:</span>
                        <span>Ksh {product.price.toLocaleString()}</span>
                      </div>
                      <div className="price-item">
                        <span>Initial Deposit ({installmentPlan.initialDeposit}%):</span>
                        <span>Ksh {(product.price * installmentPlan.initialDeposit / 100).toLocaleString()}</span>
                      </div>
                      {installmentPlan.installmentSchedule.map((installment, index) => (
                        <div key={index} className="price-item installment">
                          <span>Installment #{installment.installmentNumber} ({installment.percentage}%):</span>
                          <span>Ksh {(product.price * installment.percentage / 100).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="price-item total">
                        <span>Total Amount:</span>
                        <span>Ksh {product.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={saveInstallmentPlan}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Installment Plan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default InstallmentSetupModal;