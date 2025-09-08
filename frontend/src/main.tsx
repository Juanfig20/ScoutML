import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import el proveedor de PayPal
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const initialOptions = {
    clientId: "AeFyeuliqtsUDCALwgdkua866e8oj-b5NdBoxhwQs055-tveAlfOKtcnYOqny9TJra30_jP5n8RwDSLO", 
    currency: "USD",
    intent: "capture",
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={initialOptions}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);