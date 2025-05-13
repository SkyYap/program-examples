import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import idl from "../../../target/idl/swap_example.json";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("9REFrpSamkX7NYhHVqoDV6ZW9pxRY5Bu5iP684pTPj2X");

export default function Swap() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [poolInput, setPoolInput] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [swapA, setSwapA] = useState(true); // true: A->B, false: B->A
  const [loading, setLoading] = useState(false);

  // Polyfill signAllTransactions if not provided by the wallet
  const safeSignAllTransactions = signAllTransactions ?? (async (txs) => {
    if (!signTransaction) throw new Error('Wallet does not support signAllTransactions or signTransaction');
    return Promise.all(txs.map(tx => signTransaction(tx)));
  });

  const handleSwap = useCallback(async () => {
    setLoading(true);
    try {
      if (!publicKey || !signTransaction) {
        console.log("Connect your wallet first.");
        setLoading(false);
        return;
      }
      if (!poolInput || !amountIn) {
        console.log("Please input all required fields.");
        setLoading(false);
        return;
      }
      let poolKey: PublicKey;
      try {
        poolKey = new PublicKey(poolInput);
      } catch (e) {
        console.log("Invalid pool address format.");
        setLoading(false);
        return;
      }
      // Fetch pool account to get AMM, mintA, mintB
      const provider = new AnchorProvider(connection, { publicKey, signTransaction, signAllTransactions: safeSignAllTransactions }, {});
      const program = new Program(idl as any, provider);
      let poolAccount;
      try {
        poolAccount = await (program.account as any)["pool"].fetch(poolKey);
      } catch (e) {
        console.log("Failed to fetch pool account:", e);
        setLoading(false);
        return;
      }
      const ammKey = poolAccount.amm as PublicKey;
      const mintA = poolAccount.mintA as PublicKey;
      const mintB = poolAccount.mintB as PublicKey;
      // Derive all required PDAs and ATAs
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [ammKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer(), Buffer.from("authority")],
        PROGRAM_ID
      );
      const poolAccountA = await getAssociatedTokenAddress(mintA, poolAuthority, true);
      const poolAccountB = await getAssociatedTokenAddress(mintB, poolAuthority, true);
      const traderAccountA = await getAssociatedTokenAddress(mintA, publicKey, false);
      const traderAccountB = await getAssociatedTokenAddress(mintB, publicKey, false);
      // Prepare swap args
      const inputAmount = new BN(amountIn);
      const minOutputAmount = new BN(0); // No slippage protection
      // Call swap
      await program.methods
        .swapExactTokensForTokens(swapA, inputAmount, minOutputAmount)
        .accounts({
          amm: ammKey,
          pool: poolKey,
          poolAuthority: poolAuthority,
          trader: publicKey,
          mintA: mintA,
          mintB: mintB,
          poolAccountA: poolAccountA,
          poolAccountB: poolAccountB,
          traderAccountA: traderAccountA,
          traderAccountB: traderAccountB,
          payer: publicKey,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        })
        .rpc({ skipPreflight: true });
      console.log("Swap successful!");
    } catch (e: any) {
      console.log("Swap failed:", e);
      if (e && typeof e === "object") {
        if (e.message) console.log("Error message:", e.message);
        if (e.logs) console.log("Error logs:", e.logs);
        if (e.getLogs) {
          e.getLogs().then((logs: any) => console.log("Full logs:", logs));
        }
      }
    }
    setLoading(false);
  }, [publicKey, signTransaction, connection, poolInput, amountIn, swapA, signAllTransactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="Enter Pool address"
        value={poolInput}
        onChange={e => setPoolInput(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <select value={swapA ? "AtoB" : "BtoA"} onChange={e => setSwapA(e.target.value === "AtoB")}
        style={{ padding: 8, width: 320 }}>
        <option value="AtoB">A → B</option>
        <option value="BtoA">B → A</option>
      </select>
      <input
        type="number"
        placeholder="Amount In (raw units)"
        value={amountIn}
        onChange={e => setAmountIn(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <button onClick={handleSwap} disabled={loading} style={{ padding: 8, width: 320 }}>
        {loading ? 'Swapping...' : 'Swap'}
      </button>
    </div>
  );
} 