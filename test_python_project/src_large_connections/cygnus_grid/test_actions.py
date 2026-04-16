import unittest

from .actions import (
    CygnusGridAction01,
    CygnusGridAction02,
    CygnusGridAction03,
    CygnusGridAction11,
    CygnusGridAction17,
)


class TestCygnusGridActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(CygnusGridAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = CygnusGridAction02().execute(seed=5)
        b = CygnusGridAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = CygnusGridAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = CygnusGridAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = CygnusGridAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
