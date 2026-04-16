import unittest

from .actions import (
    IonClusterAction01,
    IonClusterAction02,
    IonClusterAction03,
    IonClusterAction11,
    IonClusterAction17,
)


class TestIonClusterActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(IonClusterAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = IonClusterAction02().execute(seed=5)
        b = IonClusterAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = IonClusterAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = IonClusterAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = IonClusterAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
