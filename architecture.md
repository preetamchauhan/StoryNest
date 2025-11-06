# StoryNest — Architecture Overview

This document provides a high-level view of the project structure and data flow. All diagrams are Mermaid-ready for common renderers (VS Code, GitHub).

---

## 1) Repository Map (condensed)

```mermaid
mindmap
  root((StoryNest))
    frontend
      pages
      components
      assets
    backend root
      api_server.py
      langgraph_server.py
      langgraph_client.py
      workflow_nodes.py
      message_bus.py
      image_generator.py
      kid_auth.py
      system_prompts.py
      config.py
      requirements.txt
    config and secrets
      .env
      .encryption.key
      .encryption_key
```
> Tip: ensure any real secrets are not committed; use environment variables and .gitignore for local keys.

---

## 2) System Architecture

```mermaid
graph TD
  %% High-level architecture for StoryNest
  subgraph Client["Frontend TypeScript and CSS"]
    FE[React TS App - frontend]
  end

  subgraph API["Backend API Python"]
    AS[api_server.py - REST and Graph endpoints]
    AUTH[kid_auth.py - Kid and User Auth]
    CFG[config.py - Config and Secrets Loader]
    PROMPTS[system_prompts.py - Prompt Templates]
  end

  subgraph Orchestrator["Orchestration and Runtime Python"]
    LGS[langgraph_server.py - Graph runtime]
    LGC[langgraph_client.py - LangGraph client]
    BUS[message_bus.py - Internal event bus]
    NODES[workflow_nodes.py - Task and Agent nodes]
  end

  subgraph Services["Aux Services Python"]
    IMG[image_generator.py - Image creation]
  end

  FE -->|HTTP or WebSocket| AS
  AS -->|Invoke flows| LGC
  LGC --> LGS
  LGS --> BUS
  BUS --> NODES
  NODES --> IMG
  AS --> AUTH
  AS --> PROMPTS
  AS --> CFG
  LGS --> CFG
  IMG --> CFG
```

---

## 3) Request Lifecycle

```mermaid
sequenceDiagram
  participant U as User Browser
  participant FE as Frontend TS
  participant API as api_server.py
  participant LG as langgraph_server and client
  participant BUS as message_bus
  participant N as workflow_nodes
  participant IMG as image_generator

  U->>FE: Click Generate Story or Image
  FE->>API: POST stories with inputs
  API->>LG: Start or continue graph execution
  LG->>BUS: Publish step_started
  BUS->>N: Dispatch to relevant nodes
  N-->>IMG: Create image if needed
  IMG-->>N: Image URL or bytes
  N-->>LG: Node result text or image
  LG-->>API: Aggregated output
  API-->>FE: 200 OK story and images
  FE-->>U: Render story and illustrations
```

---

## 4) Python Modules Overview

```mermaid
flowchart LR
  AS[api_server.py]
  AUTH[kid_auth.py]
  CFG[config.py]
  PROMPTS[system_prompts.py]
  LGS[langgraph_server.py]
  LGC[langgraph_client.py]
  BUS[message_bus.py]
  NODES[workflow_nodes.py]
  IMG[image_generator.py]

  AS --> LGC
  LGC --> LGS
  LGS --> BUS
  BUS --> NODES
  NODES --> IMG
  AS --> AUTH
  AS --> PROMPTS
  AS --> CFG
  LGS --> CFG
  IMG --> CFG
```
