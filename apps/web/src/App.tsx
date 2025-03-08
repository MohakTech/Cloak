import '@rainbow-me/rainbowkit/styles.css';
import {
  AuthenticationStatus,
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { createSiweMessage } from 'viem/siwe';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import Home from './pages/Home';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';

const config = getDefaultConfig({
  appName: 'Cloak Chat App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet],
});

const AuthAPI = import.meta.env.VITE_AUTH_API;

const queryClient = new QueryClient();

const App = () => {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>("loading");

  // 🔹 Fetch user session on page load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("Checking session...");
        const response = await fetch(`${AuthAPI}/me`, {
          method: "GET",
          credentials: "include", // 🔥 Ensures cookies are sent
        });
  
        if (!response.ok) {
          console.log(response)
          throw new Error("Failed to fetch user session");
        }
  
        const { address } = await response.json();
        console.log("User Address:", address);
        setAuthStatus("authenticated")
      } catch (error) {
        console.error("Auth error:", error);
        setAuthStatus("unauthenticated");
      }
    };
  
    fetchUser();
    window.addEventListener("focus", fetchUser);
    return () => window.removeEventListener("focus", fetchUser);
  }, []);   

  // 🔹 RainbowKit Authentication Adapter
  const authAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => {
        try {
          const res = await fetch(`${AuthAPI}/api/auth/nonce`, {
            method: "GET",
            credentials: "include", // 🔥 Ensure cookies are sent
          });

          if (!res.ok) throw new Error("Failed to fetch nonce");
          const { nonce } = await res.json();
          return nonce;
        } catch (error) {
          console.error("Nonce error:", error);
          return "";
        }
      },
      createMessage: ({ nonce, address, chainId }) => {
        return createSiweMessage({
          domain: window.location.host,
          address,
          statement: "Sign in with Ethereum to the app.",
          uri: window.location.origin,
          version: "1",
          chainId,
          nonce,
        });
      },
      verify: async ({ message, signature }) => {
        try {
          const res = await fetch(`${AuthAPI}/api/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, signature }),
            credentials: "include", // 🔥 Ensures cookies are sent
          });
      
          if (!res.ok) throw new Error("Signature verification failed");
      
          setAuthStatus("authenticated");
          return true;
        } catch (error) {
          console.error("Verification error:", error);
          return false;
        }
      },      
      signOut: async () => {
        try {
          await fetch(`${AuthAPI}/api/auth/logout`, {
            method: "POST",
            credentials: "include", // 🔥 Ensures cookies are cleared properly
          });
        } catch (error) {
          console.error("Logout error:", error);
        }
        setAuthStatus("unauthenticated");  // ✅ Fix: Update state after logout
      }      
    });
  }, []);

  return (
    <Router>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitAuthenticationProvider adapter={authAdapter} status={authStatus}>
            <RainbowKitProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute isAuthenticated={authStatus}>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </RainbowKitProvider>
          </RainbowKitAuthenticationProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Router>
  );
};

export default App;
