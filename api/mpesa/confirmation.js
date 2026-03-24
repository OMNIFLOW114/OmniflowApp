// api/mpesa/confirmation.js
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📥 Confirmation received at:', new Date().toISOString());
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

    // Return success to Safaricom
    res.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('❌ Error forwarding:', error.message);
    // Always return success to Safaricom even if forwarding fails
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  }
}