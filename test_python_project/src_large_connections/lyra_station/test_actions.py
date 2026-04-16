import unittest

from .actions import (
    LyraStationAction01,
    LyraStationAction02,
    LyraStationAction03,
    LyraStationAction11,
    LyraStationAction17,
)


class TestLyraStationActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(LyraStationAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = LyraStationAction02().execute(seed=5)
        b = LyraStationAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = LyraStationAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = LyraStationAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = LyraStationAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
