# FastAPI server for React frontend integration.

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from kid_auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    FOOD_OPTIONS,
    register_user,
    authenticate_user,
    create_jwt_token,
    verify_jwt_token,
)
import os
from langgraph_server import server
import uvicorn
import json
import asyncio
import logging

app = FastAPI(title="Story Nest API")

# Enable CORS for React frontend with proper audio streaming headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges", "Content-Length", "Content-Range"],
)


# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    # Skip logging for audio/image requests to reduce noise
    if not any(
        path in str(request.url)
        for path in ["/story-audio/", "/story-image/", "/story-audio-temp/"]
    ):
        print(f"➡️ Request: {request.method} {request.url}")

        auth_header = request.headers.get("authorization")
        if auth_header:
            print(f"✅ Auth header found: {auth_header[:20]}...")
        else:
            print("❌ No Authorization header in request")

    response = await call_next(request)

    if not any(
        path in str(request.url)
        for path in ["/story-audio/", "/story-image/", "/story-audio-temp/"]
    ):
        print(f"⬅️ Response: {response.status_code}")

    return response


# Custom audio file handler with proper headers
from fastapi.responses import FileResponse
from fastapi import Request
import json
from datetime import datetime
import hashlib
from config import OPENAI_API_KEY
import lancedb
import base64


@app.get("/story-audio/{story_id}")
async def serve_audio(story_id: str, request: Request):
    """Serve audio files from LanceDB with proper streaming headers."""
    try:
        # URL decode the story ID (may need multiple decodes)
        import urllib.parse

        decoded_story_id = story_id

        # Keep decoding until no more changes
        while True:
            new_decoded = urllib.parse.unquote(decoded_story_id)
            if new_decoded == decoded_story_id:
                break
            decoded_story_id = new_decoded

        print(f"🎵 Serving audio for story: {story_id} -> decoded: {decoded_story_id}")

        # Get audio data from LanceDB using decoded ID
        result = (
            stories_table.search()
            .where(f"id = '{decoded_story_id}'")
            .limit(1)
            .to_pandas()
        )

        if result.empty:
            print(f"❌ Story {story_id} not found in database")
            raise HTTPException(status_code=404, detail=f"Story {story_id} not found")

        audio_data = result.iloc[0]["audio_data"]
        if pd.isna(audio_data) or audio_data is None or len(audio_data) == 0:
            print(f"❌ No audio data for story {story_id}")
            raise HTTPException(
                status_code=404, detail=f"No audio data for story {story_id}"
            )

        print(f"✅ Found audio data: {len(audio_data)} bytes")
        file_size = len(audio_data)

        # Handle range requests for audio streaming
        range_header = request.headers.get("range")

        if range_header:
            # Parse range header
            range_match = range_header.replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1

            # Get requested chunk
            chunk = audio_data[start : end + 1]

            # Return partial content with proper headers
            from fastapi.responses import Response

            return Response(
                content=chunk,
                status_code=206,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(len(chunk)),
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "public, max-age=3600",
                },
            )
        else:
            # Return full file
            from fastapi.responses import Response

            return Response(
                content=audio_data,
                media_type="audio/mpeg",
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(file_size),
                    "Cache-Control": "public, max-age=3600",
                },
            )
    except Exception as e:
        print(f"❌ Error serving audio for story {story_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve audio: {str(e)}")


@app.get("/story-audio-temp/{filename}")
async def serve_temp_audio(filename: str, request: Request):
    """Serve temporary audio files with proper streaming headers."""
    try:
        file_path = os.path.join("story_outputs", filename)

        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, detail=f"Temp audio file {filename} not found"
            )

        return FileResponse(
            file_path,
            media_type="audio/mpeg",
            headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600"},
        )

    except Exception as e:
        print(f"❌ Error serving temp audio {filename}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to serve temp audio: {str(e)}"
        )


