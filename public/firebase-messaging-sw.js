importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "socongviecdientu",
  appId: "1:370831062165:web:83b6994dd25c991896579c",
  apiKey: "AIzaSyA1CZWfquO68qfkNyizBfN_9n7ydgCB5TQ",
  authDomain: "socongviecdientu.firebaseapp.com",
  storageBucket: "socongviecdientu.firebasestorage.app",
  messagingSenderId: "370831062165"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 🔥 Android / Chrome
messaging.onBackgroundMessage((payload) => {
  console.log('🔥 Background message:', payload);

  const title = payload.notification?.title || 'Thông báo mới';
  const options = {
    body: payload.notification?.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(title, options);
});

// 🔥🔥🔥 QUAN TRỌNG NHẤT CHO iPHONE
self.addEventListener('push', function(event) {
  console.log('📱 iOS Push event:', event);

  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    console.log('Push parse error', e);
  }

  const title = data.notification?.title || 'Thông báo mới';
  const options = {
    body: data.notification?.body || '',
    icon: '/icon-192.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
