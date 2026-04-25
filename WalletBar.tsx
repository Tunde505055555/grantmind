import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { GENLAYER_CHAIN, GRANT_CONTRACT_ADDRESS, explorerAddressUrl } from "@/lib/genlayer";
import { ExternalLink, Wallet } from "lucide-react";

const truncate = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WalletBar() {
  const { address, connecting, error, connect } = useWallet();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono text-muted-foreground">
          chain <span className="text-foreground">{GENLAYER_CHAIN.id}</span> · GenLayer Studio
        </span>
        <a
          href={explorerAddressUrl(GRANT_CONTRACT_ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-primary"
        >
          contract {truncate(GRANT_CONTRACT_ADDRESS)} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        {address ? (
          <span className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary">
            {truncate(address)}
          </span>
        ) : (
          <Button size="sm" onClick={connect} disabled={connecting}>
            <Wallet className="mr-1.5 h-4 w-4" />
            {connecting ? "Connecting…" : "Connect wallet"}
          </Button>
        )}
      </div>
    </div>
  );
}
