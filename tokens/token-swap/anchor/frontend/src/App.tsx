import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import CreateAMM from "./components/CreateAMM";
import CreatePool from "./components/CreatePool";
import DepositLiquidity from "./components/DepositLiquidity";
import Swap from "./components/Swap";
import Withdraw from "./components/Withdraw";
import './App.css';
import "@solana/wallet-adapter-react-ui/styles.css";

const network = "http://localhost:8899";

export default function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ minHeight: "100vh", background: "#222" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                maxWidth: 600,
                margin: "0 auto",
                padding: "40px 24px 0 24px",
              }}
            >
              <h1 style={{ color: "#fff", margin: 0, fontSize: "3rem", fontWeight: 700 }}>
                Token Swap DApp
              </h1>
              <div>
                <WalletMultiButton />
              </div>
            </div>
            {/* Main Content */}
            <div
              style={{
                maxWidth: 600,
                margin: "40px auto 0 auto",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <CreateAMM />
              <CreatePool />
              <DepositLiquidity />
              <Swap />
              <Withdraw />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
