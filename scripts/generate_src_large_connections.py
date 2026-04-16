from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ModuleSpec:
    name: str
    # Names of other modules this module is "tightly coupled" to.
    tight_links: tuple[str, ...]


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "test_python_project" / "src_large_connections"


MODULES: list[ModuleSpec] = [
    ModuleSpec("shared_hub", ()),
    ModuleSpec("atlas_port", ("shared_hub",)),
    ModuleSpec("boreal_line", ("atlas_port", "shared_hub")),
    ModuleSpec("cygnus_grid", ("draco_bridge", "atlas_port", "shared_hub")),
    ModuleSpec("draco_bridge", ("cygnus_grid", "atlas_port", "shared_hub")),
    ModuleSpec("equinox_stack", ("atlas_port", "shared_hub")),
    ModuleSpec("flux_field", ("equinox_stack", "atlas_port", "shared_hub")),
    ModuleSpec("helios_zone", ("flux_field", "atlas_port", "shared_hub")),
    ModuleSpec("ion_cluster", ("helios_zone", "atlas_port", "shared_hub")),
    ModuleSpec("juno_network", ("ion_cluster", "atlas_port", "shared_hub")),
    ModuleSpec("kappa_batch", ("juno_network", "atlas_port", "shared_hub")),
    ModuleSpec("lyra_station", ("kappa_batch", "atlas_port", "shared_hub")),
    ModuleSpec("matrix_squad", ("lyra_station", "atlas_port", "shared_hub")),
    ModuleSpec("nova_module", ("matrix_squad", "atlas_port", "shared_hub")),
    ModuleSpec("omega_terminal", ("nova_module", "atlas_port", "shared_hub")),
]


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _write(path: Path, content: str) -> None:
    _ensure_dir(path.parent)
    path.write_text(content, encoding="utf-8")


