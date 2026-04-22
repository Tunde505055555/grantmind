import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import * as fs from "fs";
import * as path from "path";

async function deploy() {
  const account = createAccount();
  const client = createClient({
    chain: studionet,
    account,
  });

  console.log("Deploying GrantReviewer contract to studionet...");
  console.log("Deployer address:", account.address);

  const contractPath = path.join(__dirname, "../contracts/grant_reviewer.py");
  const contractCode = fs.readFileSync(contractPath, "utf-8");

  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
    value: 0n,
  });

  console.log("Deploy tx hash:", txHash);

  const { TransactionStatus } = await import("genlayer-js/types");
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 100,
    interval: 5000,
  });

  const contractAddress = receipt.data?.contract_address;
  console.log("✅ Contract deployed at:", contractAddress);

  // Write address to .env for frontend
  const envPath = path.join(__dirname, "../frontend/.env");
  const envContent = `VITE_CONTRACT_ADDRESS=${contractAddress}\nVITE_GENLAYER_RPC=https://studio.genlayer.com/api\n`;
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Contract address written to frontend/.env");

  return contractAddress;
}

deploy().catch(console.error);
