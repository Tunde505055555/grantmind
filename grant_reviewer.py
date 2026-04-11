# { "Depends": "py-genlayer:test" }

from genlayer import *

import json
import typing


class GrantReviewer(gl.Contract):
    """
    AI-powered grant reviewer on GenLayer.
    Validators independently run the LLM and reach consensus
    via gl.eq_principle.prompt_comparative (Equivalence Principle).
    """

    # ── Typed on-chain state ─────────────────────────────────────────────────
    owner: Address
    review_count: u256
    proposals: TreeMap[u256, str]
    reviews: TreeMap[u256, str]
    criteria: str

    # ── Constructor ──────────────────────────────────────────────────────────
    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.review_count = u256(0)
        self.criteria = json.dumps({
            "innovation": 25,
            "feasibility": 25,
            "impact": 25,
            "team_quality": 15,
            "budget_clarity": 10
        })

    # ── Write: submit a grant proposal ──────────────────────────────────────
    @gl.public.write
    def submit_grant(
        self,
        title: str,
        description: str,
        team_background: str,
        requested_amount: int,
        project_url: str,
    ) -> None:
        grant_id = self.review_count
        self.review_count = u256(int(self.review_count) + 1)

        proposal = {
            "id": int(grant_id),
            "title": title,
            "description": description,
            "team_background": team_background,
            "requested_amount": requested_amount,
            "project_url": project_url,
            "submitter": gl.message.sender_address.as_hex,
            "status": "pending",
        }
        self.proposals[grant_id] = json.dumps(proposal)

    # ── Write: AI review via Equivalence Principle ───────────────────────────
    @gl.public.write
    def review_grant(self, grant_id: int) -> None:
        gid = u256(grant_id)

        if gid not in self.proposals:
            raise gl.vm.UserError("Grant not found")

        proposal_json = self.proposals[gid]
        criteria_json = self.criteria

        prompt = f"""You are an expert grant reviewer evaluating blockchain and Web3 projects.
Evaluate the proposal below and return ONLY a valid JSON object.
No markdown fences, no explanation — pure JSON only.

PROPOSAL:
{proposal_json}

CRITERIA WEIGHTS (percentages of 100):
{criteria_json}

Return exactly this JSON structure:
{{
  "overall_score": <integer 0-100>,
  "innovation_score": <integer 0-100>,
  "feasibility_score": <integer 0-100>,
  "impact_score": <integer 0-100>,
  "team_quality_score": <integer 0-100>,
  "budget_clarity_score": <integer 0-100>,
  "recommendation": "<FUND | REVISE | REJECT>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "reviewer_comments": "<2-3 sentence summary>",
  "suggested_improvements": "<1-2 actionable suggestions>"
}}
It is mandatory that you respond only using the JSON format above, nothing else.
Don't include any other words or characters.
This result should be perfectly parseable by a JSON parser without errors."""

        def get_review() -> str:
            res = gl.nondet.exec_prompt(prompt)
            res = res.replace("```json", "").replace("```", "")
            print(res)
            return res

        review_raw = gl.eq_principle.prompt_comparative(
            get_review,
            "The recommendation (FUND, REVISE, or REJECT) and overall_score must reflect the same "
            "quality assessment of the grant proposal. Scores should be within 10 points of each other."
        )

        self.reviews[gid] = review_raw

        try:
            proposal = json.loads(proposal_json)
            review = json.loads(review_raw)
            rec = review.get("recommendation", "").upper()
            status_map = {"FUND": "fund", "REJECT": "reject", "REVISE": "revise"}
            proposal["status"] = status_map.get(rec, "reviewed")
            self.proposals[gid] = json.dumps(proposal)
        except Exception:
            pass

    # ── Write: update criteria (owner only) ─────────────────────────────────
    @gl.public.write
    def update_criteria(self, criteria_json: str) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only owner can update criteria")
        self.criteria = criteria_json

    # ── Read: get proposal by ID ─────────────────────────────────────────────
    @gl.public.view
    def get_proposal(self, grant_id: int) -> str:
        gid = u256(grant_id)
        if gid not in self.proposals:
            raise gl.vm.UserError("Grant not found")
        return self.proposals[gid]

    # ── Read: get AI review by grant ID ─────────────────────────────────────
    @gl.public.view
    def get_review(self, grant_id: int) -> str:
        gid = u256(grant_id)
        if gid not in self.reviews:
            return ""
        return self.reviews[gid]

    # ── Read: total proposals ────────────────────────────────────────────────
    @gl.public.view
    def get_total_grants(self) -> int:
        return int(self.review_count)

    # ── Read: scoring criteria ───────────────────────────────────────────────
    @gl.public.view
    def get_criteria(self) -> str:
        return self.criteria

    # ── Read: owner address ──────────────────────────────────────────────────
    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex
