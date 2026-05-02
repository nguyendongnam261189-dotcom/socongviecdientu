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

// Khởi tạo Firebase app trong Service Worker
firebase.initializeApp(firebaseConfig);

// Khởi tạo Firebase Messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Thông báo mới';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