@app.get("/story-image/{story_id}/{filename}")
async def serve_image(story_id: str, filename: str):
    """Serve image files from LanceDB."""
    try:
        # Get image data from LanceDB
        result = stories_table.search().where(f"id = '{story_id}'").limit(1).to_pandas()

        if result.empty or pd.isna(result.iloc[0]["image_data"]):
            # Fallback to temp file if no image in DB
            temp_file_path = os.path.join("story_outputs", filename)
            if os.path.exists(temp_file_path):
                return FileResponse(
                    temp_file_path, headers={"Cache-Control": "public, max-age=3600"}
                )

            raise HTTPException(
                status_code=404,
                detail=f"Image {filename} not found for story {story_id}",
            )

        # Parse image data JSON
        image_data_dict = json.loads(result.iloc[0]["image_data"])

        if filename not in image_data_dict:
            raise HTTPException(
                status_code=404,
                detail=f"Image {filename} not found for story {story_id}",
            )

        # Decode base64 image data
        image_bytes = base64.b64decode(image_data_dict[filename])

        # Determine content type based on file extension
        content_type = "image/jpeg"
        if filename.lower().endswith(".png"):
            content_type = "image/png"
        elif filename.lower().endswith(".gif"):
            content_type = "image/gif"
        elif filename.lower().endswith(".webp"):
            content_type = "image/webp"

        from fastapi.responses import Response

        return Response(
            content=image_bytes,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600"},
        )

    except Exception as e:
        print(f"❌ Error serving image {filename} for story {story_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve image: {str(e)}")


# Initialize LanceDB and embedding model
embedding_model = None
db = None
stories_table = None


def init_db():
    global db, stories_table
    try:
        import os

        os.makedirs("./lancedb", exist_ok=True)
        db = lancedb.connect("./lancedb")

        # Create or get existing table
        try:
            stories_table = db.open_table("stories")
            print("✅ Connected to existing LanceDB stories table")

            # Check if user_id column exists, if not migrate
            try:
                df = stories_table.to_pandas()
                if not df.empty and "user_id" not in df.columns:
                    print("⚡ Migrating stories table to add user_id column...")
                    # Add user_id column with default value for existing stories
                    df["user_id"] = "legacy_user"
                    # Recreate table with new schema
                    db.drop_table("stories")
                    stories_table = db.create_table("stories", df)
                    print("✅ Migration completed")
            except Exception as migration_error:
                print(f"⚠️ Migration warning: {migration_error}")

        except:
            # Create table with sample data to establish schema
            import pandas as pd

            sample_df = pd.DataFrame(
                [
                    {
                        "id": "sample",
                        "user_id": "sample_user",
                        "title": "Sample Story",
                        "text": "Sample text",
                        "language": "en",
                        "age": 8,
                        "audio_url": "",
                        "audio_data": b"",
                        "frames_data": "",
                        "image_paths": "",
                        "image_data": "",
                        "embedding": [0.0] * 30,
                        "created_at": datetime.now(),
                    }
                ]
            )

            stories_table = db.create_table("stories", sample_df)
            # Remove sample data
            stories_table.delete("id = 'sample'")
            print("✅ Created new LanceDB stories table")

    except Exception as e:
        print(f"❌ Failed to initialize LanceDB: {e}")
        raise


def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        try:
            print("🔄 Loading OpenAI embedding model...")
            from langchain_openai import OpenAIEmbeddings

            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not found")

            embedding_model = OpenAIEmbeddings(
                api_key=OPENAI_API_KEY, model="text-embedding-3-small"
            )

            print("✅ OpenAI embedding model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load OpenAI embedding model: {e}")
            print("⚠️ Falling back to hash-based embeddings")
            embedding_model = None
    return embedding_model


