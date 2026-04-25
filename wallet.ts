import { GENLAYER_CHAIN } from "./genlayer";

type EthRequest = (args: { method: string; params?: unknown[] }) => Promise<unknown>;
type Eip1193 = {
  request: EthRequest;
  on?: (event: string, handler: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...a: unknown[]) => void) => void;
};

export const getEthereum = (): Eip1193 | undefined =>
  (window as unknown as { ethereum?: Eip1193 }).ethereum;

const CHAIN_ID_HEX = "0x" + GENLAYER_CHAIN.id.toString(16); // 0xf21f for 61999

export async function ensureGenLayerNetwork() {
  const eth = getEthereum();
  if (!eth) throw new Error("Install MetaMask (or another EIP-1193 wallet) to continue.");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    // 4902 = chain not added to wallet
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "GenLayer Studio",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: [GENLAYER_CHAIN.rpcUrls?.default?.http?.[0] ?? "https://studio.genlayer.com/api"],
            blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<`0x${string}`> {
  const eth = getEthereum();
  if (!eth) throw new Error("Install MetaMask (or another EIP-1193 wallet) to continue.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("Wallet returned no accounts.");
  await ensureGenLayerNetwork();
  return accounts[0] as `0x${string}`;
}

export async function getCurrentAccount(): Promise<`0x${string}` | null> {
  const eth = getEthereum();
  if (!eth) return null;
  const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
  return (accounts?.[0] as `0x${string}`) ?? null;
}
