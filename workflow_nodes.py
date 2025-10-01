"""
Workflow node classes for the LangGraph moderation pipeline.
"""

import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from system_prompts import (
    KID_STORY_PROMPT_GUARD,
    get_moderation_prompt,
    get_improve_short_prompt,
    get_improve_long_prompt,
    get_surprise_story_prompt,
    get_guided_story_prompt,
    get_language_detection_prompt,
)

# Language code to full name mapping
LANGUAGE_NAMES = {
    "en": "ENGLISH",
    "de": "GERMAN",
    "fr": "FRENCH",
    "es": "SPANISH",
    "hi": "HINDI",
    "ja": "JAPANESE",
    "ko": "KOREAN",
    "ar": "ARABIC",
}


def get_language_display_name(language_code):
    """Get full uppercase language name from code."""
    return LANGUAGE_NAMES.get(language_code, language_code.upper())


class ChoiceMenuNode:
    """Handle story creation menu and user choice."""

    def __call__(self, state):
        from message_bus import message_bus

        mode = state.get("mode", "surprise")
        message_bus.publish_sync("log", f"📖 Mode selected: {mode}")
        return state


class SurpriseModeNode:
    """Handle surprise mode = instant random story."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        from message_bus import message_bus

        # Use age and language from API request
        age = state.get("age", 8)
        language = state.get("language", "en")

        state["age"] = age
        state["language"] = language

        # Debug log
        language_name = get_language_display_name(language)
        message_bus.publish_sync(
            "log", f"🌍 Language selected: {language_name} (Age: {age})"
        )

        # Determine age group for prompt
        if age <= 7:
            age_group = "6-7"
        elif age <= 9:
            age_group = "8-9"
        else:
            age_group = "10-12"

        state["age_group"] = age_group

        # Generate story idea using LLM
        surprise_prompt = get_surprise_story_prompt()
        messages = [
            SystemMessage(content=surprise_prompt),
            HumanMessage(content=f"Age_group= {age_group}, language= {language}"),
        ]
        message_bus.publish_sync("log", "✨ Generating story idea...")
        response = self.llm.invoke(messages)
        prompt = response.content.strip()

        # Clean up reasoning (if model outputs meta content)
        prompt = re.sub(
            r"<reasoning>.*?</reasoning>", "", prompt, flags=re.DOTALL
        ).strip()
        state["prompt"] = prompt

        message_bus.publish_sync("log", f"💡 Story idea: {prompt}")
        return state


class GuidedModeNode:
    """Handle guided flow mode = structured learning objectives."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        from message_bus import message_bus

        story_data = state.get("story_data", {})
        print(f"GuidedModeNode - story_data: {story_data}")
        age = state.get("age", 8)
        language = state.get("language", "en")

        # Determine age group
        if age <= 7:
            age_group = "6-7"
        elif age <= 9:
            age_group = "8-9"
        else:
            age_group = "10-12"

        state["age_group"] = age_group

        # Debug log
        language_name = get_language_display_name(language)
        message_bus.publish_sync(
            "log",
            f"🌍 Language selected: {language_name} (Age: {age}, Group: {age_group})",
        )
        # Add age to story_data for prompt
        story_data["age_group"] = age_group
        
        # Generate guided story prompt
        guided_prompt = get_guided_story_prompt()
        messages = [
            SystemMessage(content=guided_prompt),
            HumanMessage(content=json.dumps(story_data)),
        ]
        message_bus.publish_sync("log", "✨ Generating story idea...")
        response = self.llm.invoke(messages)
        prompt = response.content.strip()

        # Clean up reasoning
        prompt = re.sub(
            r"<reasoning>.*?</reasoning>", "", prompt, flags=re.DOTALL
        ).strip()
        state["prompt"] = prompt
        state["age"] = age
        state["language"] = language

        message_bus.publish_sync("log", f"💡 Story idea: {prompt}")
        return state