def _render_shared_hub() -> dict[str, str]:
    runtime_py = """\
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


class BaseBusinessAction:
    \"""
    Lightweight base class to mirror the test project style.
    \"""

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}()"


class ModelViewSet:
    \"""
    Minimal stand-in for DRF's viewsets.ModelViewSet.
    \"""

    serializer_class = None


class Signature:
    def __init__(self, fn: Callable[[], Any], *, name: str) -> None:
        self._fn = fn
        self.name = name

    def apply_async(self) -> dict[str, Any]:
        # Side-effect placeholder.
        return {"scheduled": True, "task": self.name}


def shared_task() -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    \"""
    Minimal stand-in for celery.shared_task.
    \"""

    def deco(fn: Callable[..., Any]) -> Callable[..., Any]:
        def si() -> Signature:
            return Signature(lambda: fn(), name=fn.__name__)

        fn.si = si  # type: ignore[attr-defined]
        return fn

    return deco


def on_commit(callback: Callable[[], Any]) -> None:
    # Minimal stand-in for django transaction.on_commit.
    callback()


@dataclass(frozen=True)
class HubContext:
    request_id: str
    actor: str
    module: str


def hub_ping(ctx: HubContext, *, topic: str) -> str:
    return f"{ctx.module}:{topic}:{ctx.actor}:{ctx.request_id}"


def hub_score(seed: int, *, salt: int) -> int:
    # Deterministic scoring used by tests.
    return (seed * 31 + salt * 7) % 10_000
"""

    tasks_py = """\
from __future__ import annotations

from .runtime import HubContext, hub_ping, shared_task


@shared_task()
def task_hub_audit() -> str:
    return hub_ping(HubContext("audit", "system", "shared_hub"), topic="audit")


@shared_task()
def task_hub_emit_metric() -> str:
    return hub_ping(HubContext("metric", "system", "shared_hub"), topic="metric")


@shared_task()
def task_hub_gc() -> str:
    return hub_ping(HubContext("gc", "system", "shared_hub"), topic="gc")


@shared_task()
def task_hub_refresh_cache() -> str:
    return hub_ping(HubContext("cache", "system", "shared_hub"), topic="cache")


@shared_task()
def task_hub_warmup() -> str:
    return hub_ping(HubContext("warmup", "system", "shared_hub"), topic="warmup")
"""

    actions_py = """\
from __future__ import annotations

from .runtime import BaseBusinessAction, HubContext, hub_ping, hub_score


class HubBootstrap(BaseBusinessAction):
    def execute(self, *, actor: str, request_id: str) -> HubContext:
        return HubContext(request_id=request_id, actor=actor, module="shared_hub")


class HubComputeScore(BaseBusinessAction):
    def execute(self, *, seed: int, salt: int) -> int:
        return hub_score(seed, salt=salt)


class HubTrace(BaseBusinessAction):
    def execute(self, *, ctx: HubContext, topic: str) -> str:
        return hub_ping(ctx, topic=topic)


class HubAction01(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=1)


class HubAction02(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=2)


class HubAction03(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        v = hub_score(seed, salt=3)
        return v + HubAction02().execute(seed=seed + 1)


class HubAction04(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        ctx = HubContext(request_id="shared_hub-a04", actor="svc", module="shared_hub")
        _ = hub_ping(ctx, topic="a04")
        return hub_score(seed, salt=4)


class HubAction05(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=5) + HubAction04().execute(seed=seed + 1)


class HubAction06(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=6)


class HubAction07(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=7) + HubAction06().execute(seed=seed + 2)


class HubAction08(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=8)


class HubAction09(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=9) + HubAction08().execute(seed=seed + 1)


class HubAction10(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=10)


class HubAction11(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=11) + HubAction10().execute(seed=seed + 1)


class HubAction12(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=12)


class HubAction13(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=13) + HubAction12().execute(seed=seed + 1)


class HubAction14(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=14)


class HubAction15(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=15) + HubAction14().execute(seed=seed + 1)


class HubAction16(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=16)


class HubAction17(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=17) + HubAction16().execute(seed=seed + 1)


class HubAction18(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=18)


class HubAction19(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=19) + HubAction18().execute(seed=seed + 1)


class HubAction20(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=20)


class HubAction21(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=21) + HubAction20().execute(seed=seed + 1)


class HubAction22(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=22)


class HubAction23(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=23) + HubAction22().execute(seed=seed + 1)


class HubAction24(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=24)


class HubAction25(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=25) + HubAction24().execute(seed=seed + 1)


class HubAction26(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=26)


class HubAction27(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=27) + HubAction26().execute(seed=seed + 1)


class HubAction28(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=28)


class HubAction29(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=29) + HubAction28().execute(seed=seed + 1)


class HubAction30(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=30)


class HubAction31(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=31) + HubAction30().execute(seed=seed + 1)


class HubAction32(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=32)


class HubAction33(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=33) + HubAction32().execute(seed=seed + 1)


class HubAction34(BaseBusinessAction):
    def execute(self, *, seed: int) -> int:
        return hub_score(seed, salt=34)
"""

    views_py = """\
from __future__ import annotations

from .actions import HubBootstrap, HubComputeScore, HubTrace
from .runtime import ModelViewSet
from .tasks import (
    task_hub_audit,
    task_hub_emit_metric,
    task_hub_gc,
    task_hub_refresh_cache,
    task_hub_warmup,
)


class HubViewSet01(ModelViewSet):
    def create(self) -> int:
        ctx = HubBootstrap().execute(actor="api", request_id="hub-01")
        task_hub_audit.si().apply_async()
        return HubComputeScore().execute(seed=1, salt=len(HubTrace().execute(ctx=ctx, topic="create")))


class HubViewSet02(ModelViewSet):
    def list(self) -> str:
        task_hub_emit_metric.si().apply_async()
        return "ok"


class HubViewSet03(ModelViewSet):
    def update(self) -> str:
        task_hub_gc.si().apply_async()
        return "updated"


class HubViewSet04(ModelViewSet):
    def destroy(self) -> str:
        task_hub_refresh_cache.si().apply_async()
        return "deleted"


class HubViewSet05(ModelViewSet):
    def warmup(self) -> str:
        task_hub_warmup.si().apply_async()
        return "warmed"


class HubViewSet06(ModelViewSet):
    def ping(self) -> str:
        ctx = HubBootstrap().execute(actor="api", request_id="hub-06")
        return HubTrace().execute(ctx=ctx, topic="ping")


class HubViewSet07(ModelViewSet):
    def score(self) -> int:
        return HubComputeScore().execute(seed=7, salt=77)


class HubViewSet08(ModelViewSet):
    def audit(self) -> dict:
        return task_hub_audit.si().apply_async()


class HubViewSet09(ModelViewSet):
    def metric(self) -> dict:
        return task_hub_emit_metric.si().apply_async()


class HubViewSet10(ModelViewSet):
    def gc(self) -> dict:
        return task_hub_gc.si().apply_async()


class HubViewSet11(ModelViewSet):
    def cache(self) -> dict:
        return task_hub_refresh_cache.si().apply_async()


class HubViewSet12(ModelViewSet):
    def warm(self) -> dict:
        return task_hub_warmup.si().apply_async()
"""

    test_py = """\
import unittest

from .actions import HubBootstrap, HubComputeScore, HubTrace
from .runtime import hub_score


class TestSharedHubActions(unittest.TestCase):
    def test_bootstrap_creates_context(self):
        ctx = HubBootstrap().execute(actor="tester", request_id="r1")
        self.assertEqual(ctx.actor, "tester")
        self.assertEqual(ctx.request_id, "r1")
        self.assertEqual(ctx.module, "shared_hub")

    def test_compute_score_is_deterministic(self):
        a = HubComputeScore().execute(seed=10, salt=3)
        b = HubComputeScore().execute(seed=10, salt=3)
        self.assertEqual(a, b)

    def test_hub_score_matches_helper(self):
        self.assertEqual(HubComputeScore().execute(seed=2, salt=9), hub_score(2, salt=9))

    def test_trace_includes_topic(self):
        ctx = HubBootstrap().execute(actor="tester", request_id="r2")
        msg = HubTrace().execute(ctx=ctx, topic="x")
        self.assertIn(":x:", msg)

    def test_trace_includes_actor(self):
        ctx = HubBootstrap().execute(actor="alice", request_id="r3")
        msg = HubTrace().execute(ctx=ctx, topic="y")
        self.assertIn(":alice:", msg)
"""

    init_py = ""

    return {
        "__init__.py": init_py,
        "runtime.py": runtime_py,
        "tasks.py": tasks_py,
        "actions.py": actions_py,
        "views.py": views_py,
        "test_actions.py": test_py,
    }


