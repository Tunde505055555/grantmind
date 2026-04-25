import { useCallback, useEffect, useState } from "react";
import { connectWallet, ensureGenLayerNetwork, getCurrentAccount, getEthereum } from "@/lib/wallet";

export type WalletState = {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    connecting: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    getCurrentAccount().then((addr) => {
      if (mounted && addr) setState((s) => ({ ...s, address: addr }));
    });
    const eth = getEthereum();
    if (!eth?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({ ...s, address: (accounts?.[0] as `0x${string}`) ?? null }));
    };
    const onChain = () => {
      // No-op; user can re-trigger connect to switch back if needed.
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      mounted = false;
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const addr = await connectWallet();
      setState({ address: addr, connecting: false, error: null });
    } catch (err) {
      setState({
        address: null,
        connecting: false,
        error: (err as Error).message ?? "Failed to connect wallet",
      });
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await ensureGenLayerNetwork();
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message ?? "Network switch failed" }));
    }
  }, []);

  return { ...state, connect, switchNetwork };
}
