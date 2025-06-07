
// Firebase V9 SDK imports for the service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT: Replace this with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXpHoGCjeavDoJog2gSVj6lfPnVFY5oGs",
  authDomain: "desyn-dcef7.firebaseapp.com",
  projectId: "desyn-dcef7",
  storageBucket: "desyn-dcef7.appspot.com",
  messagingSenderId: "655959843333",
  appId: "1:655959843333:web:950355b7bfa7ec6fb8726c",
  measurementId: "G-K1HYBSY780",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/logo.svg', // Default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: If you want to do something when a notification is clicked by the user
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  event.notification.close();
  // Add logic here to open a specific page or focus the app
  // For example, to open the app's root URL:
  // event.waitUntil(
  //   clients.openWindow('/')
  // );
});
