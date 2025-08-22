import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; 

// ✅ Import PrivyProvider
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID; 
// 🔑 Make sure you added this in your .env file:
// VITE_PRIVY_APP_ID=your-privy-app-id-here

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["wallet"], // only allow wallet login
        appearance: {
          theme: "dark",
          accentColor: "#6C63FF",
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);