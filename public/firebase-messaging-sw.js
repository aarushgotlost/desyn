
// This file is intentionally kept simple for now.
// You might need to import and initialize Firebase SDK here if you plan complex background message handling.
// For basic notifications handled when app is in background, this might be sufficient.

// For now, this file only needs to exist. If you add more complex push notification
// handling, you'll need to configure it here.
// console.log("Firebase Messaging Service Worker starting up...");

// If you have Firebase SDK v9 or later:
// import { initializeApp } from "firebase/app";
// import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID",
//   measurementId: "YOUR_MEASUREMENT_ID" // Optional
// };

// if (!firebase.apps.length) {
//   initializeApp(firebaseConfig);
// }

// const messaging = getMessaging();

// onBackgroundMessage(messaging, (payload) => {
//   console.log('[firebase-messaging-sw.js] Received background message ', payload);
//   // Customize notification here
//   const notificationTitle = payload.notification?.title || 'New Message';
//   const notificationOptions = {
//     body: payload.notification?.body || 'You have a new message.',
//     icon: payload.notification?.icon || '/logo.svg' // default icon
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });

self.addEventListener('push', function(event) {
  // console.log('[Service Worker] Push Received.');
  // console.log(`[Service Worker] Push had this data: "${event.data?.text()}"`);

  // Default title and options if payload is empty or malformed
  let title = 'Desyn Notification';
  let options = {
    body: 'You have a new update!',
    icon: '/logo.svg', // Path to your app's icon
    badge: '/logo.svg', // Path to a badge icon
  };

  if (event.data) {
    try {
      const data = event.data.json(); // Assuming payload is JSON
      title = data.notification?.title || title;
      options.body = data.notification?.body || options.body;
      options.icon = data.notification?.icon || options.icon;
      // You can add more options like 'data' for click actions, 'actions' for buttons, etc.
      // options.data = data.data || { url: '/' }; // Example: URL to open on click
    } catch (e) {
      // If JSON parsing fails, use the text directly if available
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  // console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  
  // Example: Open a specific URL or focus an existing window
  // const urlToOpen = event.notification.data?.url || '/'; // Get URL from notification data if set
  // event.waitUntil(
  //   clients.matchAll({ type: 'window' }).then((clientList) => {
  //     for (const client of clientList) {
  //       if (client.url === urlToOpen && 'focus' in client) {
  //         return client.focus();
  //       }
  //     }
  //     if (clients.openWindow) {
  //       return clients.openWindow(urlToOpen);
  //     }
  //   })
  // );
});