def generate_semantic_embedding(text: str):
    """Generate semantic embedding using OpenAI model."""
    try:
        embedding_model = get_embedding_model()
        if embedding_model:
            embeddings = embedding_model.embed_query(text)
            # Truncate to 30 dimensions for consistency with existing DB
            return (
                embeddings[:30]
                if len(embeddings) >= 30
                else embeddings + [0.0] * (30 - len(embeddings))
            )
        else:
            print("⚠️ Using hash-based embedding (OpenAI model not available)")
            return generate_hash_embedding(text)
    except Exception as e:
        print(f"❌ Error generating semantic embedding: {e}")
        print("⚠️ Falling back to hash-based embedding")
        return generate_hash_embedding(text)


def generate_hash_embedding(text: str):
    """Fallback: Generate simple hash-based embedding."""
    # Create a simple but consistent embedding from text
    text_hash = hashlib.md5(text.lower().encode()).hexdigest()
    embedding = []

    # Convert hash to 30 features
    for i in range(0, len(text_hash), 2):
        val = int(text_hash[i : i + 2], 16) / 255.0 - 0.5
        embedding.append(val)

    # Ensure exactly 30 dimensions
    while len(embedding) < 30:
        embedding.append(0.0)

    return embedding[:30]


# Initialize LanceDB on startup
init_db()

# Create directories if they don't exist
os.makedirs("images", exist_ok=True)
os.makedirs("story_outputs", exist_ok=True)

# Mount static files for fallback images only
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/story-images", StaticFiles(directory="story_outputs"), name="story_images")

# Add pandas import for LanceDB
import pandas as pd


class StoryRequest(BaseModel):
    mode: str  # 'surprise', 'guided', 'freeform'
    prompt: str = ""
    age: int = 8
    language: str = "en"  # Language code (en, es, de, fr, hi, ja, ko, ar)
    story_data: dict = {}


class GenerateStoryResponse(BaseModel):
    success: bool
    story: str = ""
    error: str = ""


class ImageRequest(BaseModel):
    prompt: str
    age: int
    language: str


class ImageResponse(BaseModel):
    success: bool
    message: str = ""
    error: str = ""
    frames_data: dict = {}
    image_paths: list = []


class AudioRequest(BaseModel):
    text: str
    language: str = "en"
    filename: str = "story_audio"


class AudioResponse(BaseModel):
    success: bool
    message: str = ""
    error: str = ""
    audio_path: str = ""


class StoryData(BaseModel):
    id: str
    title: str
    text: str
    language: str
    age: int
    audioUrl: Optional[str] = None
    framesData: Optional[dict] = None
    imagePaths: Optional[list] = None


class SaveStoryRequest(BaseModel):
    story: StoryData


class SearchStoriesRequest(BaseModel):
    query: str
    limit: int = 10


class StoriesResponse(BaseModel):
    success: bool
    message: str = ""
    error: str = ""
    stories: list = []


@app.post("/api/stream-story-test")
async def stream_story_test(request: StoryRequest):
    """Stream story generation without auth (testing)."""
    print("⚡ stream_story_test endpoint reached (no auth)")

    async def event_generator():
        try:
            # Set initial state with test user context
            initial_state = {
                "mode": request.mode,
                "prompt": request.prompt,
                "age": request.age,
                "language": request.language,
                "story_data": request.story_data,
                "user_id": "test_user",
                "username": "test_user",
                "validator_result": None,
                "response": None,
                "result": None,
                "story_json": {},
                "story": "",
            }

            # Stream workflow events
            async for event in server.stream_workflow(initial_state):
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            error_event = {"type": "error", "data": {"error": str(e)}}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/api/stream-story")
async def stream_story(
    request: StoryRequest, user_data: dict = Depends(verify_jwt_token)
):
    """Stream story generation with real-time events."""
    print(
        f"⚡ stream_story endpoint reached for user: {user_data.get('username', 'unknown')}"
    )

    async def event_generator():
        try:
            # Set initial state with user context
            initial_state = {
                "mode": request.mode,
                "prompt": request.prompt,
                "age": request.age,
                "language": request.language,
                "story_data": request.story_data,
                "user_id": user_data["user_id"],
                "username": user_data["username"],
                "validator_result": None,
                "response": None,
                "result": None,
                "story_json": {},
                "story": "",
            }

            # Stream workflow events
            async for event in server.stream_workflow(initial_state):
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            error_event = {"type": "error", "data": {"error": str(e)}}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/api/generate-story", response_model=GenerateStoryResponse)
async def generate_story(
    request: StoryRequest, user_data: dict = Depends(verify_jwt_token)
):
    """Generate story (non-streaming fallback)."""
    try:
        initial_state = {
            "mode": request.mode,
            "prompt": request.prompt,
            "age": request.age,
            "language": request.language,
            "story_data": request.story_data,
            "user_id": user_data["user_id"],
            "username": user_data["username"],
            "validator_result": None,
            "response": None,
            "result": None,
            "story_json": {},
            "story": "",
        }

        result = await server.invoke_workflow(initial_state)

        if result["type"] == "final":
            story = result["data"].get("story_json", {}).get("story", "")
            return GenerateStoryResponse(success=True, story=story)
        else:
            return GenerateStoryResponse(
                success=False, error=result["data"].get("error", "Unknown error")
            )

    except Exception as e:
        return GenerateStoryResponse(success=False, error=str(e))


