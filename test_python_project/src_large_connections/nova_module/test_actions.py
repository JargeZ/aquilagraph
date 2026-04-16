import unittest

from .actions import (
    NovaModuleAction01,
    NovaModuleAction02,
    NovaModuleAction03,
    NovaModuleAction11,
    NovaModuleAction17,
)


class TestNovaModuleActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(NovaModuleAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = NovaModuleAction02().execute(seed=5)
        b = NovaModuleAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = NovaModuleAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = NovaModuleAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = NovaModuleAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
