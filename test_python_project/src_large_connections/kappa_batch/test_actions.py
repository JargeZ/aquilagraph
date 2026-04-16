import unittest

from .actions import (
    KappaBatchAction01,
    KappaBatchAction02,
    KappaBatchAction03,
    KappaBatchAction11,
    KappaBatchAction17,
)


class TestKappaBatchActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(KappaBatchAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = KappaBatchAction02().execute(seed=5)
        b = KappaBatchAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = KappaBatchAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = KappaBatchAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = KappaBatchAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
