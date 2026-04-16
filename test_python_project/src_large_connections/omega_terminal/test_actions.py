import unittest

from .actions import (
    OmegaTerminalAction01,
    OmegaTerminalAction02,
    OmegaTerminalAction03,
    OmegaTerminalAction11,
    OmegaTerminalAction17,
)


class TestOmegaTerminalActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(OmegaTerminalAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = OmegaTerminalAction02().execute(seed=5)
        b = OmegaTerminalAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = OmegaTerminalAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = OmegaTerminalAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = OmegaTerminalAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
