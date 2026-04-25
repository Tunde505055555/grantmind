import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createWriteClient,
  explorerTxUrl,
  GRANT_CONTRACT_ADDRESS,
  readClient,
} from "@/lib/genlayer";
import { ensureGenLayerNetwork } from "@/lib/wallet";
import { toast } from "sonner";
import {
  Brain,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

const SAMPLE = {
  title: "Open dataset of African crop disease imagery",
  team_background:
    "Savannah AI Collective — 6 researchers with prior PlantVillage and FAO contributions.",
  amountGen: 4500,
  project_url: "https://github.com/savannah-ai/cassava-disease-dataset",
  description:
    "We will collect, label, and openly publish 30,000 smartphone images of cassava, maize, and millet leaf diseases across 4 countries. Funds cover field stipends (2,200 GEN), 3 expert annotators (1,500 GEN), storage + hosting (300 GEN), and audits (500 GEN). Data released under CC-BY 4.0 within 6 months. Models will be trained and benchmarked openly. Team has prior PlantVillage contributions.",
};

type Phase =
  | { kind: "idle" }
  | { kind: "submitting" } // signing submit_grant
  | { kind: "submitted"; submitHash: string; grantId: number | null }
  | { kind: "reviewing"; submitHash: string; grantId: number; reviewHash?: string }
  | {
      kind: "done";
      submitHash: string;
      grantId: number;
      reviewHash: string;
      review: string;
    }
  | { kind: "error"; message: string; submitHash?: string; reviewHash?: string };

export function GrantReviewer() {
  const { address, connect } = useWallet();
  const [form, setForm] = useState(SAMPLE);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  function setError(message: string, extra: Partial<Extract<Phase, { kind: "error" }>> = {}) {
    setPhase({ kind: "error", message, ...extra });
    toast.error(message);
  }

  async function handleSubmitGrant() {
    if (!address) {
      await connect();
      return;
    }
    setPhase({ kind: "submitting" });
    try {
      await ensureGenLayerNetwork();
      const client = createWriteClient(address);

      // Read current count BEFORE submit so we can derive the new grant_id afterwards.
      let beforeCount = 0;
      try {
        beforeCount = Number(
          (await readClient.readContract({
            address: GRANT_CONTRACT_ADDRESS,
            functionName: "get_total_grants",
          })) ?? 0,
        );
      } catch {
        // best-effort
      }

      const submitHash = (await client.writeContract({
        address: GRANT_CONTRACT_ADDRESS,
        functionName: "submit_grant",
        args: [
          form.title,
          form.description,
          form.team_background,
          Math.max(0, Math.floor(form.amountGen)),
          form.project_url,
        ],
        value: 0n,
      })) as string;

      toast.success("Grant submitted on-chain", {
        description: submitHash,
        action: {
          label: "View tx",
          onClick: () => window.open(explorerTxUrl(submitHash), "_blank"),
        },
      });

      // Wait for finality, then read total to derive the new grant id.
      let grantId: number | null = null;
      try {
        await readClient.waitForTransactionReceipt({
          hash: submitHash as `0x${string}`,
        } as Parameters<typeof readClient.waitForTransactionReceipt>[0]);
        const after = Number(
          (await readClient.readContract({
            address: GRANT_CONTRACT_ADDRESS,
            functionName: "get_total_grants",
          })) ?? 0,
        );
        // grant_id is most likely (after - 1); fall back to beforeCount if equal.
        grantId = after > beforeCount ? after - 1 : beforeCount;
      } catch (e) {
        console.warn("Could not derive grant id from receipt:", e);
      }

      setPhase({ kind: "submitted", submitHash, grantId });
    } catch (err) {
      setError((err as Error).message ?? "Submission failed");
    }
  }

  async function handleTriggerReview() {
    if (phase.kind !== "submitted" && phase.kind !== "error") return;
    const submitHash =
      phase.kind === "submitted" ? phase.submitHash : phase.submitHash ?? "";
    let grantId = phase.kind === "submitted" ? phase.grantId : null;

    if (!address) {
      await connect();
      return;
    }
    if (grantId == null) {
      // Last-resort: re-read total and assume latest.
      try {
        const total = Number(
          (await readClient.readContract({
            address: GRANT_CONTRACT_ADDRESS,
            functionName: "get_total_grants",
          })) ?? 0,
        );
        grantId = Math.max(0, total - 1);
      } catch {
        setError("Could not determine grant id. Re-submit the grant.");
        return;
      }
    }

    setPhase({ kind: "reviewing", submitHash, grantId });
    try {
      await ensureGenLayerNetwork();
      const client = createWriteClient(address);
      const reviewHash = (await client.writeContract({
        address: GRANT_CONTRACT_ADDRESS,
        functionName: "review_grant",
        args: [grantId],
        value: 0n,
      })) as string;

      setPhase({ kind: "reviewing", submitHash, grantId, reviewHash });
      toast.success("AI review tx sent", {
        description: reviewHash,
        action: {
          label: "View tx",
          onClick: () => window.open(explorerTxUrl(reviewHash), "_blank"),
        },
      });

      try {
        await readClient.waitForTransactionReceipt({
          hash: reviewHash as `0x${string}`,
        } as Parameters<typeof readClient.waitForTransactionReceipt>[0]);
      } catch (e) {
        console.warn("waitForTransactionReceipt error:", e);
      }

      const reviewRaw = await readClient.readContract({
        address: GRANT_CONTRACT_ADDRESS,
        functionName: "get_review",
        args: [grantId],
      });
      const review = typeof reviewRaw === "string" ? reviewRaw : JSON.stringify(reviewRaw, null, 2);

      setPhase({ kind: "done", submitHash, grantId, reviewHash, review });
    } catch (err) {
      setError((err as Error).message ?? "Review failed", {
        submitHash,
        reviewHash: undefined,
      });
    }
  }

  const isBusy = phase.kind === "submitting" || phase.kind === "reviewing";
  const grantId =
    phase.kind === "submitted" || phase.kind === "reviewing" || phase.kind === "done"
      ? phase.grantId
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      {/* Application form */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
        <header className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="font-display text-lg tracking-tight">Grant application</h2>
        </header>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Project title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="team">Team background</Label>
            <Input
              id="team"
              value={form.team_background}
              onChange={(e) => setForm({ ...form, team_background: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="amt">
                Amount requested <span className="text-muted-foreground">(GEN)</span>
              </Label>
              <div className="relative">
                <Input
                  id="amt"
                  type="number"
                  min={0}
                  step="1"
                  className="pr-14 font-mono"
                  value={form.amountGen}
                  onChange={(e) =>
                    setForm({ ...form, amountGen: Number(e.target.value) || 0 })
                  }
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  GEN
                </span>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="url">Project URL</Label>
              <Input
                id="url"
                value={form.project_url}
                onChange={(e) => setForm({ ...form, project_url: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="prop">Description</Label>
            <Textarea
              id="prop"
              rows={9}
              className="font-mono text-sm leading-relaxed"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {form.description.length} chars
            </p>
          </div>

          <Button
            onClick={handleSubmitGrant}
            disabled={isBusy}
            size="lg"
            className="mt-2"
          >
            {phase.kind === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Awaiting wallet…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {address ? "Submit grant on-chain" : "Connect wallet to submit"}
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Review panel */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg tracking-tight">On-chain AI review</h2>
          <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-success">
            gasless · chain 61999
          </span>
        </header>

        {phase.kind === "idle" && (
          <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 text-center text-sm text-muted-foreground">
            <Brain className="mb-3 h-8 w-8 opacity-50" />
            Submit a grant to begin. The deployed Intelligent Contract will run
            its own LLM review on-chain.
          </div>
        )}

        {phase.kind === "submitting" && (
          <Status icon="spin" title="Submitting grant" detail="Sign the tx in your wallet." />
        )}

        {phase.kind === "submitted" && (
          <div className="space-y-4">
            <TxLink label="submit_grant" hash={phase.submitHash} />
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm">
              <p className="text-muted-foreground">
                Grant id derived as{" "}
                <span className="font-mono text-foreground">
                  {grantId ?? "?"}
                </span>
                . Trigger the on-chain AI review next.
              </p>
            </div>
            <Button onClick={handleTriggerReview} className="w-full">
              <Brain className="mr-2 h-4 w-4" />
              Trigger AI review on-chain
            </Button>
          </div>
        )}

        {phase.kind === "reviewing" && (
          <div className="space-y-4">
            <TxLink label="submit_grant" hash={phase.submitHash} />
            {phase.reviewHash && <TxLink label="review_grant" hash={phase.reviewHash} />}
            <Status
              icon="spin"
              title={phase.reviewHash ? "Awaiting consensus" : "Sign review tx"}
              detail={
                phase.reviewHash
                  ? "Validators are running the LLM and finalizing the verdict."
                  : "Confirm review_grant in your wallet."
              }
            />
          </div>
        )}

        {phase.kind === "done" && (
          <div className="space-y-4">
            <TxLink label="submit_grant" hash={phase.submitHash} />
            <TxLink label="review_grant" hash={phase.reviewHash} />
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Grant #{phase.grantId} · verdict
              </div>
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
                {phase.review}
              </pre>
            </div>
          </div>
        )}

        {phase.kind === "error" && (
          <div className="space-y-3">
            {phase.submitHash && <TxLink label="submit_grant" hash={phase.submitHash} />}
            {phase.reviewHash && <TxLink label="review_grant" hash={phase.reviewHash} />}
            <p className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">{phase.message}</span>
            </p>
            <Button
              variant="outline"
              onClick={() => setPhase({ kind: "idle" })}
              className="w-full"
            >
              Reset
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Status({
  icon,
  title,
  detail,
}: {
  icon: "spin";
  title: string;
  detail: string;
}) {
  return (
    <div className="flex h-56 flex-col items-center justify-center text-center">
      {icon === "spin" && <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />}
      <div className="font-display text-base text-foreground">{title}</div>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function TxLink({ label, hash }: { label: string; hash: string }) {
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-xs hover:border-primary/60"
    >
      <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="flex-1 truncate text-foreground">{hash}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
    </a>
  );
}