class FreeformModeNode:
    """Handle free-form mode = open play mode."""

    def __call__(self, state):
        from message_bus import message_bus

        message_bus.publish_sync("log", "🎨 Processing your creative story idea...")

        prompt = state.get("prompt", "")
        age = state.get("age", 8)
        language = state.get("language", "en")

        # Determine age group
        if age <= 7:
            age_group = "6-7"
        elif age <= 9:
            age_group = "8-9"
        else:
            age_group = "10-12"

        state["prompt"] = prompt
        state["age"] = age
        state["language"] = language
        state["age_group"] = age_group

        # Debug log
        language_name = get_language_display_name(language)
        message_bus.publish_sync(
            "log",
            f"🌍 Language selected: {language_name} (Age: {age}, Group: {age_group})",
        )
        message_bus.publish_sync("log", f"💡 Your story idea: {prompt}")

        return state


class ValidatePromptNode:
    """Validate prompt using KidStoryPromptGuard with Pydantic."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        from message_bus import message_bus
        from langchain_core.output_parsers import PydanticOutputParser
        from pydantic import BaseModel, Field

        class ValidationResponse(BaseModel):
            verdict: str = Field(description="accept, revise, or reject")
            reason: str = Field(description="Justification for verdict")
            language: str = Field(description="Detected language")
            quality_score: int = Field(description="Quality score 0-100")
            improved_prompt: str = Field(description="Improved version of prompt")

        parser = PydanticOutputParser(pydantic_object=ValidationResponse)

        message_bus.publish_sync("log", "🔍 Validating your story idea...")

        messages = [
            SystemMessage(
                content=KID_STORY_PROMPT_GUARD
                + "\n\n"
                + parser.get_format_instructions()
            ),
            HumanMessage(content=f"Validate this prompt: {state['prompt']}"),
        ]

        try:
            response = self.llm.invoke(messages)

            # Clean up reasoning text that OpenAI model might include
            clean_content = re.sub(
                r"<reasoning>.*?</reasoning>", "", response.content, flags=re.DOTALL
            )
            clean_content = clean_content.strip()

            parsed_response = parser.parse(clean_content)
            print(response)
            print(parsed_response)

            # Save validation result
            from langgraph_client import ValidatorResult

            state["validator_result"] = ValidatorResult(
                verdict=parsed_response.verdict,
                reason=parsed_response.reason,
                language=parsed_response.language,
                quality_score=parsed_response.quality_score,
                improved_prompt=parsed_response.improved_prompt,
            )

            if parsed_response.verdict != "accept":
                # Validation failed, log error
                validation_details = (
                    f"❌ Validation failed\n\n"
                    f"📊 Verdict: {parsed_response.verdict}\n\n"
                    f"📝 Reason: {parsed_response.reason}\n\n"
                    f"🌍 Language: {parsed_response.language}\n\n"
                    f"⭐ Quality Score: {parsed_response.quality_score}/100\n\n"
                )
                if parsed_response.improved_prompt:
                    validation_details += f"\n\n💡 Try this instead:\n\n✨ {parsed_response.improved_prompt} ✨"
                    
                message_bus.publish_sync("error", validation_details)

                # Small delay to ensure message is sent before workflow ends
                import time
                time.sleep(0.1)

        except Exception as e:
            print(f"Validation exception: {e}")
            print(
                f"ValidatePromptNode - Raw LLM response: {response.content if 'response' in locals() else 'No response'}"
            )
            from langgraph_client import ValidatorResult

            state["validator_result"] = ValidatorResult(
                verdict="reject",
                reason=f"Failed to parse validator response: {str(e)}",
                language="unknown",
                quality_score=0,
                improved_prompt="",
            )

            validation_details = (
                "❌ Validation failed\n\n"
                "📊 Verdict: reject\n\n"
                "📝 Reason: The story idea couldn’t be processed properly. "
                "Please try a simpler or clearer prompt.\n\n"
                "🌍 Language: unknown\n\n"
                "⭐ Quality Score: 0/100\n\n"
            )

            message_bus.publish_sync("error", validation_details)
            
            import time
            time.sleep(0.1)

        return state


class DetectLanguageNode:
    """Detect the language of the prompt."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        template = ChatPromptTemplate.from_messages(
            [
                ("system", get_language_detection_prompt()),
                ("human", "Detect the language: {prompt}"),
            ]
        )

        chain = template | self.llm
        language_response = chain.invoke({"prompt": state["prompt"]})

        # Clean up any reasoning text that OpenAI model might include

        clean_content = re.sub(
            r"<reasoning>.*?</reasoning>",
            "",
            language_response.content,
            flags=re.DOTALL,
        )
        state["language"] = clean_content.strip()

        return state


