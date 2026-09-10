import { supabase } from "./supabaseClient"; // Your Supabase client

const VAPID_PUBLIC_KEY = "your-public-key-from-step-1";

// Convert base64 to Uint8Array (required for applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register service worker
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

// Check if push is supported
export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Get current subscription status
export async function getSubscriptionStatus() {
  if (!isPushSupported()) return "unsupported";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) return "subscribed";
  if (Notification.permission === "denied") return "denied";
  return "not-subscribed";
}

// Subscribe user to push notifications
export async function subscribeToPush() {
  // 1. Check support
  if (!isPushSupported()) {
    throw new Error("Push notifications not supported in this browser");
  }

  // 2. Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // 3. Request permission (must be triggered by user action)
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  // 4. Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // 5. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // 6. Save subscription to Supabase
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      subscription: subscription.toJSON(),
    },
    {
      onConflict: "user_id", // Replace existing subscription for this user
    }
  );

  if (error) {
    throw new Error(`Failed to save subscription: ${error.message}`);
  }

  return subscription;
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);
    }
  }
}