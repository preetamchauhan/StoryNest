"""
LangGraph workflow for child safety moderation.
"""

import logging
from typing import TypedDict
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE, OPENAI_MAX_TOKENS
from workflow_nodes import (
    ChoiceMenuNode,
    SurpriseModeNode,
    GuidedModeNode,
    FreeformModeNode,
    ValidatePromptNode,
    DetectLanguageNode,
    ModeratePromptNode,
    ParseResponseNode,
    ImproveShortNode,
    ImproveLongNode,
    KidStoryGeneratorNode,
    GenerateStoryImageNode,
)

logger = logging.getLogger(__name__)


class ModerationResult(BaseModel):
    """Structured moderation result."""

    decision: str = Field(description="Either 'positive' or 'negative'")
    reasoning: str = Field(description="Detailed reasoning for the decision")
    suggestions: str = Field(default="", description="Suggestions for improvement if negative")


class ValidatorResult(BaseModel):
    """Structured validation result."""

    verdict: str = Field(description="accept, revise, or reject")
    reason: str = Field(description="Justification for verdict")
    language: str = Field(description="Detected language")
    quality_score: int = Field(description="Quality score 0-100")
    improved_prompt: str = Field(description="Improved version of prompt")


class ModerationState(TypedDict):
    """State for moderation workflow."""

    mode: str  # 'surprise', 'guided', 'freeform'
    prompt: str
    age: int
    language: str
    story_data: dict  # Structured story data model
    validator_result: ValidatorResult
    response: str
    result: ModerationResult
    story_json: dict
    story_dict: dict
    session_frames: dict  # Session dictionary with frame data and images
    image_paths: list  # List of generated image paths


