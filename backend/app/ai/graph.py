"""
LangGraph compiled graph and agent runner for StudentOS.

Holds the compiled StateGraph and the public ``run_agent`` entry point so that
``ai_service.py`` can import the agent without creating a circular import
(``agent.py`` imports ``ai_service.py`` lazily inside ``respond_node``).
"""

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from langgraph.graph import StateGraph, END

from backend.app.ai.agent import (
    AgentState,
    route_node,
    study_plan_node,
    deadline_lookup_node,
    task_lookup_node,
    knowledge_lookup_node,
    respond_node,
)


def _should_continue(state: AgentState) -> str:
    return state.get("intent", "respond")


graph = StateGraph(AgentState)
graph.add_node("route", route_node)
graph.add_node("study_plan", study_plan_node)
graph.add_node("deadline_lookup", deadline_lookup_node)
graph.add_node("task_lookup", task_lookup_node)
graph.add_node("knowledge_lookup", knowledge_lookup_node)
graph.add_node("respond", respond_node)

graph.set_entry_point("route")
graph.add_conditional_edges("route", _should_continue, {
    "study_plan": "study_plan",
    "deadline_lookup": "deadline_lookup",
    "task_lookup": "task_lookup",
    "knowledge_lookup": "knowledge_lookup",
    "respond": "respond",
})
graph.add_edge("study_plan", "respond")
graph.add_edge("deadline_lookup", "respond")
graph.add_edge("task_lookup", "respond")
graph.add_edge("knowledge_lookup", "respond")
graph.add_edge("respond", END)

compiled = graph.compile()


async def run_agent(user_id: str, workspace_id: str, user_message: str, db: Session) -> Dict[str, Any]:
    initial: AgentState = {
        "user_id": user_id,
        "workspace_id": workspace_id,
        "db": db,
        "user_message": user_message,
        "intent": None,
        "context": {},
        "tool_results": {},
        "messages": [],
        "reply": None,
        "requires_approval": False,
    }
    final = await compiled.ainvoke(initial)
    return {
        "reply": final.get("reply", ""),
        "intent": final.get("intent"),
        "tool_results": final.get("tool_results", {}),
    }


__all__ = ["run_agent", "compiled", "AgentState", "graph"]