def _render_module(spec: ModuleSpec, *, idx: int) -> dict[str, str]:
    # Per-module config.
    viewset_count = 12 if idx % 3 else 10
    action_count = 34 if idx % 2 else 36
    task_count = 7 if idx % 2 else 6

    # Cross-module relationships are expressed via *local* imports inside execute()
    # to keep import graph dense but safe from circular import failures.
    tight_imports = ""

    # Tasks.
    tasks = []
    for t in range(1, task_count + 1):
        tasks.append(
            f"""@shared_task()\n"""
            f"""def task_{spec.name}_side_effect_{t:02d}() -> str:\n"""
            f"""    ctx = HubContext("t{t:02d}", "system", "{spec.name}")\n"""
            f"""    return hub_ping(ctx, topic="side_effect_{t:02d}")\n"""
        )
    tasks_py = (
        "from __future__ import annotations\n\n"
        "from shared_hub.runtime import HubContext, hub_ping, shared_task\n\n\n"
        + "\n\n".join(tasks)
        + "\n"
    )

    # Actions.
    action_classes = []
    for a in range(1, action_count + 1):
        # Cross-module calls are done via local imports to avoid import cycles.
        cross = ""
        if a % 11 == 0 and "atlas_port" != spec.name:
            cross = (
                "\n        from atlas_port.actions import AtlasPortAction02\n"
                "        v = AtlasPortAction02().execute(seed=seed + 2)\n"
            )
        if a % 17 == 0 and spec.name not in ("cygnus_grid", "draco_bridge"):
            cross += (
                "\n        from cygnus_grid.actions import CygnusGridAction03\n"
                "        v = v + CygnusGridAction03().execute(seed=seed + 3)\n"
            )
        if spec.name == "cygnus_grid" and a % 5 == 0:
            cross += (
                "\n        from draco_bridge.actions import DracoBridgeAction04\n"
                "        v = v + DracoBridgeAction04().execute(seed=seed + 4)\n"
            )
        if spec.name == "draco_bridge" and a % 7 == 0:
            cross += (
                "\n        from cygnus_grid.actions import CygnusGridAction05\n"
                "        v = v + CygnusGridAction05().execute(seed=seed + 5)\n"
            )

        # Intra-module chaining.
        chain = ""
        if a >= 3:
            chain = (
                f"\n        v = v + {spec.name.title().replace('_', '')}Action{a-1:02d}().execute(seed=seed + 1)\n"
            )

        action_classes.append(
            f"""class {spec.name.title().replace('_', '')}Action{a:02d}(BaseBusinessAction):\n"""
            f"""    def execute(self, *, seed: int) -> int:\n"""
            f"""        ctx = HubContext(request_id=f"{spec.name}-a{a:02d}", actor="svc", module="{spec.name}")\n"""
            f"""        v = hub_score(seed, salt={a})\n"""
            f"""        _ = hub_ping(ctx, topic="action_{a:02d}")\n"""
            f"""{chain}"""
            f"""{cross}"""
            f"""        return v\n"""
        )

    actions_py = (
        "from __future__ import annotations\n\n"
        "from shared_hub.runtime import BaseBusinessAction, HubContext, hub_ping, hub_score\n"
        + (f"\n{tight_imports}\n" if tight_imports else "\n")
        + "\n".join(action_classes)
        + "\n"
    )

    # Views.
    viewsets = []
    for v in range(1, viewset_count + 1):
        # Each viewset orchestrates a couple of actions + schedules a task.
        action_a = (v * 2) % action_count or 1
        action_b = (v * 2 + 7) % action_count or 2
        task_idx = (v % task_count) or 1
        viewsets.append(
            f"""class {spec.name.title().replace('_', '')}ViewSet{v:02d}(ModelViewSet):\n"""
            f"""    def dispatch(self, *, seed: int = {v}) -> dict:\n"""
            f"""        a = {spec.name.title().replace('_', '')}Action{action_a:02d}().execute(seed=seed)\n"""
            f"""        b = {spec.name.title().replace('_', '')}Action{action_b:02d}().execute(seed=seed + 1)\n"""
            f"""        scheduled = task_{spec.name}_side_effect_{task_idx:02d}.si().apply_async()\n"""
            f"""        return {{"a": a, "b": b, "scheduled": scheduled}}\n"""
        )
    views_py = (
        "from __future__ import annotations\n\n"
        "from shared_hub.runtime import ModelViewSet\n"
        f"from .actions import {spec.name.title().replace('_', '')}Action01, {spec.name.title().replace('_', '')}Action02\n"
        "from .actions import (\n"
        + "\n".join(
            f"    {spec.name.title().replace('_', '')}Action{a:02d},"
            for a in range(1, min(action_count, 40) + 1)
        )
        + "\n)\n"
        "from .tasks import (\n"
        + "\n".join(f"    task_{spec.name}_side_effect_{t:02d}," for t in range(1, task_count + 1))
        + "\n)\n\n"
        + "\n\n".join(viewsets)
        + "\n"
    )

    # Tests: five tests per module.
    test_py = f"""\
import unittest

from .actions import (
    {spec.name.title().replace('_', '')}Action01,
    {spec.name.title().replace('_', '')}Action02,
    {spec.name.title().replace('_', '')}Action03,
    {spec.name.title().replace('_', '')}Action11,
    {spec.name.title().replace('_', '')}Action17,
)


class Test{spec.name.title().replace('_', '')}Actions(unittest.TestCase):
    def test_action01_returns_int(self):
        self.assertIsInstance({spec.name.title().replace('_', '')}Action01().execute(seed=1), int)

    def test_action02_is_deterministic(self):
        a = {spec.name.title().replace('_', '')}Action02().execute(seed=5)
        b = {spec.name.title().replace('_', '')}Action02().execute(seed=5)
        self.assertEqual(a, b)

    def test_action03_chains(self):
        v = {spec.name.title().replace('_', '')}Action03().execute(seed=2)
        self.assertGreaterEqual(v, 0)

    def test_action11_cross_module_possible(self):
        v = {spec.name.title().replace('_', '')}Action11().execute(seed=3)
        self.assertGreaterEqual(v, 0)

    def test_action17_cross_module_possible(self):
        v = {spec.name.title().replace('_', '')}Action17().execute(seed=4)
        self.assertGreaterEqual(v, 0)
"""

    init_py = ""

    return {
        "__init__.py": init_py,
        "actions.py": actions_py,
        "tasks.py": tasks_py,
        "views.py": views_py,
        "test_actions.py": test_py,
    }


def main() -> None:
    _ensure_dir(TARGET)
    _write(TARGET / "__init__.py", "")

    # Shared hub first.
    shared = _render_shared_hub()
    for rel, content in shared.items():
        _write(TARGET / "shared_hub" / rel, content)

    # Other modules.
    for idx, spec in enumerate(MODULES):
        if spec.name == "shared_hub":
            continue
        rendered = _render_module(spec, idx=idx)
        for rel, content in rendered.items():
            _write(TARGET / spec.name / rel, content)

    print(f"Generated {len(MODULES)} modules into {TARGET}")


if __name__ == "__main__":
    # Allow running from anywhere.
    os.chdir(ROOT)
    main()
