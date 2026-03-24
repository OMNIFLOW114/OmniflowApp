// api/mpesa/validation.js
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔍 Validation received at:', new Date().toISOString());

  try {
    // Forward to Supabase Edge Function
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

  // Always accept payments
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}