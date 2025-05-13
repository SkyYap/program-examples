import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../../../target/idl/swap_example.json";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("9REFrpSamkX7NYhHVqoDV6ZW9pxRY5Bu5iP684pTPj2X");

export default function CreatePool() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [ammIdInput, setAmmIdInput] = useState("");

  // Polyfill signAllTransactions if not provided by the wallet
  const safeSignAllTransactions = signAllTransactions ?? (async (txs) => {
    if (!signTransaction) throw new Error('Wallet does not support signAllTransactions or signTransaction');
    return Promise.all(txs.map(tx => signTransaction(tx)));
  });

  const handleCreatePool = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      console.log("Connect your wallet first.");
      return;
    }
    if (!ammIdInput) {
      console.log("Please input a valid AMM id.");
      return;
    }
    let ammKey: PublicKey;
    try {
      ammKey = new PublicKey(ammIdInput);
    } catch (e) {
      console.log("Invalid AMM id format.");
      return;
    }
    const mintA = new PublicKey("5vpF5ARndpYjYevGhihxokpk6S5r7rAgA5r3g5AUuArv")
    const mintB = new PublicKey("fxBzXQ9EPvzo5CdPc3sHpWA4GRuSGK4ZadvpuSKcX6N")
    
    const [mintLiquidity] = PublicKey.findProgramAddressSync(
      [ammKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer(), Buffer.from("liquidity")],
      PROGRAM_ID
    );
    const [poolKey] = PublicKey.findProgramAddressSync(
      [ammKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
      PROGRAM_ID
    );
    const [poolAuthority] = PublicKey.findProgramAddressSync(
      [ammKey.toBuffer(), mintA.toBuffer(), mintB.toBuffer(), Buffer.from("authority")],
      PROGRAM_ID
    );
    // const [poolAccountA] = PublicKey.findProgramAddressSync(
    //   [poolKey.toBuffer(), mintA.toBuffer()],
    //   PROGRAM_ID
    // );
    // const [poolAccountB] = PublicKey.findProgramAddressSync(
    //   [poolKey.toBuffer(), mintB.toBuffer()],
    //   PROGRAM_ID
    // );
    const provider = new AnchorProvider(connection, { publicKey, signTransaction, signAllTransactions: safeSignAllTransactions }, {});
    const program = new Program(idl as any, provider);
    try {
      // console.log("ammKey", ammKey.toBase58());
      // console.log("mintA", mintA.toBase58());
      // console.log("mintB", mintB.toBase58());
      // console.log("mintLiquidity", mintLiquidity.toBase58());
      // console.log("poolKey", poolKey.toBase58());
      // console.log("poolAuthority", poolAuthority.toBase58());
      // console.log("poolAccountA", poolAccountA.toBase58());
      // console.log("poolAccountB", poolAccountB.toBase58());
      await program.methods.createPool().accounts({
        amm: ammKey,
        pool: poolKey,
        poolAuthority: poolAuthority,
        mintLiquidity: mintLiquidity,
        mintA: mintA,
        mintB: mintB,
        poolAccountA: await getAssociatedTokenAddress(
          mintA,
          poolAuthority,
          true
        ),
        poolAccountB: await getAssociatedTokenAddress(
          mintB,
          poolAuthority,
          true
        ),
        payer: publicKey,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      }).rpc();
      console.log("Pool created successfully! Pool Address:", poolKey.toBase58());
    } catch (err: any) {
      if (err.logs) {
        console.error("Transaction logs:", err.logs);
      }
      if (err.getLogs) {
        const logs = await err.getLogs();
        console.error("Full logs:", logs);
      }
      console.error(err);
      console.log("Failed to create Pool:", err.message || err);
    }
  }, [publicKey, signTransaction, connection, ammIdInput, signAllTransactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="Enter AMM id (public key)"
        value={ammIdInput}
        onChange={e => setAmmIdInput(e.target.value)}
        style={{ padding: 8, width: 320 }}
      />
      <button onClick={handleCreatePool}>Create Pool</button>
    </div>
  );
} 