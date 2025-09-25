import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Default to gpt-4o-mini
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.8"))
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))

# Legacy AWS Configuration (kept for backward compatibility)
ROLE_NAME = "BUSDV_QA_Bedrock_User"
REGION_NAME = "us-west-2"
MODEL_ID = "openai.gpt-oss-20b-1:0"