@app.post("/api/generate-images", response_model=ImageResponse)
async def generate_images(
    request: ImageRequest, user_data: dict = Depends(verify_jwt_token)
):
    """Generate story images using GenerateStoryImageNode."""
    try:
        from langgraph_client import LangGraphModerationClient

        # Create client and call generate_story_images method
        client = LangGraphModerationClient()

        result_state = client.generate_story_images(
            prompt=request.prompt, age=request.age, language=request.language, user_id=user_data["user_id"]
        )

        # Extract frames data and image paths from result
        frames_data = result_state.get("session_frames", {})
        image_paths = result_state.get("image_paths", [])

        return ImageResponse(
            success=True,
            message="Story images generated successfully",
            frames_data=frames_data,
            image_paths=image_paths,
        )

    except Exception as e:
        return ImageResponse(success=False, error=str(e))


# -------------------------------
# Background Music Selection
# -------------------------------
def select_background_music(story_text: str) -> str:
    """Select appropriate background music based on story content."""
    story_lower = story_text.lower()

    # Theme detection keywords
    if any(word in story_lower for word in ['adventure', 'journey', 'explore', 'quest', 'brave']):
        return 'adventure'
    elif any(word in story_lower for word in ['magic', 'fairy', 'wizard', 'enchant', 'spell']):
        return 'magical'
    elif any(word in story_lower for word in ['friend', 'help', 'kind', 'love', 'care']):
        return 'gentle'
    else:
        return 'gentle'  # Default


# -------------------------------
# Background Music Generator
# -------------------------------
def create_background_music(duration_seconds: float, theme: str) -> str:
    """Generate simple background music using numpy and scipy."""
    try:
        import numpy as np
        import os, time
        from scipy.io import wavfile

        sample_rate = 22050
        t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds))

        # Theme-based music generation
        if theme == 'adventure':
            # Upbeat rhythm with major chords
            music = (
                np.sin(2 * np.pi * 261.63 * t) * 0.3 +  # C4
                np.sin(2 * np.pi * 329.63 * t) * 0.2 +  # E4
                np.sin(2 * np.pi * 392.00 * t) * 0.2    # G4
            )
        elif theme == 'magical':
            # Ethereal tones with reverb-like effect
            music = (
                np.sin(2 * np.pi * 293.66 * t) * 0.3 +  # D4
                np.sin(2 * np.pi * 369.99 * t) * 0.2 +  # F#4
                np.sin(2 * np.pi * 440.00 * t) * 0.2    # A4
            )
        else:  # gentle
            # Soft, calming tones
            music = (
                np.sin(2 * np.pi * 261.63 * t) * 0.25 +  # C4
                np.sin(2 * np.pi * 311.13 * t) * 0.2 +   # D#4
                np.sin(2 * np.pi * 392.00 * t) * 0.15    # G4
            )

        # Add gentle fade in/out
        fade_samples = int(0.5 * sample_rate)  # 0.5 second fade
        music[:fade_samples] *= np.linspace(0, 1, fade_samples)
        music[-fade_samples:] *= np.linspace(1, 0, fade_samples)

        # Save background music
        music_path = os.path.join("story_outputs", f"bg_music_{theme}_{int(time.time())}.wav")
        wavfile.write(music_path, sample_rate, (music * 32767).astype(np.int16))

        return music_path
    except ImportError:
        return None


