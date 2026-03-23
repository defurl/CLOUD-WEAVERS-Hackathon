"""
LLM utility — thin wrapper around Google Gemini.
Falls back to None when GEMINI_API_KEY is not set (template mode).
"""

import os
import logging

from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

_client = None
_MODEL = "gemini-2.5-flash"


def _get_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    from google import genai
    _client = genai.Client(api_key=api_key)
    return _client


def generate(prompt: str, *, system: str = "", temperature: float = 0.7, max_tokens: int = 4096) -> str | None:
    """Call Gemini and return text. Returns None if no API key or on error."""
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system if system else None,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text
    except Exception as e:
        log.warning("Gemini API call failed: %s", e)
        return None
