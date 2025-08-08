// // firebase-config.js
// import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// // Configuração do Firebase
// const firebaseConfig = {
//   apiKey: "AIzaSyB6Vm00Mp5RjAEQrmgStWr4dSg6gqJj01A",
//   authDomain: "controlefinanceirosalazar.firebaseapp.com",
//   projectId: "controlefinanceirosalazar",
//   storageBucket: "controlefinanceirosalazar.appspot.com",
//   messagingSenderId: "323202353724",
//   appId: "1:323202353724:web:e9c1a0c3b8f1d2e3f4a5b6"
// };

// // Inicializa Firebase apenas se ainda não estiver inicializado
// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// // Exporta os serviços
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export default app;


// firebase-config.js
// firebase-config.js
// firebase-config.js

import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Configurações separadas por ambiente
const firebaseConfigs = {
  prd: {
    apiKey: "AIzaSyB6Vm00Mp5RjAEQrmgStWr4dSg6gqJj01A",
    authDomain: "controlefinanceirosalazar.firebaseapp.com",
    projectId: "controlefinanceirosalazar",
    storageBucket: "controlefinanceirosalazar.appspot.com",
    messagingSenderId: "323202353724",
    appId: "1:323202353724:web:6880c23ce9029bc3231139",
    measurementId: "G-L1QY3W9Q76"
  },
  hml: {
    apiKey: "AIzaSyDx8KZx22rHksVMxJiFFX6CR1bHa0vUAnA",
    authDomain: "controlefinanceirosalazarhml.firebaseapp.com",
    projectId: "controlefinanceirosalazarhml",
    storageBucket: "controlefinanceirosalazarhml.appspot.com",
    messagingSenderId: "775400698227",
    appId: "1:775400698227:web:7f36bdc26d8a9cacc51506",
    measurementId: "G-6ZX7JVETJS"
  }
};

// Função de inicialização dinâmica do Firebase
export function initFirebase(env = 'prd') {
  if (!firebaseConfigs[env]) {
    throw new Error(`Ambiente Firebase "${env}" não está configurado.`);
  }

  console.log(`🔧 Inicializando Firebase para o ambiente: ${env.toUpperCase()}`);

  const config = firebaseConfigs[env];
  const appName = env;

  // Evita múltiplas inicializações com o mesmo nome
  const existingApp = getApps().find(a => a.name === appName);
  const app = existingApp || initializeApp(config, appName);

  // Inicializa os serviços
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}