@app.post("/api/generate-audio", response_model=AudioResponse)
async def generate_audio(request: AudioRequest, user_data: dict = Depends(verify_jwt_token)):
    """Generate multilingual audio with female voice and background music."""
    try:
        import time
        import os

        print(f"🎤 Starting TTS generation for user {user_data['username']} - language: {request.language}")
        print(f"📄 Text length: {len(request.text)} characters")

        os.makedirs("story_outputs", exist_ok=True)

        # -------------------------------
        # Try OpenAI TTS first
        # -------------------------------
        try:
            from openai import OpenAI
            from config import OPENAI_API_KEY

            client = OpenAI(api_key=OPENAI_API_KEY)

            response = client.audio.speech.create(
                model="tts-1",
                voice="nova",  # Female voice
                input=request.text,
                response_format="wav"
            )

            voice_filename = f"voice_{user_data['user_id']}_{int(time.time())}.wav"
            voice_path = os.path.join("story_outputs", voice_filename)

            with open(voice_path, "wb") as f:
                f.write(response.content)

            print(f"✅ OpenAI TTS audio generated: {voice_path}")

        except Exception as openai_error:
            print(f"⚠ OpenAI TTS failed: {openai_error}, using pyttsx3")

            # -------------------------------
            # Fallback to pyttsx3
            # -------------------------------
            import pyttsx3

            engine = pyttsx3.init()
            engine.setProperty('rate', 110)
            engine.setProperty('volume', 0.9)

            voices = engine.getProperty('voices')
            if voices:
                for voice in voices:
                    if any(kw in voice.name.lower() for kw in ['female', 'woman', 'zira']):
                        engine.setProperty('voice', voice.id)
                        break

            voice_filename = f"voice_{user_data['user_id']}_{int(time.time())}.wav"
            voice_path = os.path.join("story_outputs", voice_filename)

            engine.save_to_file(request.text, voice_path)
            engine.runAndWait()

        # -------------------------------
        # Mix with Background Music
        # -------------------------------
        try:
            from pydub import AudioSegment

            # Load voice audio
            voice_audio = AudioSegment.from_wav(voice_path)
            voice_duration = len(voice_audio) / 1000.0  # Convert to seconds

            # Select and create background music
            music_theme = select_background_music(request.text)
            print(f"🎶 Selected music theme: {music_theme}")

            music_path = create_background_music(voice_duration, music_theme)

            if music_path and os.path.exists(music_path):
                # Load and mix
                music_audio = AudioSegment.from_wav(music_path)

                # Reduce music volume to 15% and mix
                background_music = music_audio - 18  # Reduce by 18dB (~15% volume)
                mixed_audio = voice_audio.overlay(background_music)

                # Save final mixed audio
                final_filename = f"{user_data['user_id']}_{request.filename}_{int(time.time())}_mixed.wav"
                final_path = os.path.join("story_outputs", final_filename)

                mixed_audio.export(final_path, format="wav")

                # Cleanup temp files
                try:
                    os.remove(voice_path)
                    os.remove(music_path)
                except:
                    pass

                print(f"✅ Audio with background music generated: {final_path}")
                return AudioResponse(
                    success=True,
                    message=f"Audio with {music_theme} background music generated in {request.language}",
                    audio_path=f"/story-audio-temp/{final_filename}"
                )
            else:
                # Fallback to voice-only
                print("⚠ Background music generation failed, using voice-only")
                return AudioResponse(
                    success=True,
                    message=f"Audio generated in {request.language} (voice-only)",
                    audio_path=f"/story-audio-temp/{voice_filename}"
                )

        except ImportError:
            print("⚠ pydub not available, using voice-only audio")
            return AudioResponse(
                success=True,
                message=f"Audio generated in {request.language} (voice-only)",
                audio_path=f"/story-audio-temp/{voice_filename}"
            )

    except ImportError as e:
        print(f"❌ TTS Import Error: {str(e)}")
        return AudioResponse(
            success=False,
            error=f"TTS library not installed: {str(e)}"
        )

    except Exception as e:
        print(f"❌ TTS Generation Error: {str(e)}")
        return AudioResponse(
            success=False,
            error=f"Failed to generate audio: {str(e)}"
        )



