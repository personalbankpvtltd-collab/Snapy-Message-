export const notificationService = {
  requestPermission: async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  getPermissionState: () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  showNotification: (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      const defaultOptions: any = {
        icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
        vibrate: [200, 100, 200],
        ...options
      };
      
      // Try to show via service worker first (better for background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        // Fallback to standard Notification
        new Notification(title, defaultOptions);
      }
    }
  },

  repairNotifications: async () => {
    if (!('serviceWorker' in navigator)) return false;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      // Sending a silent notification often "wakes up" the Android notification channel
      await registration.showNotification('Snapy Sync', {
        body: 'Syncing notification channels...',
        silent: true,
        tag: 'sync',
        icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png'
      });
      return true;
    } catch (e) {
      console.error('Repair failed:', e);
      return false;
    }
  }
};