class ModeratePromptNode:
    """Moderate the prompt using LLM with Pydantic structured output."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        from message_bus import message_bus
        from langchain_core.output_parsers import PydanticOutputParser
        from pydantic import BaseModel, Field

        class ModerationResponse(BaseModel):
            decision: str = Field(description="Either 'positive' or 'negative'")
            detected_language: str = Field(description="Detected language")
            summary: str = Field(description="One-line summary")
            reasoning: dict = Field(description="Reasoning breakdown")
            safe_alternative: str = Field(description="Safe alternative if negative")

        parser = PydanticOutputParser(pydantic_object=ModerationResponse)

        moderation_prompt = (
            get_moderation_prompt(state["language"])
            + "\n\n"
            + parser.get_format_instructions()
        )
        messages = [
            SystemMessage(content=moderation_prompt),
            HumanMessage(content=f"Analyze this prompt: {state['prompt']}"),
        ]

        message_bus.publish_sync("log", "🛡️ Analyzing prompt for safety...")

        try:
                response = self.llm.invoke(messages)

                # Clean and extract JSON from response
                clean_content = response.content.strip()

                # Remove reasoning tags if present
                clean_content = re.sub(r"<reasoning>.*?</reasoning>", "", clean_content, flags=re.DOTALL)

                # Extract JSON from markdown if present
                json_match = re.search(r"```(?:json)?\s*({.*?})\s*```", clean_content, re.DOTALL)
                if json_match:
                    clean_content = json_match.group(1)

                parsed_response = parser.parse(clean_content)

                # Convert to expected format
                from langgraph_client import ModerationResult
                state["result"] = ModerationResult(
                    decision=parsed_response.decision,
                    reasoning=f"Theme: {parsed_response.reasoning.get('theme', '')}. Values: {parsed_response.reasoning.get('values', '')}. Age: {parsed_response.reasoning.get('age_appropriateness', '')}.",
                    suggestions=parsed_response.safe_alternative
                )

                # Parse reasoning into separate lines for display
                reasoning_parts = f"Theme: {parsed_response.reasoning.get('theme', '')}. Values: {parsed_response.reasoning.get('values', '')}. Age: {parsed_response.reasoning.get('age_appropriateness', '')}.".split(". ")
                reasoning_formatted = "\n".join([f"- {part.strip()}" for part in reasoning_parts if part.strip()])

                combined_message = f"✅ Decision: {parsed_response.decision}\n\nReasoning:\n{reasoning_formatted}"
                message_bus.publish_sync("log", combined_message)

                if parsed_response.safe_alternative:
                    message_bus.publish_sync("log", f"💡 Suggestions: {parsed_response.safe_alternative}")

        except Exception as e:
                # Fallback: set response for ParseResponseNode to handle
                print(f"Moderation parsing failed: {e}")
                response = self.llm.invoke(messages)
                state["response"] = response.content.strip()

        return state


class ParseResponseNode:
    """Parse the LLM response into structured format."""

    def __call__(self, state):
        # Only run if there's a response to parse (fallback case)
        if "response" not in state or not state["response"]:
            return state
        response = state["response"]

        try:
            # Clean response – extract JSON if mixed with other text
            json_match = re.search(r"{[^{}]*(?:{[^{}]*}[^{}]*)*}", response)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response

            # Try to parse as JSON
            json_data = json.loads(json_str)

            decision = json_data.get("decision", "negative")
            reasoning_obj = json_data.get("reasoning", {})
            reasoning = (
                f"Theme: {reasoning_obj.get('theme', '')}. Values: {reasoning_obj.get('values', '')}. Age: {reasoning_obj.get('age_appropriateness', '')}."
            )
            suggestions = json_data.get("safe_alternative", "")

        except (json.JSONDecodeError, KeyError):
            # Fallback to regex parsing
            decision = "negative"
            if "positive" in response.lower():
                decision = "positive"

            reasoning_match = re.search(
                r"(positive|negative)[.:]*\s*(.+)", response, re.IGNORECASE | re.DOTALL
            )
            reasoning = (
                reasoning_match.group(2).strip() if reasoning_match else response
                )

            suggestions = ""
            if "consider" in response.lower() or "suggest" in response.lower():
                suggest_match = re.search(
                    r"(consider|suggest)[^.]*[.]", response, re.IGNORECASE
                )
                suggestions = suggest_match.group(0) if suggest_match else ""

        # Save into state
        from langgraph_client import ModerationResult

        state["result"] = ModerationResult(
            decision=decision, reasoning=reasoning, suggestions=suggestions
        )

        from message_bus import message_bus

        # Parse reasoning into separate lines
        reasoning_parts = reasoning.split(". ")
        reasoning_formatted = "\n".join(
            [f" • {part.strip()}" for part in reasoning_parts if part.strip()]
        )

        combined_message = (
            f"✅ Decision: {decision}\n📖 Reasoning:\n{reasoning_formatted}"
        )
        message_bus.publish_sync("log", combined_message)

        if suggestions:
            message_bus.publish_sync("log", f"💡 Suggestions: {suggestions}")

        return state


class ImproveShortNode:
    """Improve context for prompts with less than 15 words."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        from message_bus import message_bus

        message_bus.publish_sync("log", "✏️ Prompt is too short, improving context...")
        print(f"ImproveShortNode - Original prompt: {state['prompt']}")

        improve_prompt = get_improve_short_prompt(state["language"], state["age"])
        messages = [
            SystemMessage(content=improve_prompt),
            HumanMessage(
                content=f"Expand this short prompt for age {state['age']}: {state['prompt']}"
            ),
        ]

        response = self.llm.invoke(messages)

        # Clean up reasoning text if model includes it
        improved_prompt = re.sub(
            r"<reasoning>.*?</reasoning>", "", response.content, flags=re.DOTALL
        )
        improved_prompt = improved_prompt.strip()

        print(f"Prompt is too short, improving context...")
        message_bus.publish_sync("log", f"✨ Enhanced prompt: {improved_prompt}")

        state["prompt"] = improved_prompt
        return state


