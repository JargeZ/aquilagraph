import unittest

from .actions import (
    FluxFieldAction01,
    FluxFieldAction02,
    FluxFieldAction03,
    FluxFieldAction11,
    FluxFieldAction17,
)


class TestFluxFieldActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(FluxFieldAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = FluxFieldAction02().execute(seed=5)
        b = FluxFieldAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = FluxFieldAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = FluxFieldAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = FluxFieldAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
