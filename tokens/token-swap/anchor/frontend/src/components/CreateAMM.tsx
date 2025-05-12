import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../../../target/idl/swap_example.json"; // Make sure this file exists
import { useCallback } from "react";

const PROGRAM_ID = new PublicKey("9REFrpSamkX7NYhHVqoDV6ZW9pxRY5Bu5iP684pTPj2X");

export default function CreateAMM() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  // Polyfill signAllTransactions if not provided by the wallet
  const safeSignAllTransactions = signAllTransactions ?? (async (txs) => {
    // Fallback: sign transactions one by one
    if (!signTransaction) throw new Error('Wallet does not support signAllTransactions or signTransaction');
    return Promise.all(txs.map(tx => signTransaction(tx)));
  });

  const handleCreateAMM = useCallback(async () => {
    if (!publicKey || !signTransaction) {
      console.log("Connect your wallet first.");
      return;
    }

    // Generate a new id for the AMM
    const id = Keypair.generate().publicKey;
    // Set the fee to 1% (100 basis points)
    const fee = 100;

    // Derive the AMM PDA
    const [ammPda] = PublicKey.findProgramAddressSync(
      [id.toBuffer()],
      PROGRAM_ID
    );

    // Set up Anchor provider and program
    const provider = new AnchorProvider(connection, { publicKey, signTransaction, signAllTransactions: safeSignAllTransactions }, {});
    const program = new Program(idl as any, provider);

    try {
      await program.methods.createAmm(id, fee).accounts({
        amm: ammPda,
        admin: publicKey,
        payer: publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();
      console.log("AMM created successfully! AMM Address:", ammPda.toBase58());
    } catch (err: any) {
      console.error(err);
      console.log("Failed to create AMM:", err.message || err);
    }
  }, [publicKey, signTransaction, connection]);

  return <button onClick={handleCreateAMM}>Create AMM</button>;
} 