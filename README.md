# GenLayer Grant Reviewer

> AI-assisted grant reviewer that posts verdicts **on-chain** to a deployed
> Intelligent Contract on the **GenLayer Studio** simulator. Submit a proposal,
> trigger an LLM-powered review inside the contract, and read back a verdict
> that was produced by GenLayer's optimistic-democracy consensus — every
> transaction verifiable on the public Studio explorer.

**Live app:** https://grant-reviewer.lovable.app
**Contract:** [`0x166C9b79C97085E7e0c3339D98F8BC640B78B289`](https://explorer-studio.genlayer.com/address/0x166C9b79C97085E7e0c3339D98F8BC640B78B289)
**Network:** GenLayer Studio · Chain ID `61999` · RPC `https://studio.genlayer.com/api`
**Explorer:** https://explorer-studio.genlayer.com

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Why GenLayer](#why-genlayer)
3. [Architecture](#architecture)
4. [Contract interface](#contract-interface)
5. [End-to-end flow](#end-to-end-flow)
6. [Tech stack](#tech-stack)
7. [Project structure](#project-structure)
8. [Local development](#local-development)
9. [Configuration](#configuration)
10. [Wallet & network setup](#wallet--network-setup)
11. [Deployment](#deployment)
12. [Verifying transactions on-chain](#verifying-transactions-on-chain)
13. [Troubleshooting](#troubleshooting)
14. [Roadmap](#roadmap)
15. [License](#license)

---

## What it does

The Grant Reviewer is a single-page dApp that lets anyone:

1. **Connect a real EVM wallet** (MetaMask or any EIP-1193 provider) and
   automatically switch / add the **GenLayer Studio** network.
2. **Submit a grant application** — title, team background, amount requested
   (in **GEN**), project URL, and a free-form description — by signing a real
   `submit_grant` transaction.
3. **Trigger an on-chain AI review** by calling `review_grant`. The LLM call
   happens **inside the Intelligent Contract**; validators run it and converge
   on a verdict via GenLayer's optimistic-democracy consensus.
4. **Read the verdict back** with `get_review` and view both transactions on
   `explorer-studio.genlayer.com`.

There are **no mocks, no random addresses, and no simulated calls**. Every
button click in the UI maps to a real signed transaction or a real RPC read.

## Why GenLayer

Most "AI on-chain" demos run the LLM off-chain and only post a hash. GenLayer
lets the contract itself run the LLM as part of consensus, so the verdict is
produced by validators, not by the frontend. This project is a minimal but
honest showcase of that primitive on the public Studio testnet.

## Architecture

```
┌──────────────────────────┐     EIP-1193      ┌────────────────────────┐
│  React + TanStack Start  │ ───────────────►  │  MetaMask (window.eth) │
│  (this repo)             │                   └─────────────┬──────────┘
│                          │                                 │
│  • genlayer-js client    │     JSON-RPC 2.0                ▼
│  • useWallet hook        │ ──────────────────►  ┌────────────────────┐
│  • GrantReviewer UI      │                       │ GenLayer Studio    │
└──────────────────────────┘                       │ chain 61999        │
            ▲                                      │ studio.genlayer    │
            │  read_contract / receipts            │ .com/api           │
            └──────────────────────────────────────┤                    │
                                                   │  Intelligent       │
                                                   │  Contract          │
                                                   │  0x166C…B289       │
                                                   │   • submit_grant   │
                                                   │   • review_grant   │ ──► LLM consensus
                                                   │   • get_review     │
                                                   │   • get_total_grants
                                                   └────────────────────┘
```

Key design decisions:

- **Frontend-only**. No custom backend, no relayer, no off-chain AI service.
  The LLM lives inside the contract.
- **Real wallet, real signatures.** The browser's EIP-1193 provider signs
  every write; we never craft a private-key client in the UI.
- **Studio is gasless.** The UI sends `value: 0n` and never quotes a USD price.
  Amounts are in **GEN**, the network's native unit.

## Contract interface

The deployed Intelligent Contract exposes (at minimum) the following methods,
which the frontend calls directly via `genlayer-js`:

| Method | Kind | Args | Purpose |
|---|---|---|---|
| `submit_grant` | write | `(title, description, team_background, amount_gen, project_url)` | Register a new grant application; returns/emits the new `grant_id`. |
| `review_grant` | write | `(grant_id)` | Trigger the on-chain LLM review for that grant via consensus. |
| `get_review` | read | `(grant_id)` | Return the stored verdict string for that grant. |
| `get_total_grants` | read | `()` | Return the current number of grants (used to derive new IDs client-side). |

Address: `0x166C9b79C97085E7e0c3339D98F8BC640B78B289`

> ⚠️ Method names must match the deployed contract exactly. If you redeploy a
> contract with different names, update the `functionName` strings in
> `src/components/GrantReviewer.tsx` accordingly — otherwise validators return
> `call to private method __handle_undefined_method__`.

## End-to-end flow

1. **Connect wallet** → `useWallet().connect()` calls `eth_requestAccounts`
   then `wallet_switchEthereumChain` (or `wallet_addEthereumChain` with
   `chainId 0xf21f`, name `GenLayer Studio`, symbol `GEN`, decimals `18`).
2. **Submit grant** → read `get_total_grants` (so we can derive the new id),
   then `writeContract({ functionName: "submit_grant", args: [...] })`.
   Wait for the receipt, re-read `get_total_grants`, derive `grant_id =
   after - 1`.
3. **Trigger review** → `writeContract({ functionName: "review_grant", args:
   [grant_id] })`. Wait for the receipt — this is where validators run the
   LLM and finalize consensus.
4. **Fetch verdict** → `readContract({ functionName: "get_review", args:
   [grant_id] })` and render it in the UI.
5. Both transaction hashes link out to `explorer-studio.genlayer.com/tx/<hash>`.

## Tech stack

- **Framework:** React 19 + [TanStack Start v1](https://tanstack.com/start) (Vite 7, file-based routing)
- **Chain client:** [`genlayer-js`](https://www.npmjs.com/package/genlayer-js) (`studionet` chain preset)
- **Wallet:** EIP-1193 (`window.ethereum`) — MetaMask tested
- **Styling:** Tailwind CSS v4 + shadcn/ui components, OKLCH design tokens in `src/styles.css`
- **Notifications:** `sonner`
- **Icons:** `lucide-react`
- **Runtime target:** Edge (Cloudflare Workers via Wrangler)

## Project structure

```
src/
├── components/
│   ├── GrantReviewer.tsx     # Form + on-chain review panel + state machine
│   ├── WalletBar.tsx          # Connect / network indicator
│   └── ui/                    # shadcn primitives
├── hooks/
│   └── use-wallet.ts          # Account state, accountsChanged listener
├── lib/
│   ├── genlayer.ts            # readClient, createWriteClient, contract address, explorer URLs
│   └── wallet.ts              # eth_requestAccounts, wallet_switch/addEthereumChain (chain 61999)
├── routes/
│   ├── __root.tsx             # Shell + global head
│   └── index.tsx              # Landing page
├── styles.css                 # Tailwind v4 + design tokens (oklch)
└── router.tsx
```

## Local development

Requirements: **Bun** (or Node 20+) and a browser with MetaMask installed.

```bash
bun install
bun run dev
# open http://localhost:3000
```

Other useful scripts:

```bash
bun run build     # production build
bun run start     # serve the production build
bun run lint      # eslint
```

## Configuration

There are no required environment variables — the contract address, chain id,
and RPC URL are baked into `src/lib/genlayer.ts`:

```ts
export const GRANT_CONTRACT_ADDRESS =
  "0x166C9b79C97085E7e0c3339D98F8BC640B78B289" as `0x${string}`;

export const GENLAYER_CHAIN = studionet; // id 61999, https://studio.genlayer.com/api
export const EXPLORER_BASE  = "https://explorer-studio.genlayer.com";
```

To point at a different deployment, change `GRANT_CONTRACT_ADDRESS` (and, if
you're targeting a different network, the chain preset).

## Wallet & network setup

The app will offer to add the network automatically the first time you
connect. If you'd rather add it manually in MetaMask, use:

| Field | Value |
|---|---|
| Network name | `GenLayer Studio` |
| New RPC URL | `https://studio.genlayer.com/api` |
| Chain ID | `61999` (`0xf21f`) |
| Currency symbol | `GEN` |
| Block explorer URL | `https://explorer-studio.genlayer.com` |

Studio is **gasless** — you do **not** need testnet ETH, and the UI does not
prompt for any USD value.

## Deployment

This project is built and deployed by [Lovable](https://lovable.dev) to a
Cloudflare Worker (TanStack Start's edge target).

- **Preview URL:** https://id-preview--60e0dbc5-73ba-4645-a883-522425958044.lovable.app
- **Published URL:** https://grant-reviewer.lovable.app

To self-host on your own Cloudflare account, edit `wrangler.jsonc` with your
`name` / `account_id` and run `bun run build && bunx wrangler deploy`.

## Verifying transactions on-chain

Every successful `submit_grant` and `review_grant` returns a transaction hash
that the UI surfaces with a "View tx" link to:

```
https://explorer-studio.genlayer.com/tx/<hash>
```

You can also browse the contract directly:

```
https://explorer-studio.genlayer.com/address/0x166C9b79C97085E7e0c3339D98F8BC640B78B289
```

If a transaction is shown as **finalized** with the verdict string visible in
contract storage (or readable via `get_review`), the on-chain LLM review
reached consensus successfully.

## Troubleshooting

**"Install MetaMask (or another EIP-1193 wallet) to continue."**
The page can't see `window.ethereum`. Install MetaMask (or Rabby, Frame, etc.)
and reload.

**Network won't switch.**
Some wallets reject `wallet_switchEthereumChain` for unknown chains. Click
*Connect* again — the UI falls back to `wallet_addEthereumChain` with the full
chain spec for chain `61999`.

**`call to private method __handle_undefined_method__`**
The frontend called a method name that doesn't exist on the deployed
contract. Confirm the deployed ABI matches the names used in
`GrantReviewer.tsx` (`submit_grant`, `review_grant`, `get_review`,
`get_total_grants`) and update either side to match.

**Verdict never appears.**
GenLayer Studio occasionally takes a moment to finalize LLM consensus. The UI
already waits on the `review_grant` receipt before reading `get_review`. If it
still seems empty, refresh the page and re-call `get_review(grant_id)` via the
explorer or a script — the value persists in contract storage.

**Grant id is wrong / `?`.**
The frontend derives `grant_id` from `get_total_grants` before and after
submission. If the read fails (e.g., RPC blip), submit again — the next
attempt re-reads cleanly.

## Roadmap

- [ ] Multi-grant gallery (list every `grant_id`, not just the latest)
- [ ] Per-grant detail route with shareable URL
- [ ] Structured rubric output (parse the verdict into per-criterion scores)
- [ ] Reviewer attribution (display the validator set that produced the verdict)
- [ ] Optional grant payout flow once GenLayer mainnet exposes value transfer

## License

MIT — do whatever you want, just don't ship mocks and call them on-chain.
