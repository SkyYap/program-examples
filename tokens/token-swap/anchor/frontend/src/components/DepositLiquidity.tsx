import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import idl from "../../../target/idl/swap_example.json";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("9REFrpSamkX7NYhHVqoDV6ZW9pxRY5Bu5iP684pTPj2X");

export default function DepositLiquidity() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [poolInput, setPoolInput] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Polyfill signAllTransactions if not provided by the wallet
  const safeSignAllTransactions = signAllTransactions ?? (async (txs) => {
    if (!signTransaction) throw new Error('Wallet does not support signAllTransactions or signTransaction');
    return Promise.all(txs.map(tx => signTransaction(tx)));
  });

  const handleDeposit = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      console.log("Connect your wallet first.");
      return;
    }
    if (!poolInput || !amountA || !amountB) {
      console.log("Please input all required fields.");
      return;
    }

    let poolKey: PublicKey;
    try {
      poolKey = new PublicKey(poolInput);
    } catch (e) {
      console.log("Invalid pool address format.");
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
    const [mintLiquidity] = PublicKey.findProgramAddressSync(
      [ammKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer(), Buffer.from("liquidity")],
      PROGRAM_ID
    );
    const poolAccountA = await getAssociatedTokenAddress(mintA, poolAuthority, true);
    const poolAccountB = await getAssociatedTokenAddress(mintB, poolAuthority, true);
    const depositorAccountLiquidity = await getAssociatedTokenAddress(mintLiquidity, publicKey, false);
    const depositorAccountA = await getAssociatedTokenAddress(mintA, publicKey, false);
    const depositorAccountB = await getAssociatedTokenAddress(mintB, publicKey, false);

    try {
      await program.methods.depositLiquidity(
        new BN(amountA),
        new BN(amountB)
      ).accounts({
        pool: poolKey,
        poolAuthority: poolAuthority,
        depositor: publicKey,
        mintLiquidity: mintLiquidity,
        mintA: mintA,
        mintB: mintB,
        poolAccountA: poolAccountA,
        poolAccountB: poolAccountB,
        depositorAccountLiquidity: depositorAccountLiquidity,
        depositorAccountA: depositorAccountA,
        depositorAccountB: depositorAccountB,
        payer: publicKey,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      }).rpc();
      console.log("Deposit successful!");
    } catch (err: any) {
      if (err.logs) {
        console.error("Transaction logs:", err.logs);
      }
      if (err.getLogs) {
        const logs = await err.getLogs();
        console.error("Full logs:", logs);
      }
      console.error(err);
      console.log("Failed to deposit liquidity:", err.message || err);
    }
  }, [publicKey, signTransaction, connection, poolInput, amountA, amountB, signAllTransactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="Enter Pool address"
        value={poolInput}
        onChange={e => setPoolInput(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <input
        type="number"
        placeholder="Amount A"
        value={amountA}
        onChange={e => setAmountA(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <input
        type="number"
        placeholder="Amount B"
        value={amountB}
        onChange={e => setAmountB(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <button onClick={handleDeposit}>Deposit Liquidity</button>
    </div>
  );
} 