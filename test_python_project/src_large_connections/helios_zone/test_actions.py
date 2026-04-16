import unittest

from .actions import (
    HeliosZoneAction01,
    HeliosZoneAction02,
    HeliosZoneAction03,
    HeliosZoneAction11,
    HeliosZoneAction17,
)


class TestHeliosZoneActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(HeliosZoneAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = HeliosZoneAction02().execute(seed=5)
        b = HeliosZoneAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = HeliosZoneAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = HeliosZoneAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = HeliosZoneAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
