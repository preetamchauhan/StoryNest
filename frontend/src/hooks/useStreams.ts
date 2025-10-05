import { useState, useCallback } from "react";

interface StreamEvent {
  type: "event" | "error" | "final" | "log" | "story_complete" | "story_chunk" | "animation";
  data: any;
}

interface UseStreamReturn {
  events: StreamEvent[];
  isStreaming: boolean;
  startStream: (request: any) => void;
  clearEvents: () => void;
}

export const useStream = (): UseStreamReturn => {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = useCallback(async (request: any) => {
    setIsStreaming(true);
    setEvents([]);

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("http://localhost:8000/api/stream-story", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              console.log("Received event:", event);
              setEvents((prev) => [...prev, event]);
            } catch (e) {
              console.error("Failed to parse event:", e);
            }
          }
        }
      }
    } catch (error) {
      setEvents((prev) => [
        ...prev,
        { type: "error", data: "Stream connection failed" },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, isStreaming, startStream, clearEvents };
};
