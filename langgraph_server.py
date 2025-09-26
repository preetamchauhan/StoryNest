"""
LangGraph Server for streaming workflow execution.
"""

from langgraph_sdk import get_client
from langgraph.graph import StateGraph
from langgraph_client import LangGraphModerationClient
import asyncio
import json
import sys
import io
import threading
import queue
from contextlib import redirect_stdout


class LangGraphServer:
    """LangGraph server with streaming support."""

    def __init__(self):
        """Initialize the server."""
        self.client = LangGraphModerationClient()

    async def stream_workflow(self, initial_state: dict):
        """Stream workflow execution with real-time events using message bus."""
        import threading
        import queue
        from message_bus import message_bus

        try:
            # Use regular queue for thread communication
            result_queue = queue.Queue()

            def run_workflow():
                try:
                    final_state = self.client.workflow.invoke(initial_state)
                    result_queue.put(("success", final_state))
                except Exception as e:
                    result_queue.put(("error", str(e)))

            workflow_thread = threading.Thread(target=run_workflow)
            workflow_thread.start()

            # Stream messages from message bus in real-time
            while workflow_thread.is_alive():
                # Check for sync messages from workflow nodes
                sync_messages = message_bus.get_sync_messages()
                for msg in sync_messages:
                    if msg["type"] == "log":
                        yield {
                            "type": "log",
                            "data": {"message": msg["message"]}
                        }
                    elif msg["type"] == "error":
                        yield {
                            "type": "error",
                            "data": msg["data"]
                        }
                    elif msg["type"] == "story_complete":
                        yield {
                            "type": "story_complete",
                            "data": msg["data"]
                        }
                    elif msg["type"] == "story_chunk":
                        yield {
                            "type": "story_chunk",
                            "data": msg["data"]
                        }

            # Get any remaining messages after workflow completes
            sync_messages = message_bus.get_sync_messages()
            for msg in sync_messages:
                if msg["type"] == "log":
                    yield {
                        "type": "log",
                        "data": {"message": msg["message"]}
                    }
                elif msg["type"] == "error":
                    yield {
                        "type": "error",
                        "data": msg["data"]
                    }
                elif msg["type"] == "story_complete":
                    yield {
                        "type": "story_complete",
                        "data": msg["data"]
                    }

            # Get final result
            try:
                status, result = result_queue.get(timeout=1.0)
                if status == "success":
                    # Check if validation failed - don't send final success message
                    validator_result = result.get("validator_result")
                    if validator_result and hasattr(validator_result, 'verdict') and validator_result.verdict != "accept":
                        # Validation failed, don't send final success message
                        pass
                    else:
                        # Convert Pydantic models to dict for JSON serialization
                        serializable_result = {}
                        for key, value in result.items():
                            if hasattr(value, 'dict'):
                                serializable_result[key] = value.dict()
                            else:
                                serializable_result[key] = value

                        yield {
                            "type": "final",
                            "data": serializable_result
                        }
                else:
                    yield {
                        "type": "error",
                        "data": result
                    }

            except queue.Empty:
                yield {
                    "type": "error",
                    "data": "Workflow timeout"
                }

        except Exception as e:
            yield {
                "type": "error",
                "data": str(e)
            }

    async def invoke_workflow(self, initial_state: dict):
        """Invoke workflow and return final result with captured logs."""
        captured_output = io.StringIO()

        try:
            with redirect_stdout(captured_output):
                final_state = await asyncio.to_thread(
                    self.client.workflow.invoke,
                    initial_state
                )

            # Get captured logs
            logs = [line.strip() for line in captured_output.getvalue().split('\n') if line.strip()]

            return {
                "type": "final",
                "data": final_state,
                "logs": logs
            }

        except Exception as e:
            logs = [line.strip() for line in captured_output.getvalue().split('\n') if line.strip()]
            return {
                "type": "error",
                "data": {"error": str(e)},
                "logs": logs
            }


# Global server instance
server = LangGraphServer()
