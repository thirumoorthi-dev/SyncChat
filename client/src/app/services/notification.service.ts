import api from './axiosClient';

const VAPID_PUBLIC_KEY = 'BGbykO2ZBg98Z-GJWb_R4o8KEkS06gNOfjqIZ4XCKnrgnZyf0eqQiy0J3YmBX5plTDmy1D21H7OlkHaO4SwTmag';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Send subscription to server
    await api.post('/notifications/subscribe', subscription);
    console.log('User subscribed to push notifications');
  } catch (error) {
    console.error('Failed to subscribe user to push:', error);
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await subscribeUserToPush();
    return true;
  }
  return false;
}
