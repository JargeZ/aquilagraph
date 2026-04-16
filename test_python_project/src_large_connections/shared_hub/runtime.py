from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


class BaseBusinessAction:
    """
    Lightweight base class to mirror the test project style.
    """

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}()"


class ModelViewSet:
    """
    Minimal stand-in for DRF's viewsets.ModelViewSet.
    """

    serializer_class = None


class Signature:
    def __init__(self, fn: Callable[[], Any], *, name: str) -> None:
        self._fn = fn
        self.name = name

    def apply_async(self) -> dict[str, Any]:
        # Side-effect placeholder.
        return {"scheduled": True, "task": self.name}


def shared_task() -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Minimal stand-in for celery.shared_task.
    """

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
