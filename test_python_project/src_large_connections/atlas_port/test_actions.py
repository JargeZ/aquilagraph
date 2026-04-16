import unittest

from .actions import (
    AtlasPortAction01,
    AtlasPortAction02,
    AtlasPortAction03,
    AtlasPortAction11,
    AtlasPortAction17,
)


class TestAtlasPortActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(AtlasPortAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = AtlasPortAction02().execute(seed=5)
        b = AtlasPortAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = AtlasPortAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = AtlasPortAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = AtlasPortAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
