import unittest

from .actions import (
    MatrixSquadAction01,
    MatrixSquadAction02,
    MatrixSquadAction03,
    MatrixSquadAction11,
    MatrixSquadAction17,
)


class TestMatrixSquadActions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance(MatrixSquadAction01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = MatrixSquadAction02().execute(seed=5)
        b = MatrixSquadAction02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = MatrixSquadAction03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = MatrixSquadAction11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = MatrixSquadAction17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
