"""
Message bus for real-time communication between workflow nodes and UI.
"""

import asyncio
from typing import Dict, List, Callable


class MessageBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.message_queue = asyncio.Queue()

    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    async def publish(self, event_type: str, data):
        await self.message_queue.put({"type": event_type, "data": data})

    async def get_message(self):
        return await self.message_queue.get()

    def publish_sync(self, event_type: str, data):
        """Synchronous publish for use in workflow nodes"""
        # Always use fallback list for synchronous access
        if not hasattr(self, "_sync_messages"):
            self._sync_messages = []

        # Handle both string messages and dict data
        if event_type == "log":
            self._sync_messages.append({"type": event_type, "message": data})
        else:
            self._sync_messages.append({"type": event_type, "data": data})

    def get_sync_messages(self):
        """Get messages stored synchronously"""
        if hasattr(self, "_sync_messages"):
            messages = self._sync_messages.copy()
            self._sync_messages.clear()
            return messages
        return []

    def clear_all(self):
        """Clear all messages and reset message bus state"""
        self.subscribers.clear()
        if hasattr(self, "_sync_messages"):
            self._sync_messages.clear()
        # Clear async queue
        while not self.message_queue.empty():
            try:
                self.message_queue.get_nowait()
            except:
                break


# Global message bus instance
message_bus = MessageBus()
