export const NotificationService = {
  requestPermission: async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  showNotification: (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/logo192.png', // Fallback to a common icon if exists
        badge: '/logo192.png',
        ...options
      });
    }
    return null;
  }
};
