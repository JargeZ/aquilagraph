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
