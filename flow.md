# StoryNest — End-to-End Flow (VS Code friendly)

Below are minimal-safe Mermaid blocks tested for stricter parsers (one edge per line, simple labels, and two-participant notes).

---

## 1) Flowchart (Mermaid ultra-safe)

```mermaid
flowchart LR
  U[User]
  subgraph FE["Frontend - React TS"]
    LOGIN[Login Form - FoodAuth]
    APP[Protected Views - Home and Story]
  end

  subgraph API["FastAPI Backend - api_server.py"]
    AUTH[kid_auth.py - auth endpoints]
    GEN[Story endpoints - stream_story and generate_story]
    IMGAPI[Image endpoint - generate_images optional]
  end

  subgraph LG["LangGraph Orchestration - langgraph_client.py"]
    LGC[StateGraph - ModerationState]
    subgraph NODES["workflow_nodes.py - Nodes"]
      CHOICE[choice_menu]
      SURP[surprise_mode]
      GUID[guided_mode]
      FREE[freeform_mode]
      VALID[validate]
      DETLANG[detect_language]
      MOD[moderate]
      PARSE[parse]
      ISHORT[improve_short]
      ILONG[improve_long]
      GENSTORY[generate_story]
      GENIMG[generate_story_image - auxiliary]
    end
  end

  subgraph AUX["Aux Services"]
    BUS[message_bus.py - logging events]
    IMG[image_generator.py]
  end

  U --> LOGIN
  LOGIN -->|POST auth login| AUTH
  AUTH -->|JWT token| APP
  AUTH -->|fail| LOGIN

  APP -->|POST stream_story with payload| GEN
  GEN --> LGC
  LGC --> CHOICE
  CHOICE -->|mode surprise| SURP
  CHOICE -->|mode guided| GUID
  CHOICE -->|mode freeform| FREE

  SURP --> MOD
  GUID --> VALID
  FREE --> VALID

  VALID -->|verdict continue| DETLANG
  DETLANG --> MOD
  VALID -->|verdict stop end| APP

  MOD --> PARSE
  PARSE -->|word_count short| ISHORT
  PARSE -->|word_count long| ILONG

  ISHORT -->|decision generate| GENSTORY
  ISHORT -->|decision retry| CHOICE
  ILONG -->|decision generate| GENSTORY
  ILONG -->|decision retry| CHOICE

  GENSTORY -->|story output| GEN
  GEN --> APP

  APP -->|optional POST generate_images| IMGAPI
  IMGAPI --> GENIMG
  GENIMG --> IMG
  GENIMG -->|image paths| IMGAPI
  IMGAPI --> APP

  LGC -. log .-> BUS
  NODES -. log .-> BUS
```

---

## 2) Sequence — Streaming story (UI to API to LangGraph)

```mermaid
sequenceDiagram
  participant U as User Browser
  participant FE as Frontend React
  participant API as FastAPI stream_story
  participant LG as LangGraph Client
  participant G as Graph Nodes
  participant BUS as message_bus
  participant IMG as image_generator optional

  U->>FE: Click Generate
  FE->>API: POST stream_story {mode prompt age language}
  API->>LG: Start or continue StateGraph
  LG->>G: Entry to choice_menu
  G->>G: Route by mode

  alt guided or freeform
    G->>G: validate then verdict
    opt verdict stop
      G-->>LG: END
      LG-->>API: stream validation failed
      API-->>FE: close
    end
    G->>G: detect_language then moderate then parse
  else surprise
    G->>G: moderate then parse
  end

  G->>G: parse to improve_short or improve_long
  G->>G: improve to generate or retry to choice_menu
  G-->>LG: generate_story then END
  LG-->>API: stream chunks
  API-->>FE: streamed json

  par optional images
    FE->>API: POST generate_images
    API->>IMG: prompts
    IMG-->>API: files or paths
    API-->>FE: image urls
  end

  Note over LG,API: Nodes publish logs to message_bus
```
