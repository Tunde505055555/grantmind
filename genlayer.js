/**
 * genlayer.js — GenLayer client & contract interaction layer
 * Uses genlayer-js SDK with real readContract / writeContract calls.
 * Contract: 0x166C9b79C97085E7e0c3339D98F8BC640B78B289 on studionet
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x166C9b79C97085E7e0c3339D98F8BC640B78B289";

// ── Client factory ─────────────────────────────────────────────────────────
let _client = null;
let _account = null;

export function getClient(privateKey = null) {
  if (_client && !privateKey) return _client;
  _account = privateKey ? createAccount(privateKey) : createAccount();
  _client = createClient({ chain: studionet, account: _account });
  return _client;
}

export function getAccount() {
  if (!_account) getClient();
  return _account;
}

// ── Read contract ───────────────────────────────────────────────────────────
export async function readContract(functionName, args = []) {
  const client = getClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
}

// ── Write contract ──────────────────────────────────────────────────────────
export async function writeContract(functionName, args = []) {
  const client = getClient();
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    retries: 60,
    interval: 5000,
  });
  return { txHash, receipt };
}

// ── Contract method wrappers ────────────────────────────────────────────────

export async function getTotalGrants() {
  const result = await readContract("get_total_grants", []);
  return Number(result);
}

export async function getProposal(grantId) {
  const raw = await readContract("get_proposal", [grantId]);
  return JSON.parse(raw);
}

export async function getReview(grantId) {
  const raw = await readContract("get_review", [grantId]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getOwner() {
  return readContract("get_owner", []);
}

export async function getCriteria() {
  const raw = await readContract("get_criteria", []);
  return JSON.parse(raw);
}

export async function submitGrant({ title, description, teamBackground, requestedAmount, projectUrl }) {
  return writeContract("submit_grant", [
    title,
    description,
    teamBackground,
    requestedAmount,
    projectUrl,
  ]);
}

export async function reviewGrant(grantId) {
  return writeContract("review_grant", [grantId]);
}

export async function updateCriteria(criteriaObj) {
  return writeContract("update_criteria", [JSON.stringify(criteriaObj)]);
}
