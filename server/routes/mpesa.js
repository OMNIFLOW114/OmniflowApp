const express = require('express');
const router = express.Router();

// ============================================================
// CONFIRMATION ENDPOINT - Called by Safaricom
// ============================================================
router.post('/confirmation', async (req, res) => {
  console.log('📥 M-Pesa confirmation received at:', new Date().toISOString());
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Forward to Supabase Edge Function
    const response = await fetch('https://kkxgrrcbyluhdfsoywvd.supabase.co/functions/v1/mpesa/confirmation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGdycmNieWx1aGRmc295d3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjgxNTksImV4cCI6MjA2NDM0NDE1OX0.H_zvbQjyp34cwu5Z9spmTb0bA4B_hjRhHA6ns3M-9gs'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    console.log('✅ Forwarded to Supabase, response:', data);
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
    
  } catch (error) {
    console.error('❌ Error forwarding:', error.message);
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  }
});

// ============================================================
// VALIDATION ENDPOINT - Called by Safaricom
// ============================================================
router.post('/validation', async (req, res) => {
  console.log('🔍 M-Pesa validation received at:', new Date().toISOString());
  
  try {
    await fetch('https://kkxgrrcbyluhdfsoywvd.supabase.co/functions/v1/mpesa/validation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGdycmNieWx1aGRmc295d3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjgxNTksImV4cCI6MjA2NDM0NDE1OX0.H_zvbQjyp34cwu5Z9spmTb0bA4B_hjRhHA6ns3M-9gs'
      },
      body: JSON.stringify(req.body)
    });
  } catch (error) {
    console.error('❌ Validation forward error:', error.message);
  }
  
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// ============================================================
// STK PUSH ENDPOINT - Called by your React app
// ============================================================
router.post('/stk-push', async (req, res) => {
  console.log('💰 STK Push request received:', req.body);
  
  try {
    const response = await fetch('https://kkxgrrcbyluhdfsoywvd.supabase.co/functions/v1/mpesa/stk-push', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGdycmNieWx1aGRmc295d3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjgxNTksImV4cCI6MjA2NDM0NDE1OX0.H_zvbQjyp34cwu5Z9spmTb0bA4B_hjRhHA6ns3M-9gs'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('❌ STK Push forward error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;