class LangGraphModerationClient:
    """LangGraph workflow for content moderation."""

    def __init__(self):
        """Initialize the LangGraph moderation client."""
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.llm = ChatOpenAI(
            api_key=OPENAI_API_KEY,
            model=OPENAI_MODEL,
            temperature=OPENAI_TEMPERATURE,
            max_tokens=OPENAI_MAX_TOKENS,
        )

        # Initialize workflow nodes
        self.choice_menu = ChoiceMenuNode()
        self.surprise_mode = SurpriseModeNode(self.llm)
        self.guided_mode = GuidedModeNode(self.llm)
        self.freeform_mode = FreeformModeNode()
        self.validate_prompt = ValidatePromptNode(self.llm)
        self.detect_language = DetectLanguageNode(self.llm)
        self.moderate_prompt = ModeratePromptNode(self.llm)
        self.parse_response = ParseResponseNode()
        self.improve_short = ImproveShortNode(self.llm)
        self.improve_long = ImproveLongNode(self.llm)
        self.generate_story = KidStoryGeneratorNode(self.llm)
        self.generate_story_image = GenerateStoryImageNode(self.llm)

        self.workflow = self._create_workflow()


    def _create_workflow(self) -> StateGraph:
        """Create the moderation workflow."""
        workflow = StateGraph(ModerationState)

        # Add workflow nodes
        workflow.add_node("choice_menu", self.choice_menu)
        workflow.add_node("surprise_mode", self.surprise_mode)
        workflow.add_node("guided_mode", self.guided_mode)
        workflow.add_node("freeform_mode", self.freeform_mode)
        workflow.add_node("validate", self.validate_prompt)
        workflow.add_node("detect_language", self.detect_language)
        workflow.add_node("moderate", self.moderate_prompt)
        workflow.add_node("parse", self.parse_response)
        workflow.add_node("improve_short", self.improve_short)
        workflow.add_node("improve_long", self.improve_long)
        workflow.add_node("generate_story", self.generate_story)
        workflow.add_node("generate_story_image", self.generate_story_image)

        # Set entry point to choice menu for mode routing
        workflow.set_entry_point("choice_menu")

        # Route from choice menu to appropriate mode
        workflow.add_conditional_edges(
            "choice_menu",
            self._check_mode_choice,
            {
                "surprise": "surprise_mode",
                "guided": "guided_mode",
                "freeform": "freeform_mode",
            },
        )

        # Connect modes to moderation
        workflow.add_edge("surprise_mode", "moderate")
        workflow.add_edge("guided_mode", "moderate")
        workflow.add_edge("freeform_mode", "moderate")

        # Moderation pipeline
        workflow.add_edge("moderate", "parse")
        workflow.add_conditional_edges(
            "parse",
            self._check_word_count,
            {
                "improve_short": "improve_short",
                "improve_long": "improve_long",
            },
        )

        # Improvement to decision check
        workflow.add_conditional_edges(
            "improve_short",
            self._check_decision,
            {"generate": "generate_story", "retry": "choice_menu"},
        )

        workflow.add_conditional_edges(
            "improve_long",
            self._check_decision,
            {"generate": "generate_story", "retry": "choice_menu"},
        )

        # End workflow
        workflow.add_edge("generate_story", END)

        # Validation workflow
        workflow.add_conditional_edges(
            "validate",
            self._check_validator_verdict,
            {
                "continue": "detect_language",
                "stop": END,
            },
        )
        workflow.add_edge("detect_language", "moderate")

        return workflow.compile()


    def _check_mode_choice(self, state: ModerationState) -> str:
        """Route to appropriate mode based on user choice."""
        return state["mode"]


    def _check_validator_verdict(self, state: ModerationState) -> str:
        """Check validator verdict and determine next step."""
        verdict = state["validator_result"].verdict

        if verdict == "accept":
            from message_bus import message_bus

            message_bus.publish_sync(
                "log", "✅ Prompt validation passed! Proceeding to moderation..."
            )
            return "continue"
        else:
            return "stop"


    def _check_word_count(self, state: ModerationState) -> str:
        """Check if prompt has less than 15 words."""
        word_count = len(state["prompt"].split())
        print(f"🔎 Word count: {word_count}")

        if word_count < 15:
            print("⚠️ Prompt is too short, improving context...")
            return "improve_short"
        else:
            print("✅ Prompt has sufficient length, improving context...")
            return "improve_long"


    def _check_decision(self, state: ModerationState) -> str:
        """Check decision and determine next step."""
        decision = state["result"].decision

        if decision == "positive":
            print("✅ Prompt approved! Proceeding to story generation...")
            return "generate"
        else:
            print("❌ Prompt needs improvement. Please try again.")
            return "retry"


    def generate_story_images(self, prompt: str, age: int, language: str) -> dict:
        """Generate story images using session prompt directly without re-improvement."""
        state = ModerationState(
            mode="",
            prompt=prompt,
            age=age,
            language=language,
            story_data={},
            validator_result=None,
            response="",
            result=None,
            story_json={},
            story={},
            session_frames={},
            image_paths=[],
        )

        # Use the session prompt directly without re-improvement
        result_state = self.generate_story_image(state)

        import json

        print("\n=== Generated Story JSON ===")
        print(json.dumps(result_state["story_json"], indent=2, ensure_ascii=False))
        print("=== End Story JSON ===\n")

        if "session_frames" in result_state:
            print("\n=== Session Frames Dictionary ===")
            for frame_key, frame_data in result_state["session_frames"].items():
                # Safe accessors
                def _get_title_from_fd(fd):
                    """Return title string for fd which may be dict, tuple (i, dict), list, or None."""
                    if fd is None:
                        return "<no title>"
                    # dict-like
                    if isinstance(fd, dict):
                        return fd.get("title") or "<no title>"
                    # tuple-like (index, dict)
                    if isinstance(fd, tuple) and len(fd) >= 2 and isinstance(fd[1], dict):
                        return fd[1].get("title") or "<no title>"
                    # list-like with dict first element
                    if isinstance(fd, list) and len(fd) > 0 and isinstance(fd[0], dict):
                        return fd[0].get("title") or "<no title>"
                    # object with attribute or get()
                    try:
                        if hasattr(fd, "get"):
                            return fd.get("title") or "<no title>"
                        if hasattr(fd, "title"):
                            return getattr(fd, "title") or "<no title>"
                    except Exception:
                        pass
                    # fallback to string repr
                    try:
                        return str(fd)
                    except Exception:
                        return "<invalid frame_data>"

                # frame_data may itself be a dict containing keys 'frame_data' and 'image_path'
                fd = frame_data.get("frame_data") if isinstance(frame_data, dict) else frame_data
                title = _get_title_from_fd(fd)

                # safe image_path extraction
                image_path = None
                if isinstance(frame_data, dict):
                    image_path = frame_data.get("image_path")
                else:
                    # try attribute access if it's an object
                    image_path = getattr(frame_data, "image_path", None)

                print(f"{frame_key}: {title} -> {image_path}")
            print("=== End Session Frames ===\n")


        return result_state
