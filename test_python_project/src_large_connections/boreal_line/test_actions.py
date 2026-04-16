import unittest

from .actions import (
    BorealLineAction01,
    BorealLineAction02,
    BorealLineAction03,
    BorealLineAction11,
    BorealLineAction17,
)


class TestBorealLineActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(BorealLineAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = BorealLineAction02().execute(seed=5)
        b = BorealLineAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = BorealLineAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = BorealLineAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = BorealLineAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
