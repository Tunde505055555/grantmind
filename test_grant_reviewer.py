"""
Integration tests for GrantReviewer intelligent contract.
Run with: gltest --network studionet
"""
import pytest
import json


CONTRACT_PATH = "contracts/grant_reviewer.py"


@pytest.fixture(scope="module")
def contract(gl_client, default_account):
    """Deploy a fresh GrantReviewer contract for testing."""
    factory = gl_client.get_contract_factory(CONTRACT_PATH)
    instance = factory.deploy(
        from_account=default_account,
        args=[],
    )
    return instance


def test_initial_state(contract, default_account):
    """Contract initialises with zero grants and owner set."""
    total = contract.get_total_grants()
    assert total == 0

    owner = contract.get_owner()
    assert owner.lower() == default_account.address.lower()


def test_submit_grant(contract, default_account):
    """Submitting a grant increments the counter and stores proposal data."""
    contract.submit_grant(
        "Decentralised Climate Oracle",
        "A Web3 oracle that fetches and verifies climate data on-chain.",
        "Team of 3 engineers with 5 years blockchain experience.",
        50000,
        "https://github.com/example/climate-oracle",
        from_account=default_account,
    )

    total = contract.get_total_grants()
    assert total == 1

    proposal_raw = contract.get_proposal(0)
    proposal = json.loads(proposal_raw)
    assert proposal["title"] == "Decentralised Climate Oracle"
    assert proposal["status"] == "pending"
    assert proposal["requested_amount"] == 50000


def test_review_grant(contract, default_account):
    """AI review produces a structured JSON result with valid recommendation."""
    contract.review_grant(0, from_account=default_account)

    review_raw = contract.get_review(0)
    assert review_raw != "", "Review should not be empty after review_grant"

    review = json.loads(review_raw)
    assert "overall_score" in review
    assert 0 <= review["overall_score"] <= 100
    assert review["recommendation"] in ("FUND", "REVISE", "REJECT")
    assert isinstance(review["strengths"], list)
    assert isinstance(review["weaknesses"], list)

    # Proposal status should be updated
    proposal_raw = contract.get_proposal(0)
    proposal = json.loads(proposal_raw)
    assert proposal["status"] in ("fund", "revise", "reject", "reviewed")


def test_update_criteria_owner(contract, default_account):
    """Owner can update scoring criteria."""
    new_criteria = json.dumps({
        "innovation": 30,
        "feasibility": 20,
        "impact": 30,
        "team_quality": 10,
        "budget_clarity": 10
    })
    contract.update_criteria(new_criteria, from_account=default_account)
    stored = contract.get_criteria()
    assert json.loads(stored)["innovation"] == 30


def test_update_criteria_non_owner_fails(contract, accounts):
    """Non-owner cannot update criteria."""
    non_owner = accounts[1]
    with pytest.raises(Exception, match="Only owner"):
        contract.update_criteria(
            json.dumps({"innovation": 100}),
            from_account=non_owner,
        )


def test_get_nonexistent_grant_fails(contract):
    """Requesting a non-existent grant raises an error."""
    with pytest.raises(Exception, match="Grant not found"):
        contract.get_proposal(9999)
