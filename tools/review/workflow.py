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
        if name == "verification":
            update["passed"] = result.get("passed") is True
        return update
    return node


def build_graph(checkpointer):
    graph = StateGraph(ReviewState)
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
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    checkpoint = root / ".local" / "review-20260908" / "workflow.sqlite"
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    config = {"configurable": {"thread_id": "gui-regression-review-20260908"}}
    with SqliteSaver.from_conn_string(str(checkpoint)) as saver:
        graph = build_graph(saver)
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
