/* ═══════════════════════════════════════════════
   shared/firebase.js
   Firebase Initialization & Shared Config
   ═══════════════════════════════════════════════ */

var firebaseConfig = {
  apiKey:        'AIzaSyDBtM8x62v2KafPuGtiE29gRF7IxM2pITU',
  authDomain:    'np-webapp-74616.firebaseapp.com',
  projectId:     'np-webapp-74616',
  storageBucket: 'np-webapp-74616.firebasestorage.app',
  appId:         '1:275537025660:web:4fdc11e0fe22e679f6c7f9'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

var auth    = firebase.auth();
var db      = firebase.firestore();
var storage = firebase.storage();

/* ── LINE Config ── */
var LINE_CH        = '2009342857';
var LINE_CB        = 'https://np-school.github.io/webapp/index.html';
var LINE_PROXY_URL = 'https://us-central1-np-webapp-74616.cloudfunctions.net/lineProxy';
