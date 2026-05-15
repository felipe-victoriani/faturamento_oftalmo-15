/**
 * firebase-config.js
 * Inicializa o Firebase e exporta as instâncias de app, auth e db.
 * Preencha os valores abaixo com os dados do seu projeto no Firebase Console.
 * Acesse: https://console.firebase.google.com → Seu projeto → Configurações → Seus apps
 */

/* Credenciais do projeto — substitua antes de fazer deploy */
const firebaseConfig = {
  apiKey: "AIzaSyAhwGjdiSUJ0DwmKaGXf8FzL2G67CgDe-s",
  authDomain: "financeiro-oftalmo-15.firebaseapp.com",
  databaseURL: "https://financeiro-oftalmo-15-default-rtdb.firebaseio.com",
  projectId: "financeiro-oftalmo-15",
  storageBucket: "financeiro-oftalmo-15.firebasestorage.app",
  messagingSenderId: "1013705769167",
  appId: "1:1013705769167:web:57f2dfe6f85122b201f7ba",
};

/* Inicialização — não alterar */
const firebaseApp = firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const firebaseDb = firebase.database();
