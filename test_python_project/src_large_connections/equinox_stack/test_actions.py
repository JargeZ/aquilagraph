import unittest

from .actions import (
    EquinoxStackAction01,
    EquinoxStackAction02,
    EquinoxStackAction03,
    EquinoxStackAction11,
    EquinoxStackAction17,
)


class TestEquinoxStackActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(EquinoxStackAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = EquinoxStackAction02().execute(seed=5)
        b = EquinoxStackAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = EquinoxStackAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = EquinoxStackAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = EquinoxStackAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
