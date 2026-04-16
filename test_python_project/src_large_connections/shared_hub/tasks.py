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
