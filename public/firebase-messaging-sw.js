// Firebase Cloud Messaging Service Worker
// Place this at /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Replace these values with your actual Firebase config
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);

  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || 'Sri Vinayaka Temple', {
    body: body || 'New update from the temple.',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
  });
});