class ImproveLongNode:
    """Improve context for prompts with 15+ words."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):

        print(f"ImproveLongNode - Original prompt: {state['prompt']}")

        improve_prompt = get_improve_long_prompt(state["language"], state["age"])
        messages = [
            SystemMessage(content=improve_prompt),
            HumanMessage(
                content=f"Enhance this prompt for age {state['age']}: {state['prompt']}"
            ),
        ]

        response = self.llm.invoke(messages)
        improved_prompt = response.content.strip()

        # Clean up reasoning text
        improved_prompt = re.sub(
            r"<reasoning>.*?</reasoning>", "", improved_prompt, flags=re.DOTALL
        )
        improved_prompt = improved_prompt.strip()

        print(f"ImproveLongNode - Enhanced prompt: {improved_prompt}")

        state["prompt"] = improved_prompt
        return state


class KidStoryGeneratorNode:
    """Generate kid-friendly stories with age and language adaptation."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        # Use age_group from state or determine from age
        age_group = state.get("age_group")
        if not age_group:
            age = state.get("age", 8)
            if age <= 7:
                age_group = "6-7"
            elif age <= 9:
                age_group = "8-9"
            else:
                age_group = "10-12"
            state["age_group"] = age_group

        import time

        timestamp = int(time.time())

        # Debug: Log language being used
        from message_bus import message_bus

        language_name = get_language_display_name(state["language"])
        message_bus.publish_sync(
            "log", f"📚 Generating story in: {language_name} for age group {age_group}"
        )

        from system_prompts import get_kid_story_generator_prompt

        messages = [
            SystemMessage(content=get_kid_story_generator_prompt()),
            HumanMessage(
                content=(
                    f"Create a unique story with:\n"
                    f"story_seed: {state['prompt']}\n"
                    f"age_group: {age_group}\n"
                    f"language: {state['language']}\n"
                    f"timestamp: {timestamp}\n\n"
                    f"IMPORTANT: Write the ENTIRE story in {state['language']} language. "
                    f"Adapt content for age group {age_group}. "
                    f"Create a completely different story each time, "
                    f"Avoid repeating previous stories."
                )
            ),
        ]
        response = ""
        message_bus.publish_sync("log", "✨ Creating your magical story...")

        # Try streaming first, fallback to invoke if no chunks
        try:
            chunks_received = False
            inside_reasoning = False

            for chunk in self.llm.stream(messages):
                if chunk.content.strip():
                    chunks_received = True
                    response += chunk.content

                # Track reasoning tags
                chunk_content = chunk.content
                if "<reasoning>" in chunk_content:
                    inside_reasoning = True
                if "</reasoning>" in chunk_content:
                    inside_reasoning = False
                    continue  # Skip the closing tag chunk

                # Only send chunks outside of reasoning
                if not inside_reasoning and chunk_content.strip():
                    message_bus.publish_sync("story_chunk", chunk_content.strip())

            # If no chunks received, fallback to normal invoke
            if not chunks_received:
                response = self.llm.invoke(messages).content

                # Simulate streaming by splitting response into chunks
                words = response.split(" ")
                chunk_size = 5  # send 5 words at a time
                for i in range(0, len(words), chunk_size):
                    chunk_text = " ".join(words[i : i + chunk_size]) + " "
                    message_bus.publish_sync("story_chunk", chunk_text)
                    time.sleep(0.1)

        except Exception as e:
            # Fallback if streaming fails — simulate streaming
            response = self.llm.invoke(messages).content
            words = response.split(" ")
            chunk_size = 5
            for i in range(0, len(words), chunk_size):
                chunk_text = " ".join(words[i : i + chunk_size]) + " "
                message_bus.publish_sync("story_chunk", chunk_text)
                time.sleep(0.1)

        # Clean up reasoning tags
        response = re.sub(r"<reasoning>.*?</reasoning>", "", response, flags=re.DOTALL)

        # Remove metadata before actual story if reasoning words appear
        if "reasoning" in response.lower() or "word count" in response.lower():
            sentences = response.split(".")
            for sentence in reversed(sentences):
                sentence = sentence.strip()
                if len(sentence) > 20 and not any(
                    word in sentence.lower()
                    for word in [
                        "reasoning",
                        "word count",
                        "craft",
                        "produce",
                        "generate",
                        "schema",
                        "json",
                    ]
                ):
                    response = sentence + "."
                    break

        response = response.strip()

        # Parse title + story from response
        lines = response.split("\n")
        title = lines[0] if lines else "Magical Adventure"
        story_text = "\n".join(lines[2:]) if len(lines) > 2 else response

        state["story"] = {"title": title, "story_text": story_text}

        message_bus.publish_sync("log", f"📖 Story created: {title}")
        message_bus.publish_sync(
            "story_complete", {"title": title, "story_text": story_text}
        )

        return state


