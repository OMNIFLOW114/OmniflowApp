import OneSignal from 'onesignal-sdk';

const initOneSignal = () => {
  OneSignal.init({
    appId: "d899c360-c689-4a89-a70d-ecbd3864809d",
    allowLocalhostAsSecureOrigin: true, // For local testing
    serviceWorkerPath: "/OneSignalSDKWorker.js",
    // VAPID_PUBLIC_KEY will be added here once provided
  });
};

const registerDevice = async (userId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const playerId = await OneSignal.getUserId();
      if (playerId) {
        const { error } = await supabase.from("user_devices").upsert({
          user_id: userId,
          device_token: playerId,
          platform: "web",
          updated_at: new Date().toISOString(),
        });
        if (error) console.error("Device registration error:", error);
      }
    }
  } catch (error) {
    console.error("OneSignal registration error:", error);
  }
};

export { initOneSignal, OneSignal, registerDevice };