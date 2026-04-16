from __future__ import annotations

from shared_hub.runtime import HubContext, hub_ping, shared_task


@shared_task()
def task_draco_bridge_side_effect_01() -> str:
    ctx = HubContext("t01", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_01")


@shared_task()
def task_draco_bridge_side_effect_02() -> str:
    ctx = HubContext("t02", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_02")


@shared_task()
def task_draco_bridge_side_effect_03() -> str:
    ctx = HubContext("t03", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_03")


@shared_task()
def task_draco_bridge_side_effect_04() -> str:
    ctx = HubContext("t04", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_04")


@shared_task()
def task_draco_bridge_side_effect_05() -> str:
    ctx = HubContext("t05", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_05")


@shared_task()
def task_draco_bridge_side_effect_06() -> str:
    ctx = HubContext("t06", "system", "draco_bridge")
    return hub_ping(ctx, topic="side_effect_06")