class GenerateStoryImageNode:
    """Generate structured story from improved prompt."""

    def __init__(self, llm):
        self.llm = llm

    def __call__(self, state):
        # Determine age band
        age_band = ""        
        if state["age"] <= 7:
            age_band = "6-7"
        elif state["age"] <= 9:
            age_band = "8-9"
        else:
            age_band = "10-12"

        # Retry configuration
        max_retries = 3
        retry_delay = 1  # seconds

        # Get story prompt from system_prompts
        from system_prompts import get_story_image_generation_prompt

        story_prompt = get_story_image_generation_prompt().format(
            language=state["language"],
            age_band=age_band
            )

        # Debug: print prompt being used
        print("\n=== GenerateStoryImageNode Debug ===")
        print(f"Prompt: {state['prompt']}")
        print(f"Age band: {age_band}")
        print(f"Language: {state['language']}")
        print("=== End Prompt Debug ===\n")

        messages = [
            SystemMessage(content=story_prompt),
            HumanMessage(content=f"Story seed: {state['prompt']}"),
        ]
        # Retry loop for story generation
        for attempt in range(max_retries):
            try:
                # Use simplified retry prompts after first attempt
                if attempt > 0:
                    from system_prompts import get_story_image_retry_template, get_story_image_retry_system_prompt
                    retry_prompt = get_story_image_retry_template().format(
                        age_band=age_band,
                        language=state["language"],
                        prompt=state["prompt"],
                    )
                    messages = [
                        SystemMessage(content=get_story_image_retry_system_prompt()),
                        HumanMessage(content=retry_prompt),
                    ]

                from message_bus import message_bus

                message_bus.publish_sync(
                    "log", f"🔄 Generating story (attempt {attempt + 1})..."
                )

                response = self.llm.invoke(messages)
                content = response.content.strip()

                # Clean up reasoning tags

                content = re.sub(
                    r"<reasoning>.*?</reasoning>", "", content, flags=re.DOTALL
                )
                content = content.strip()

                # Debug: print response info
                print("\n=== GenerateStoryImageNode LLM Response Debug ===")
                print(f"Content length: {len(content)}")
                print(f"Response type: {type(content)}")
                print(f"Raw response object: {response}")
                print(f"Raw response content: {response.content}...")
                print(f"Cleaned content: \n{content}")
                print("=== End Debug ===\n")

                # Save full response for inspection
                import os

                debug_dir = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)), "debug_outputs"
                )
                os.makedirs(debug_dir, exist_ok=True)
                debug_file = os.path.join(
                    debug_dir, f"llm_response_attempt_{attempt + 1}.txt"
                )
                with open(debug_file, "w", encoding="utf-8") as f:
                    f.write(f"Attempt {attempt + 1}\n")
                    f.write(f"Content length: {len(content)}\n\n")
                    f.write(f"Raw response:\n{response.content}\n\n")
                    f.write(f"Cleaned content: \n{content}\n\n")
                print(f"✅ Full response saved to: {debug_file}")
                print("=== End Debug ===\n")

                # Clean content =  remove markdown if present
                if '```' in content:
                    json_match = re.search(
                        r"```(?:json)?\s*(\{.*\})\s*```", content, re.DOTALL
                    )
                    if json_match:
                        content = json_match.group(1)

                # Try multiple JSON parsing strategies
                story_json = None
                # Strategy 1: Direct parsing
                try:
                    story_json = json.loads(content)
                except json.JSONDecodeError as e1:
                    print(f"⚠️ JSON parsing error: {e1}")

                    # Strategy 2: Fix malformed scenes_by_frame structure
                    try:
                        fixed_content = content
                        # Fix missing commas between objects in scenes_by_frame
                        fixed_content = re.sub(r'}]},\"frame_index\":', '}]},{\"frame_index\":', fixed_content)
                        # Remove trailing commas and fix quotes
                        fixed_content = re.sub(r",\s*}", "}", fixed_content)
                        fixed_content = re.sub(r",\s*]", "]", fixed_content)

                        story_json = json.loads(fixed_content)
                        print("✅ Fixed JSON parsing with structure repair")
                    except json.JSONDecodeError as e2:
                        print(f"⚠️ Structure repair failed: {e2}")

                        # Strategy 3: Extract JSON snippet from text
                        json_pattern = r"{[^{}]*(?:{[^{}]*}[^{}]*)*}"
                        matches = re.findall(json_pattern, content, re.DOTALL)
                        for match in matches:
                            try:
                                story_json = json.loads(match)
                                if "frames" in story_json or "title" in story_json:
                                    break
                            except Exception:
                                continue

                # Success if parsed
                if story_json:
                    print(f"✅ Parsed JSON keys: {list(story_json.keys())}")
                    if "frames" in story_json or "bible" in story_json:
                        state["story_json"] = story_json
                        print("🎉 Successfully parsed complete story JSON")
                        break  # Exit retry loop
                    elif all(key in story_json for key in ["title", "objective"]):
                        # Convert single frame into proper format
                        state["story_json"] = {"frames": [story_json]}
                        print("🔄 Converted single frame to proper format")
                        break
                    else:
                        raise ValueError(
                            f"⚠️ Missing required keys: {list(story_json.keys())}"
                        )
                else:
                    raise ValueError("❌ Failed to parse JSON from response")

            except Exception as e:
                if attempt < max_retries - 1:
                    # Exponential backoff before retry
                    import time

                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    # Fallback to minimal structure
                    state["story_json"] = {
                        "frames": [
                            {
                                "title": "Adventure Begins",
                                "objective": "Start the story adventure",
                                "beats": [
                                    "Hero appears",
                                    "Problem is discovered",
                                    "Journey starts",
                                ],
                                "background_details": [
                                    "Magical setting",
                                    "Colorful world",
                                ],
                                "dialogue_hooks": [
                                    "Hero: Let's go!",
                                    "Friend: I'm ready!",
                                    "Hero: Adventure awaits!",
                                ],
                            }
                        ]
                    }
                    break

        from message_bus import message_bus

        message_bus.publish_sync("log", "🎉 Story generated successfully!")
        story_data = state["story_json"]

        # Create output directory for JSON files and clear existing content
        import os, shutil

        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_dir = os.path.join(base_dir, "story_outputs")

        # Clear existing JSON and image files but preserve audio files
        if os.path.exists(output_dir):
            for file in os.listdir(output_dir):
                file_path = os.path.join(output_dir, file)
                if not file.endswith((".json", ".png", ".jpg", ".jpeg")):
                    continue
                os.remove(file_path)
        else:
            os.makedirs(output_dir, exist_ok=True)

        # Save complete JSON response to file
        llm_response_path = os.path.join(output_dir, "llm_response.json")
        with open(llm_response_path, "w", encoding="utf-8") as f:
            json.dump(story_data, f, indent=2, ensure_ascii=False)

        message_bus.publish_sync("log", f"💾 Saved story JSON to {llm_response_path}")

        # Handle new comprehensive format
        if "frames" in story_data and "frames" in story_data["frames"]:
            frames = story_data["frames"]["frames"]
        else:
            # Handle old format
            frames = story_data.get("frames", [])
        
        scenes_by_frame = story_data.get("scenes", {}).get("scenes_by_frame", []) 
        # Generate images for frames
        from image_generator import ImageGenerator, create_session_dictionary

        message_bus.publish_sync("log", "🎨 Generating images for story frames...")

        bible = story_data.get("bible", {})
        image_generator = ImageGenerator(use_mock=False)  # Real image generation
        image_paths = image_generator.generate_images_for_frames(frames, bible)

        # Create session dictionary with full frame data including scenes
        session_dict = {}
        for i, (frame, image_path) in enumerate(zip(frames, image_paths)):
            frame_scene = None
            for scene_data in scenes_by_frame:
                if scene_data.get("frame_index") == i:
                    frame_scene = scene_data
                    break

            frame_key = f"frame_{i+1}"
            session_dict[frame_key] = {
                "frame_data": frame,
                "scenes_by_frame": frame_scene,
                "image_path": image_path,
                "frame_index": i,
            }

        # Store session data in state
        state["session_frames"] = session_dict
        state["image_paths"] = image_paths

        message_bus.publish_sync(
            "log", f"🖼️ Generated {len(image_paths)} images for story frames"
        )
        # Generate individual frame files with bible, frame, scene data, and image path
        for i, frame in enumerate(frames):
            # Find corresponding scene for this frame
            frame_scene = None
            for scene_data in scenes_by_frame:
                if scene_data.get("frame_index") == i:
                    frame_scene = scene_data
                    break

            # Remove frame_index from scene data and clean headings
            clean_scene = frame_scene.copy() if frame_scene else {}
            if "frame_index" in clean_scene:
                del clean_scene["frame_index"]

            # Clean headings by removing "Frame X_" prefix
            if "scenes" in clean_scene:
                for scene in clean_scene["scenes"]:
                    if "heading" in scene:
                        heading = scene["heading"]
                        # Remove "Frame X_" pattern from beginning
                        scene["heading"] = re.sub(r"^Frame \d+,\s*", "", heading)

            frame_data = {
                "bible": bible,
                "frame": frame,
                "scenes_by_frame": clean_scene,
                "image_path": image_paths[i] if i < len(image_paths) else "",
            }

            frame_path = os.path.join(output_dir, f"frame_{i+1}.json")
            with open(frame_path, "w", encoding="utf-8") as f:
                json.dump(frame_data, f, indent=2, ensure_ascii=False)

        message_bus.publish_sync(
            "log",
            f"📁 Created {len(frames)} story frames with images and saved individual frame files in story_outputs folder",
        )

        return state
