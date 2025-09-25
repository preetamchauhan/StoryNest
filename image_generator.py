"""
Image generation utilities for story frames.
Supports both real ChatGPT image generation and mock image selection.
"""

import os
import random
import glob
from typing import List, Dict, Any
import requests
import base64
from io import BytesIO
from PIL import Image


class ImageGenerator:
    """Handles both real and mock image generation for story frames."""

    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self.images_dir = os.path.join(os.path.dirname(__file__), "images")

    def generate_images_for_frames(
        self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]
    ) -> List[str]:
        """Generate images for all frames and return list of image paths."""
        if self.use_mock:
            return self._generate_mock_images(frames_data, bible)
        else:
            return self._generate_real_images(frames_data, bible)

    def _generate_mock_images(
        self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]
    ) -> List[str]:
        """Generate frame-specific images from existing images folder."""
        available_images = glob.glob(os.path.join(self.images_dir, "*.png"))
        available_images.extend(glob.glob(os.path.join(self.images_dir, "*.jpg")))

        selected_images = []
        for i, frame in enumerate(frames_data):
            frame_title = (
                frame.get("title", "Story")
                .replace(" ", "_")
                .replace(":", "")
                .replace("!", "")
                .replace("?", "")
            )
            frame_image_path = self._create_frame_image(
                frame, available_images, i, frame_title
            )
            selected_images.append(frame_image_path)

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
        new_filename = f"frame_{frame_index+1}_{frame_title}{file_extension}"

        # Copy to story_outputs directory with new name
        output_dir = os.path.join(os.path.dirname(__file__), "story_outputs")
        os.makedirs(output_dir, exist_ok=True)

        new_image_path = os.path.join(output_dir, new_filename)
        shutil.copy2(base_image, new_image_path)

        # Return API URL
        return f"http://localhost:8000/story-images/{new_filename}"


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


def _generate_real_images(
    self, frames_data: List[Dict[str, Any]], bible: Dict[str, Any]
) -> List[str]:
    """Generate real images using ChatGPT DALL-E API with parallel processing."""
    try:
        import asyncio
        import aiohttp
        from concurrent.futures import ThreadPoolExecutor
        from openai import OpenAI
        from config import OPENAI_API_KEY

        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in config")

        client = OpenAI(api_key=OPENAI_API_KEY)

        def generate_single_image(frame_data):
            """Generate a single image for a frame."""
            i, frame = frame_data
            prompt = self._create_image_prompt(frame_data, bible)

            try:
                response = client.images.generate(
                    model="dall-e-3",
                    prompt=prompt,
                    size="1024x1024",
                    quality="standard",
                    style="vivid",
                    n=1,
                )

                # Download and save the generated image
                image_url = response.data[0].url
                image_path = self._download_and_save_image(
                    image_url, f"generated_frame_{i+1}"
                )
                return (i, image_path)

            except Exception as e:
                print(f"Failed to generate image for frame {i+1}: {e}")
                # Fallback to mock image
                fallback_image = self._create_placeholder_image(f"Frame {i+1}")
                return (i, fallback_image)

        # Use ThreadPoolExecutor with max 5 concurrent workers
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Create frame data with indices
            frames_data_with_index = [(i, frame) for i, frame in enumerate(frames_data)]

            # Submit all tasks
            future_to_frame = {
                executor.submit(generate_single_image, frame_data): frame_data
                for frame_data in frames_data_with_index
            }

            # Collect results
            results = []
            for future in future_to_frame:
                try:
                    result = future.result(timeout=120)  # 2 minute timeout per image
                    results.append(result)
                except Exception as e:
                    i = frame_data[0]
                    print(f"Timeout or error for frame {i+1}: {e}")
                    fallback_image = self._create_placeholder_image(f"Frame {i+1}")
                    results.append((i, fallback_image))

            # Sort results by frame index and extract image paths
            results.sort(key=lambda x: x[0])
            generated_images = [result[1] for result in results]

        return generated_images

    except ImportError:
        print("Required libraries not installed. Falling back to mock images.")
        return self._generate_mock_images(frames_data, bible)


def _create_image_prompt(self, frame: Dict[str, Any], bible: Dict[str, Any]) -> str:
    """Create detailed prompt for image generation."""
    characters = bible.get("characters", [])

    # Build character descriptions
    char_descriptions = []
    for char in characters:
        traits = ", ".join(char.get("traits", []))
        char_descriptions.append(
            f"{char.get('name', 'character')} ({char.get('role', 'friend')}, {traits})"
        )

    # Build setting description
    setting_desc = bible.get("setting", "time_place", "magical place")
    sensory_details = ", ".join(setting.get("sensory", []))

    # Frame-specific content
    title = frame.get("title", "")
    objective = frame.get("objective", "")
    beats = ", ".join(frame.get("beats", []))

    prompt = f"""
        Create a children's book illustration for "{title}".
        
        Scene: {objective}, {beats}
        
        Characters: {', '.join(char_descriptions)}
        
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

        filename = f"placeholder_{text.replace(' ', '_')}.png"
        placeholder_path = os.path.join(output_dir, filename)
        img.save(placeholder_path)

        # Return API URL
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
