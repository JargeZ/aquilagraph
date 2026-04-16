import unittest

from .actions import (
    DracoBridgeAction01,
    DracoBridgeAction02,
    DracoBridgeAction03,
    DracoBridgeAction11,
    DracoBridgeAction17,
)


class TestDracoBridgeActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(DracoBridgeAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = DracoBridgeAction02().execute(seed=5)
        b = DracoBridgeAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = DracoBridgeAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = DracoBridgeAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = DracoBridgeAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