@app.post("/api/save-story", response_model=StoriesResponse)
async def save_story(
    request: SaveStoryRequest, user_data: dict = Depends(verify_jwt_token)
):
    """Save story to LanceDB with audio and image data."""
    try:
        story = request.story

        # Generate embedding for semantic search
        search_text = f"{story.title} {story.text}"
        embedding = generate_semantic_embedding(search_text)

        # Read audio file from temp folder if it exists
        audio_data = None
        print(f"🎵 Audio check for story {story.id}: {story.audioUrl}")
        print(
            f"📦 Story object keys: {list(story.__dict__.keys()) if hasattr(story, '__dict__') else 'no __dict__'}"
        )

        if story.audioUrl:
            # Extract filename from URL
            if "/story-audio-temp/" in story.audioUrl:
                audio_filename = story.audioUrl.split("/")[-1]
                temp_audio_path = os.path.join("story_outputs", audio_filename)

                print(f"🎵 Looking for audio file: {temp_audio_path}")
                if os.path.exists(temp_audio_path):
                    with open(temp_audio_path, "rb") as f:
                        audio_data = f.read()
                        print(
                            f"✅ Read audio data for story {story.id}: {len(audio_data)} bytes"
                        )
                else:
                    print(f"❌ Audio file not found: {temp_audio_path}")
                    try:
                        files = os.listdir("story_outputs")
                        print(f"📂 Files in story_outputs: {files}")
                    except:
                        print("❌ Could not list story_outputs directory")
            else:
                print(f"⚠️ Audio URL format not recognized: {story.audioUrl}")
        else:
            print(f"⚠️ No audioUrl provided for story {story.id}")

        print(
            f"🎵 Final audio data: {audio_data is not None} ({len(audio_data) if audio_data else 0} bytes)"
        )

        # Read and store image files from temp folder (images still use temp files)
        image_data_dict = {}
        updated_image_paths = []
        if story.imagePaths:
            for image_path in story.imagePaths:
                if image_path:
                    image_filename = (
                        image_path.split("/")[-1] if "/" in image_path else image_path
                    )
                    temp_image_path = image_filename  # os.path.join("story_outputs", image_filename)

                    if os.path.exists(temp_image_path):
                        with open(temp_image_path, "rb") as f:
                            image_bytes = f.read()
                            image_data_dict[image_filename] = base64.b64encode(
                                image_bytes
                            ).decode("utf-8")
                            print(
                                f"🖼️ Stored image data for {image_filename}: {len(image_bytes)} bytes"
                            )
                            updated_image_paths.append(
                                f"/story-image/{story.id}/{image_filename}"
                            )

        # Update frames data with new image URLs
        updated_frames_data = story.framesData
        if updated_frames_data and updated_image_paths:
            frame_keys = sorted(
                [k for k in updated_frames_data.keys() if k.startswith("frame_")]
            )
            for i, frame_key in enumerate(frame_keys):
                if i < len(updated_image_paths):
                    updated_frames_data[frame_key]["image_path"] = updated_image_paths[
                        i
                    ]

        # Prepare data for LanceDB
        story_data = {
            "id": story.id,
            "user_id": user_data["user_id"],
            "title": story.title,
            "text": story.text,
            "language": story.language,
            "age": story.age,
            "audio_url": f"/story-audio/{story.id}" if audio_data else story.audioUrl,
            "audio_data": audio_data,
            "frames_data": (
                json.dumps(updated_frames_data) if updated_frames_data else None
            ),
            "image_paths": (
                json.dumps(updated_image_paths) if updated_image_paths else None
            ),
            "image_data": json.dumps(image_data_dict) if image_data_dict else None,
            "embedding": embedding,
            "created_at": datetime.now(),
        }

        # Delete existing record if it exists
        try:
            stories_table.delete(
                f"id = '{story.id}' AND user_id = '{user_data['user_id']}'"
            )
        except:
            pass

        # Insert new record
        stories_table.add([story_data])
        print(
            f"✅ Story saved with audio_url: {f'/story-audio/{story.id}' if audio_data else story.audioUrl}"
        )

        return StoriesResponse(success=True, message="Story saved successfully")

    except Exception as e:
        return StoriesResponse(success=False, error=f"Failed to save story: {str(e)}")


