import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA Service Worker'ı kaydet
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('mekan360: Uygulama offline kullanıma hazır!');
  },
  onUpdate: () => {
    console.log('mekan360: Yeni güncelleme mevcut!');
  }
});
