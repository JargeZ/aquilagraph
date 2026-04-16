import unittest

from .actions import (
    JunoNetworkAction01,
    JunoNetworkAction02,
    JunoNetworkAction03,
    JunoNetworkAction11,
    JunoNetworkAction17,
)


class TestJunoNetworkActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(JunoNetworkAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = JunoNetworkAction02().execute(seed=5)
        b = JunoNetworkAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = JunoNetworkAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = JunoNetworkAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = JunoNetworkAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