@app.get("/api/stories", response_model=StoriesResponse)
async def get_stories(
    offset: int = 0, limit: int = 6, user_data: dict = Depends(verify_jwt_token)
):
    """Get stories from LanceDB with pagination."""
    try:
        print(f"📖 Getting stories for user: {user_data['user_id']}")

        # Get all stories and sort by created_at
        df = stories_table.to_pandas()
        print(f"📦 Total stories in DB: {len(df)}")

        if df.empty:
            print("❌ No stories found in database")
            return StoriesResponse(success=True, stories=[], message="total:0")

        print(f"📝 Available columns: {df.columns.tolist()}")
        print(
            f"👥 Sample user_ids: {df['user_id'].unique()[:5] if 'user_id' in df.columns else 'No user_id column'}"
        )

        # Filter by user and exclude "Generated Audio" entries
        if "user_id" in df.columns:
            df = df[(df["user_id"] == user_data["user_id"]) & (df["title"] != "Generated Audio")]
        else:
            # Fallback: show all stories if no user_id column
            df = df[df["title"] != "Generated Audio"]

        print(f"📦 Stories after filtering: {len(df)}")

        # Sort by created_at descending
        df = df.sort_values("created_at", ascending=False)
        total_count = len(df)

        # Apply pagination
        paginated_df = df.iloc[offset : offset + limit]

        stories = []
        for _, row in paginated_df.iterrows():
            # Fix if story has audio data but no audio_url
            audio_url = row["audio_url"] if pd.notna(row["audio_url"]) else None
            if (
                not audio_url
                and pd.notna(row["audio_data"])
                and row["audio_data"] is not None
            ):
                audio_url = f"/story-audio/{row['id']}"
                print(f"⚡ Fixed missing audio_url for story {row['id']}")

            story = {
                "id": row["id"],
                "title": row["title"],
                "text": row["text"],
                "language": row["language"],
                "age": row["age"],
                "audioUrl": audio_url,
                "framesData": json.loads(row["frames_data"]) if pd.notna(row["frames_data"]) else None,
                "imagePaths": json.loads(row["image_paths"]) if pd.notna(row["image_paths"]) else None,
                "createdAt": row["created_at"].isoformat() if pd.notna(row["created_at"]) else None
            }

            stories.append(story)

        print(f"📦 Returning {len(stories)} stories")
        return StoriesResponse(
            success=True, stories=stories, message=f"total:{total_count}"
        )

    except Exception as e:
        return StoriesResponse(success=False, error=f"Failed to get stories: {str(e)}")


