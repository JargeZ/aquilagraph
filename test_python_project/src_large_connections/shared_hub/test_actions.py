import unittest

from .actions import HubBootstrap, HubComputeScore, HubTrace
from .runtime import hub_score


class TestSharedHubActions(unittest.TestCase):
    def test_bootstrap_creates_context(self):
        ctx = HubBootstrap().execute(actor="tester", request_id="r1")
        self.assertEqual(ctx.actor, "tester")
        self.assertEqual(ctx.request_id, "r1")
        self.assertEqual(ctx.module, "shared_hub")

    def test_compute_score_is_deterministic(self):
        a = HubComputeScore().execute(seed=10, salt=3)
        b = HubComputeScore().execute(seed=10, salt=3)
        self.assertEqual(a, b)

    def test_hub_score_matches_helper(self):
        self.assertEqual(HubComputeScore().execute(seed=2, salt=9), hub_score(2, salt=9))

    def test_trace_includes_topic(self):
        ctx = HubBootstrap().execute(actor="tester", request_id="r2")
        msg = HubTrace().execute(ctx=ctx, topic="x")
        self.assertIn(":x:", msg)

    def test_trace_includes_actor(self):
        ctx = HubBootstrap().execute(actor="alice", request_id="r3")
        msg = HubTrace().execute(ctx=ctx, topic="y")
        self.assertIn(":alice:", msg)
