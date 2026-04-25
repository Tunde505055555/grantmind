import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const GRANT_CONTRACT_ADDRESS =
  "0x166C9b79C97085E7e0c3339D98F8BC640B78B289" as `0x${string}`;

export const GENLAYER_CHAIN = studionet; // id 61999, https://studio.genlayer.com/api
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export const explorerTxUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;
export const explorerAddressUrl = (addr: string) =>
  `${EXPLORER_BASE}/address/${addr}`;

/** Read-only client — no wallet required, talks straight to the GenLayer Studio RPC. */
export const readClient = createClient({ chain: GENLAYER_CHAIN });

/**
 * Create a write-capable client bound to a connected MetaMask account.
 * The browser wallet (window.ethereum) signs every transaction.
 */
export function createWriteClient(address: `0x${string}`) {
  const provider = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!provider) throw new Error("No EVM wallet detected (window.ethereum is undefined)");
  return createClient({
    chain: GENLAYER_CHAIN,
    account: address,
    // genlayer-js forwards signing to the EIP-1193 provider (MetaMask).
    provider,
  } as Parameters<typeof createClient>[0]);
}