@app.post("/api/search-stories", response_model=StoriesResponse)
async def search_stories(
    request: SearchStoriesRequest, user_data: dict = Depends(verify_jwt_token)
):
    """Search stories using text search (semantic search fallback)."""
    try:
        print(f"🔎 Searching for: {request.query}")

        # Get all stories first
        df = stories_table.to_pandas()

        if df.empty:
            print("❌ No stories found in database")
            return StoriesResponse(success=True, stories=[])

        # Filter by user and exclude "Generated Audio" entries
        df = df[
            (df["user_id"] == user_data["user_id"]) & (df["title"] != "Generated Audio")
        ]

        # Perform case-insensitive text search on title and text
        query_lower = request.query.lower()
        mask = df["title"].str.lower().str.contains(query_lower, na=False) | df[
            "text"
        ].str.lower().str.contains(query_lower, na=False)

        filtered_df = df[mask].head(request.limit)

        stories = []
        for _, row in filtered_df.iterrows():
            # Check if story has audio data but no audio_url
            audio_url = row["audio_url"] if pd.notna(row["audio_url"]) else None
            if (
                not audio_url
                and pd.notna(row["audio_data"])
                and row["audio_data"] is not None
            ):
                audio_url = f"/story-audio/{row['id']}"

            story = {
                "id": row["id"],
                "title": row["title"],
                "text": row["text"],
                "language": row["language"],
                "age": row["age"],
                "audioUrl": audio_url,
                "framesData": (
                    json.loads(row["frames_data"])
                    if pd.notna(row["frames_data"])
                    else None
                ),
                "imagePaths": (
                    json.loads(row["image_paths"])
                    if pd.notna(row["image_paths"])
                    else None
                ),
                "createdAt": (
                    row["created_at"].isoformat()
                    if pd.notna(row["created_at"])
                    else None
                ),
            }
            stories.append(story)

        print(f"✅ Found {len(stories)} text matches for '{request.query}'")
        return StoriesResponse(success=True, stories=stories)

    except Exception as e:
        print(f"❌ Search error: {str(e)}")
        return StoriesResponse(
            success=False, error=f"Failed to search stories: {str(e)}"
        )


@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str, user_data: dict = Depends(verify_jwt_token)):
    """Delete a story from LanceDB."""
    try:
        stories_table.delete(
            f"id = '{story_id}' AND user_id = '{user_data['user_id']}'"
        )
        return {"success": True, "message": "Story deleted successfully"}
    except Exception as e:
        return {"success": False, "error": f"Failed to delete story: {str(e)}"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/clear-sessions")
async def clear_sessions():
    """Clear all server-side sessions and temporary data."""
    try:
        # Clear message bus if it exists
        try:
            from message_bus import message_bus

            message_bus.clear_all()
        except:
            pass

        # Clear any cached workflow states
        from langgraph_server import server

        if hasattr(server, "clear_sessions"):
            server.clear_sessions()

        print("✅ Server sessions cleared")
        return {"success": True, "message": "Sessions cleared successfully"}

    except Exception as e:
        print(f"❌ Error clearing sessions: {e}")
        return {"success": False, "error": str(e)}


# Kid-Friendly Auth Routes
@app.get("/api/auth/foods")
async def get_food_options():
    """Get available food options for password creation"""
    return {"foods": FOOD_OPTIONS}


@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register new user with food password"""
    try:
        user_data = register_user(request.username, request.food_password)
        jwt_token = create_jwt_token(user_data)
        return AuthResponse(
            success=True,
            access_token=jwt_token,
            user={"id": user_data["id"], "username": user_data["username"]},
        )
    except HTTPException as e:
        return AuthResponse(success=False, error=e.detail)
    except Exception as e:
        return AuthResponse(success=False, error=str(e))


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user with food password"""
    try:
        user_data = authenticate_user(request.username, request.food_password)
        jwt_token = create_jwt_token(user_data)
        return AuthResponse(
            success=True,
            access_token=jwt_token,
            user={"id": user_data["id"], "username": user_data["username"]},
        )
    except HTTPException as e:
        return AuthResponse(success=False, error=e.detail)
    except Exception as e:
        return AuthResponse(success=False, error=str(e))


@app.get("/api/auth/me")
async def get_current_user(user_data: dict = Depends(verify_jwt_token)):
    """Get current authenticated user info"""
    return {"user": user_data}


@app.post("/api/auth/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
