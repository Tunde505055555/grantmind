# GrantMind — AI Grant Reviewer on GenLayer

An intelligent grant review dApp built on [GenLayer](https://genlayer.com). Grant proposals are submitted on-chain and reviewed by multiple AI validators via GenLayer's **Equivalence Principle** — ensuring decentralised, tamper-resistant, consensus-backed AI scoring.

## Live Contract

| Network | Address |
|---|---|
| studionet | `0x166C9b79C97085E7e0c3339D98F8BC640B78B289` |

## What makes this GenLayer-native

- **LLM on-chain**: `review_grant` uses `gl.nondet.exec_prompt()` to call an LLM directly inside the contract
- **Equivalence Principle**: `gl.eq_principle.prompt_comparative()` ensures all validators independently run the LLM and reach consensus — no single point of trust
- **Persistent on-chain state**: proposals and reviews stored in `TreeMap[u256, str]`
- **Real frontend integration**: uses `genlayer-js` SDK with real `readContract` / `writeContract` calls — no mocks, no stubs

## Project Structure

```
grantmind/
├── contracts/
│   └── grant_reviewer.py        # GenLayer Intelligent Contract
├── deploy/
│   └── deployScript.ts          # Deploy via GenLayer CLI
├── frontend/
│   ├── index.html               # Full dApp UI
│   ├── src/
│   │   └── genlayer.js          # SDK integration layer
│   ├── .env.example
│   └── package.json
├── tests/
│   └── test_grant_reviewer.py   # Integration tests (gltest)
├── gltest.config.yaml
├── requirements.txt
└── README.md
```

## Getting Started

### 1. Run the frontend

The frontend is a single `index.html` file. Open it directly in a browser or serve it:

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 2. Deploy your own contract (optional)

The repo already has a live contract at `0x166C9b79…`. To deploy your own:

```bash
npm install -g genlayer
genlayer network set studionet
genlayer deploy --contract contracts/grant_reviewer.py
```

Then update `VITE_CONTRACT_ADDRESS` in `frontend/.env`.

### 3. Run integration tests

```bash
pip install -r requirements.txt
gltest --network studionet
```

## Contract ABI

### Write Methods

| Method | Parameters | Description |
|---|---|---|
| `submit_grant` | title, description, team_background, requested_amount, project_url | Store a grant proposal on-chain |
| `review_grant` | grant_id | Trigger AI review via Equivalence Principle |
| `update_criteria` | criteria_json | Owner-only: update scoring weights |

### Read Methods

| Method | Parameters | Returns |
|---|---|---|
| `get_proposal` | grant_id | JSON string of proposal |
| `get_review` | grant_id | JSON string of AI review (or `""`) |
| `get_total_grants` | — | int |
| `get_criteria` | — | JSON string of scoring weights |
| `get_owner` | — | address hex string |

## AI Review Schema

Each `review_grant` call produces:

```json
{
  "overall_score": 78,
  "innovation_score": 82,
  "feasibility_score": 75,
  "impact_score": 80,
  "team_quality_score": 70,
  "budget_clarity_score": 65,
  "recommendation": "FUND",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "reviewer_comments": "...",
  "suggested_improvements": "..."
}
```

## Tech Stack

- **Smart Contract**: Python · GenLayer SDK (`py-genlayer:test`)
- **AI Consensus**: `gl.nondet.exec_prompt` + `gl.eq_principle.prompt_comparative`
- **Frontend**: Vanilla JS + `genlayer-js` SDK (ESM via esm.sh)
- **Tests**: `genlayer-test` / `gltest`
- **Network**: GenLayer studionet

## License

MIT
