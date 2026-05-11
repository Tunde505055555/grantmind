# GenLayer Intelligent Contract
# Deployed on GenLayer Studio (chain 61999)
# Address: 0x166C9b79C97085E7e0c3339D98F8BC640B78B289
#
# This is the contract source that backs the Grant Reviewer dApp.
# It uses GenLayer's optimistic-democracy LLM consensus to review grant
# applications on-chain. Validators each call an LLM, then their verdicts
# are reconciled into a single deterministic result via eq_principle.

from genlayer import *
import json


# ----------------------------------------------------------------------
# Storage types
# ----------------------------------------------------------------------

class Grant(TypedDict):
    title: str
    description: str
    team_background: str
    amount_gen: u256          # amount requested, denominated in GEN
    project_url: str
    applicant: Address
    review: str               # populated after review_grant() finalizes


# ----------------------------------------------------------------------
# Contract
# ----------------------------------------------------------------------

class GrantReviewer(gl.Contract):
    grants: DynArray[Grant]

    def __init__(self) -> None:
        # DynArray initializes empty; nothing else to seed.
        pass

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    @gl.public.write
    def submit_grant(
        self,
        title: str,
        description: str,
        team_background: str,
        amount: u256,
        project_url: str,
    ) -> u256:
        """Append a new grant application. Returns the new grant_id."""
        grant: Grant = {
            "title": title,
            "description": description,
            "team_background": team_background,
            "amount_gen": amount,
            "project_url": project_url,
            "applicant": gl.message.sender_address,
            "review": "",
        }
        self.grants.append(grant)
        return u256(len(self.grants) - 1)

    @gl.public.write
    def review_grant(self, grant_id: u256) -> None:
        """
        Trigger an on-chain LLM review for the given grant.
        Each validator independently asks an LLM to score the proposal,
        and eq_principle reconciles their answers into a single string
        that gets persisted to storage.
        """
        assert grant_id < len(self.grants), "unknown grant_id"
        g = self.grants[grant_id]

        prompt = f"""
You are an experienced grant reviewer for an open-source / public-goods
funding program. Evaluate the proposal below and respond with STRICT JSON
of the shape:

{{
  "verdict": "APPROVE" | "REJECT" | "REVISE",
  "score": <integer 0-100>,
  "summary": "<one paragraph>",
  "strengths": ["..."],
  "concerns": ["..."],
  "recommended_amount_gen": <integer, may be lower than requested>
}}

Be concise, specific, and skeptical of vague claims. Penalize budgets
that aren't itemized. Reward open licensing, reproducibility, and
clearly identifiable deliverables.

PROPOSAL
--------
title: {g["title"]}
team_background: {g["team_background"]}
amount_requested_gen: {g["amount_gen"]}
project_url: {g["project_url"]}
applicant: {g["applicant"]}

description:
{g["description"]}
""".strip()

        def _ask_llm() -> str:
            result = gl.nondet.exec_prompt(prompt)
            # Validate JSON shape; if the model returned prose, wrap it.
            try:
                json.loads(result)
                return result
            except Exception:
                return json.dumps({
                    "verdict": "REVISE",
                    "score": 0,
                    "summary": result[:800],
                    "strengths": [],
                    "concerns": ["model did not return valid JSON"],
                    "recommended_amount_gen": 0,
                })

        # Validators must agree the JSON payloads are semantically equivalent.
        verdict = gl.eq_principle.prompt_comparative(
            _ask_llm,
            "The two JSON verdicts must agree on `verdict` and have scores "
            "within 10 points of each other; summaries should describe the "
            "same strengths and concerns.",
        )

        g["review"] = verdict
        self.grants[grant_id] = g

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    @gl.public.view
    def get_review(self, grant_id: u256) -> str:
        assert grant_id < len(self.grants), "unknown grant_id"
        return self.grants[grant_id]["review"]

    @gl.public.view
    def get_grant(self, grant_id: u256) -> Grant:
        assert grant_id < len(self.grants), "unknown grant_id"
        return self.grants[grant_id]

    @gl.public.view
    def get_total_grants(self) -> u256:
        return u256(len(self.grants))
