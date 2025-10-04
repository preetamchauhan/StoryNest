"""
Image generation utilities for story frames.
Supports both real ChatGPT image generation and mock image selection.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import random
import glob
from typing import List, Dict, Any
from openai import OpenAI
import requests
import base64
from io import BytesIO
from PIL import Image

from config import OPENAI_API_KEY


class ImageGenerator:
    """Handles both real and mock image generation for story frames."""

    def __init__(self, use_mock: bool = True, user_id: str = "user", timestamp: int = None):
        import time
        self.use_mock = use_mock
        self.user_id = user_id
        self.timestamp = timestamp or int(time.time())
        self.images_dir = os.path.join(os.path.dirname(__file__), "images")

    def generate_images_for_frames(
        self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]
    ) -> List[str]:
        """Generate images for all frames and return list of image paths."""
        if self.use_mock:
            return self._generate_mock_images(frames_data, bible)
        else:
            return self._generate_real_images(frames_data, bible)

    def _generate_mock_images(self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]
    ) -> List[str]:
        """Generate frame-specific images from existing images folder with parallel processing."""
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            import shutil
            import os

            available_images = glob.glob(os.path.join(self.images_dir, "*.png"))
            available_images.extend(glob.glob(os.path.join(self.images_dir, "*.jpg")))

            if not available_images:
                print("⚠️ No images found in images folder, creating placeholders")
                return [self._create_placeholder_image(f"Frame {i+1}") for i in range(len(frames_data))]

            def _ensure_output_dir():
                os.makedirs("story_outputs", exist_ok=True)

            def generate_single_mock_image(i: int, frame: Dict[str, Any]):
                try:
                    # Select base image
                    base_image = self._select_base_image_for_frame(frame, available_images, i)

                    # Create filename
                    frame_title = (
                        frame.get("title", "Story")
                        .replace(":", "")
                        .replace("/", "")
                        .replace("\\", "")
                        .replace("?", "")
                    )

                    base_filename = os.path.basename(base_image)
                    file_extension = os.path.splitext(base_filename)[1]
                    new_filename = f"{self.user_id}_{self.timestamp}_frame_{i+1}_{frame_title}{file_extension}"

                    # Copy to story_outputs
                    _ensure_output_dir()
                    new_image_path = os.path.join("story_outputs", new_filename)
                    shutil.copy2(base_image, new_image_path)

                    # Return URL for compatibility with existing code
                    filename = os.path.basename(new_image_path)
                    return (i, f"http://localhost:8000/story-images/{filename}")

                except Exception as e:
                    print(f"⚠️ Failed to generate mock image for frame {i+1}: {e}")
                    fallback_image = self._create_placeholder_image(f"Frame {i+1}")
                    return (i, fallback_image)

            # Submit tasks and gather results
            results = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_index = {
                    executor.submit(generate_single_mock_image, i, frame): i
                    for i, frame in enumerate(frames_data)
                }

                for future in as_completed(future_to_index, timeout=60):
                    i = future_to_index[future]
                    try:
                        result = future.result(timeout=10)
                        results.append(result)
                    except Exception as e:
                        print(f"⚠️ Timeout/error for mock frame {i+1}: {e}")
                        results.append((i, self._create_placeholder_image(f"Frame {i+1}")))

            # Ensure every frame has a result
            completed_indices = {idx for idx, _ in results}
            for idx in range(len(frames_data)):
                if idx not in completed_indices:
                    print(f"⚠️ No result for mock frame {idx+1}, adding placeholder.")
                    results.append((idx, self._create_placeholder_image(f"Frame {idx+1}")))

            results.sort(key=lambda x: x[0])
            return [res[1] for res in results]

        except ImportError:
            print("⚠️ Required libraries not available. Using fallback mock generation.")
            # Fallback to simple sequential processing
            selected_images = []
            for i, frame in enumerate(frames_data):
                try:
                    frame_image_path = self._create_frame_image(frame, available_images, i, "Story")
                    selected_images.append(frame_image_path)
                except Exception as e:
                    print(f"⚠️ Fallback failed for frame {i+1}: {e}")
                    selected_images.append(self._create_placeholder_image(f"Frame {i+1}"))
            return selected_images


    def _create_frame_image(
        self,
        frame: Dict[str, Any],
        available_images: List[str],
        frame_index: int,
        frame_title: str,
    ) -> str:
        """Create a frame-specific image by copying and renaming an existing image."""
        import shutil

        # Select base image using existing logic
        base_image = self._select_base_image_for_frame(
            frame, available_images, frame_index
        )

        # Create new filename with frame info
        base_filename = os.path.basename(base_image)
        file_extension = os.path.splitext(base_filename)[1]
        new_filename = f"{self.user_id}_{self.timestamp}_frame_{frame_index+1}_{frame_title}{file_extension}"

        # Copy to story_outputs directory with new name
        output_dir = os.path.join(os.path.dirname(__file__), "story_outputs")
        os.makedirs(output_dir, exist_ok=True)

        new_image_path = os.path.join(output_dir, new_filename)
        shutil.copy2(base_image, new_image_path)

        # Return API URL
        filename = os.path.basename(new_image_path)
        return f"http://localhost:8000/story-images/{filename}"


    def _select_base_image_for_frame(
        self, frame: Dict[str, Any], available_images: List[str], frame_index: int
    ) -> str:
        """Select base image for frame based on content analysis."""
        frame_text = f"{frame.get('title', '')} {frame.get('objective', '')} {' '.join(frame.get('beats', []))}"
        frame_text = frame_text.lower()

        # Keyword mapping for image selection
        keyword_priorities = {
            "sky": ["sky", "cloud", "air", "flying"],
            "forest": ["forest", "nature", "green"],
            "water": ["water", "ocean", "river", "blue"],
            "magic": ["magic", "sparkle", "glow", "rainbow"],
            "character": ["friend", "character", "person", "animal"],
            "adventure": ["adventure", "journey", "explore", "discover"],
        }

        # Score images based on filename keywords
        best_image = None
        best_score = -1

        for image_path in available_images:
            filename = os.path.basename(image_path).lower()
            score = 0

            for category, keywords in keyword_priorities.items():
                for keyword in keywords:
                    if keyword in frame_text and keyword in filename:
                        score += 2
                    elif keyword in filename:
                        score += 1

            if score > best_score:
                best_score = score
                best_image = image_path

        # Fallback to round-robin selection if no keyword matches
        if best_image is None:
            best_image = available_images[frame_index % len(available_images)]

        return best_image


    from concurrent.futures import ThreadPoolExecutor, as_completed
    from openai import OpenAI
    from config import OPENAI_API_KEY

    def _generate_real_images(self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]) -> List[str]:
        """Generate real images using OpenAI image API with parallel processing.

        Handles both URL and base64 (b64_json) image responses.
        """
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            import base64
            import time
            import os
            import requests
            from openai import OpenAI
            from config import OPENAI_API_KEY

            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not found in config")

            client = OpenAI(api_key=OPENAI_API_KEY)

            def _ensure_output_dir():
                os.makedirs("story_outputs", exist_ok=True)

            def _save_bytes_to_file(img_bytes: bytes, filename_base: str) -> str:
                _ensure_output_dir()
                path = os.path.join("story_outputs", f"{filename_base}.png")
                with open(path, "wb") as f:
                    f.write(img_bytes)
                return path

            def _download_from_url(url: str, filename_base: str) -> str:
                if not url or not isinstance(url, str):
                    raise ValueError("Empty or invalid URL")
                if not (url.startswith("http://") or url.startswith("https://")):
                    raise ValueError(f"Invalid URL scheme: {url!r}")
                resp = requests.get(url, timeout=20)
                resp.raise_for_status()
                return _save_bytes_to_file(resp.content, filename_base)

            def _extract_from_item(item):
                """Return tuple (url_or_none, b64_or_none) supporting dict or attr-style item."""
                url = None
                b64 = None
                if item is None:
                    return (None, None)
                # dict-like
                if isinstance(item, dict):
                    url = item.get("url") or item.get("image_url")
                    b64 = item.get("b64_json") or item.get("b64")
                else:
                    # object-like
                    url = getattr(item, "url", None) or getattr(item, "image_url", None)
                    b64 = getattr(item, "b64_json", None) or getattr(item, "b64", None)
                return (url, b64)

            def generate_single_image(i: int, frame: Dict[str, Any]):
                prompt = self._create_image_prompt(frame, bible)
                max_attempts = 3
                backoff_base = 1.0

                for attempt in range(1, max_attempts + 1):
                    try:
                        response = client.images.generate(
                            model="gpt-image-1",
                            prompt=prompt,
                            size="1024x1024",
                            n=1,
                        )

                        # Validate response
                        if not response or not getattr(response, "data", None):
                            raise RuntimeError("Empty response from image API")

                        item = response.data[0]
                        image_url, image_b64 = _extract_from_item(item)

                        # Prefer URL if valid
                        if image_url:
                            try:
                                image_path = _download_from_url(image_url, f"{self.user_id}_{self.timestamp}_generated_frame_{i+1}")
                                filename = os.path.basename(image_path)
                                return (i, f"http://localhost:8000/story-images/{filename}")
                            except Exception as e:
                                # Log and fall through to try b64 or retry
                                print(f"Attempt {attempt}: failed to download URL for frame {i+1}: {e}")

                        # If base64 available, decode and save
                        if image_b64:
                            try:
                                img_bytes = base64.b64decode(image_b64)
                                image_path = _save_bytes_to_file(img_bytes, f"{self.user_id}_{self.timestamp}_generated_frame_{i+1}")
                                filename = os.path.basename(image_path)
                                return (i, f"http://localhost:8000/story-images/{filename}")
                            except Exception as e:
                                print(f"Attempt {attempt}: failed to decode b64 for frame {i+1}: {e}")

                        # No usable url or b64 -> raise to trigger retry/fallback
                        raise RuntimeError("No usable image data (no url and no b64_json) in response")

                    except Exception as e:
                        if attempt == max_attempts:
                            print(f"⚠️ Failed to generate image for frame {i+1} after {attempt} attempts: {e}")
                            fallback_image = self._create_placeholder_image(f"Frame {i+1}")
                            return (i, fallback_image)
                        else:
                            wait = backoff_base * (2 ** (attempt - 1))
                            print(f"Attempt {attempt} failed for frame {i+1}: {e}. Retrying in {wait:.1f}s...")
                            time.sleep(wait)
                            continue

            # Submit tasks and gather results
            results = []
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_index = {
                    executor.submit(generate_single_image, i, frame): i
                    for i, frame in enumerate(frames_data)
                }

                try:
                    for future in as_completed(future_to_index, timeout=180):
                        i = future_to_index[future]
                        try:
                            result = future.result(timeout=30)
                            results.append(result)
                        except Exception as e:
                            print(f"❌ Timeout/error for frame {i+1}: {e}")
                            results.append((i, self._create_placeholder_image(f"Frame {i+1}")))
                except Exception as e:
                    # as_completed timed out or errored; ensure we create placeholders for missing frames
                    print(f"⚠️ as_completed loop error/timeout: {e}")

            # Ensure every frame has a result (placeholder if missing)
            completed_indices = {idx for idx, _ in results}
            for idx in range(len(frames_data)):
                if idx not in completed_indices:
                    print(f"⚠️ No result for frame {idx+1}, adding placeholder.")
                    results.append((idx, self._create_placeholder_image(f"Frame {idx+1}")))

            results.sort(key=lambda x: x[0])
            return [res[1] for res in results]

        except ImportError:
            print("⚠️ Required libraries not installed. Falling back to mock images.")
            return self._generate_mock_images(frames_data, bible)





    def _create_image_prompt(self, frame: Dict[str, Any], bible: Dict[str, Any]) -> str:
        """Create detailed prompt for image generation."""
        characters = bible.get("characters", [])
        setting = bible.get("setting", {})

        # Build character descriptions
        char_descriptions = []
        for char in characters:
            traits = ", ".join(char.get("traits", []))
            char_descriptions.append(f"{char.get('name', 'character')} ({char.get('role', 'friend')}, {traits})")

        # Build setting description
        setting_desc = setting.get("time_place", "magical place")
        sensory_details = ", ".join(setting.get("sensory", []))

        # Frame-specific content
        title = frame.get("title", "")
        objective = frame.get("objective", "")
        beats = ". ".join(frame.get("beats", []))

        prompt = f"""
            Create a children's book illustration for "{title}".
            
            Scene: {objective}, {beats}
            
            Characters: {'; '.join(char_descriptions)}
            
            Setting: {setting_desc} with {sensory_details}
            
            Style: Colorful, friendly, child-appropriate illustration with soft edges and bright colors.
            Age group: children aged {bible.get("age_band", "6-8")} years old.
            Mood: {bible.get("tone", "cheerful and magical")}.
            
            Make it look like a professional children's book illustration.
            """

        return prompt


    def _download_and_save_image(self, image_url: str, filename: str) -> str:
        """Download image from URL and save to story_outputs folder."""
        try:
            response = requests.get(image_url, timeout=60)  # Add timeout
            response.raise_for_status()

            # Save to story_outputs folder
            output_dir = os.path.join(os.path.dirname(__file__), "story_outputs")
            os.makedirs(output_dir, exist_ok=True)

            image_path = os.path.join(output_dir, f"{filename}.png")

            with open(image_path, "wb") as f:
                f.write(response.content)

            return image_path

        except Exception as e:
            print(f"❌ Failed to download image: {e}")
            return self._create_placeholder_image(f"{filename}")


    def _create_placeholder_image(self, text: str) -> str:
        """Create placeholder image with text."""
        try:
            from PIL import Image, ImageDraw, ImageFont

            # Create a colorful placeholder
            img = Image.new("RGB", (512, 512), color=(135, 206, 235))  # Sky blue
            draw = ImageDraw.Draw(img)

            # Try to use a nice font, fallback to default
            try:
                font = ImageFont.truetype("arial.ttf", 40)
            except:
                font = ImageFont.load_default()

            # Add text
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            x = (512 - text_width) // 2
            y = (512 - text_height) // 2

            draw.text((x, y), text, fill=(255, 255, 255), font=font)

            # Save placeholder
            output_dir = os.path.join(os.path.dirname(__file__), "story_outputs")
            os.makedirs(output_dir, exist_ok=True)

            filename = f"{self.user_id}_{self.timestamp}_placeholder_{text.replace(' ', '_')}.png"
            placeholder_path = os.path.join(output_dir, filename)
            img.save(placeholder_path)

            # Return API URL
            filename = os.path.basename(placeholder_path)
            return f"http://localhost:8000/story-images/{filename}"

        except Exception as e:
            print(f"❌ Failed to create placeholder: {e}")
            return ""


def create_session_dictionary(
        frames_data: List[Dict[str, Any]], image_paths: List[str]
    ) -> Dict[str, Dict[str, Any]]:
    """Create session dictionary mapping frame names to their data and images."""
    session_dict = {}
    for i, (frame, image_path) in enumerate(zip(frames_data, image_paths)):
        frame_key = f"frame_{i+1}"
        session_dict[frame_key] = {
            "frame_data": frame,
            "image_path": image_path,
            "frame_index": i + 1,
        }

    return session_dict
