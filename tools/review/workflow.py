# SPDX-License-Identifier: BUSL-1.1
# Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
"""Checkpointed review coordination; authorized tools perform all work outside nodes.

python tools/review/workflow.py start
python tools/review/workflow.py status
python tools/review/workflow.py complete forge_rework "Evidence and file paths"
python tools/review/workflow.py complete verification "Passing checks" --passed

The graph only requests work and records evidence. It never invokes models, edits
source, runs commands, or grants permissions. Its local SQLite checkpointer is the
only persistence boundary. Resume evidence comes from the supervising tool session.
"""
import argparse
import json
import operator
import os
from pathlib import Path
from typing import Annotated, TypedDict

os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt


class ReviewState(TypedDict):
    evidence: Annotated[list[dict], operator.add]
    passed: bool


def work_node(name: str):
    def node(state: ReviewState):
        result = interrupt({"work": name})
        if not isinstance(result, dict) or not result.get("evidence"):
            raise ValueError("Completion requires concrete evidence")
        update = {"evidence": [{"work": name, **result}]}
        if name.endswith("verification"):
            update["passed"] = result.get("passed") is True
        return update
    return node


def build_graph(checkpointer, workflow="review"):
    graph = StateGraph(ReviewState)
    if workflow == "map-visuals":
        branches = ["cartography_data", "cartography_engine", "cartography_ui"]
        for name in ["discovery", "design", *branches, "verification", "repair", "delivery", "handoff"]:
            graph.add_node(name, work_node(name))
        graph.add_edge(START, "discovery")
        graph.add_edge("discovery", "design")
        for name in branches:
            graph.add_edge("design", name)
        graph.add_edge(branches, "verification")
        graph.add_conditional_edges("verification", lambda state: "delivery" if state["passed"] else "repair")
        graph.add_edge("repair", "verification")
        graph.add_edge("delivery", "handoff")
        graph.add_edge("handoff", END)
        return graph.compile(checkpointer=checkpointer)
    if workflow == "delivery":
        branches = ["integration_server", "integration_client", "integration_render"]
        for name in ["preflight", "integration", *branches, "verification", "repair", "merge_main", "desktop", "desktop_verification", "desktop_repair", "install", "handoff"]:
            graph.add_node(name, work_node(name))
        graph.add_edge(START, "preflight")
        graph.add_edge("preflight", "integration")
        for name in branches:
            graph.add_edge("integration", name)
        graph.add_edge(branches, "verification")
        graph.add_conditional_edges("verification", lambda state: "desktop" if state["passed"] else "repair")
        graph.add_edge("repair", "verification")
        # A verified source fix can land independently of the packaged runtime check.
        # Installation still requires the actual desktop verifier to pass. This also lets
        # the user package main while newer features remain in their separate worktree.
        graph.add_edge("desktop", "merge_main")
        graph.add_edge("desktop_repair", "merge_main")
        graph.add_edge("merge_main", "desktop_verification")
        graph.add_conditional_edges("desktop_verification", lambda state: "install" if state["passed"] else "desktop_repair")
        graph.add_edge("install", "handoff")
        graph.add_edge("handoff", END)
        return graph.compile(checkpointer=checkpointer)
    if workflow == "map-research":
        branches = ["city_sources", "dungeon_sources", "local_gap_analysis"]
        for name in ["discovery", *branches, "synthesis", "verification", "repair", "handoff"]:
            graph.add_node(name, work_node(name))
        graph.add_edge(START, "discovery")
        for name in branches:
            graph.add_edge("discovery", name)
        graph.add_edge(branches, "synthesis")
        graph.add_edge("synthesis", "verification")
        graph.add_conditional_edges("verification", lambda state: "handoff" if state["passed"] else "repair")
        graph.add_edge("repair", "verification")
        graph.add_edge("handoff", END)
        return graph.compile(checkpointer=checkpointer)
    if workflow == "features":
        previous = START
        for phase, branches in [
            ("settlement", ["settlement_backend", "settlement_ui", "settlement_tests"]),
            ("chronist", ["chronist_backend", "chronist_engine", "chronist_ui"]),
            ("npc", ["npc_backend", "npc_ui", "npc_tests"]),
            ("final", ["gui_polish", "completion_audit"]),
        ]:
            verification, repair = f"{phase}_verification", f"{phase}_repair"
            for name in branches + [verification, repair]:
                graph.add_node(name, work_node(name))
            for name in branches:
                graph.add_edge(previous, name)
            graph.add_edge(branches, verification)
            # A separate join carries a passing phase into the next feature.
            done = f"{phase}_done"
            graph.add_node(done, lambda state: {})
            graph.add_conditional_edges(verification, lambda state, done=done, repair=repair: done if state["passed"] else repair)
            graph.add_edge(repair, verification)
            previous = done
        graph.add_node("handoff", work_node("handoff"))
        graph.add_edge(previous, "handoff")
        graph.add_edge("handoff", END)
        return graph.compile(checkpointer=checkpointer)
    branches = ["data_review", "play_review", "forge_rework", "shell_rework"]
    for name in branches + ["verification", "repair", "handoff"]:
        graph.add_node(name, work_node(name))
    for name in branches:
        graph.add_edge(START, name)
    graph.add_edge(branches, "verification")
    graph.add_conditional_edges("verification", lambda state: "handoff" if state["passed"] else "repair")
    graph.add_edge("repair", "verification")
    graph.add_edge("handoff", END)
    return graph.compile(checkpointer=checkpointer)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["start", "status", "complete"])
    parser.add_argument("work", nargs="?")
    parser.add_argument("evidence", nargs="?")
    parser.add_argument("--passed", action="store_true")
    parser.add_argument("--workflow", choices=["review", "features", "map-research", "map-visuals", "delivery"], default="review")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    checkpoint = root / ".local" / f"{args.workflow}-20260908" / "workflow.sqlite"
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    config = {"configurable": {"thread_id": f"gui-{args.workflow}-20260908" if args.workflow != "review" else "gui-regression-review-20260908"}}
    with SqliteSaver.from_conn_string(str(checkpoint)) as saver:
        graph = build_graph(saver, args.workflow)
        state = graph.get_state(config)
        if args.action == "start":
            if state.created_at:
                parser.error("Workflow already exists; use status or complete")
            graph.invoke({"evidence": [], "passed": False}, config)
        elif args.action == "complete":
            pending = [i for task in state.tasks if task.name in state.next for i in task.interrupts if i.value["work"] == args.work]
            if len(pending) != 1 or not args.evidence:
                parser.error("Choose one pending work item and provide evidence")
            graph.invoke(Command(resume={pending[0].id: {"evidence": args.evidence, "passed": args.passed}}), config)
        state = graph.get_state(config)
        print(json.dumps({"next": state.next, "pending": [i.value for task in state.tasks if task.name in state.next for i in task.interrupts], "state": state.values}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
