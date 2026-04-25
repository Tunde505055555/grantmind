import { createFileRoute } from "@tanstack/react-router";
import { GrantReviewer } from "@/components/GrantReviewer";
import { WalletBar } from "@/components/WalletBar";
import { Toaster } from "@/components/ui/sonner";
import { GRANT_CONTRACT_ADDRESS, explorerAddressUrl } from "@/lib/genlayer";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Genlayer Grant Reviewer · AI verdicts on-chain" },
      {
        name: "description",
        content:
          "AI-assisted grant reviewer that posts verdicts on-chain to a GenLayer Studio Intelligent Contract.",
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-grid">
      <Toaster richColors theme="dark" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            GenLayer Studio · chain 61999
          </div>

          <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            AI grant reviewer,
            <br />
            <span className="text-glow text-primary">verdicts written on-chain.</span>
          </h1>

          <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Submit a proposal. An LLM scores it across a five-part rubric, then your wallet
            signs the verdict to a deployed Intelligent Contract on the GenLayer simulator.
            Every transaction is verifiable on{" "}
            <a
              href={explorerAddressUrl(GRANT_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              explorer-studio.genlayer.com <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>

          <WalletBar />
        </header>

        <GrantReviewer />

        <footer className="mt-16 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <p className="font-mono">
            Contract{" "}
            <a
              href={explorerAddressUrl(GRANT_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="text-foreground hover:text-primary"
            >
              {GRANT_CONTRACT_ADDRESS}
            </a>{" "}
            · RPC https://studio.genlayer.com/api · explorer-studio.genlayer.com
          </p>
        </footer>
      </div>
    </div>
  );
}
