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


def _extract_text(response) -> str:
    """Extract text safely from Gemini response."""
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    # Fallback for cases where response.text is empty but candidates/parts exist.
    chunks: list[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text:
                chunks.append(part_text)
    return "".join(chunks)


def _finish_reason(response) -> str:
    """Return normalized finish reason string for first candidate."""
    candidates = getattr(response, "candidates", []) or []
    if not candidates:
        return ""
    reason = getattr(candidates[0], "finish_reason", "")
    return str(reason).upper()


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
        text = _extract_text(response)
        if not text:
            return None

        # If the model stopped due to token limits, fetch one continuation chunk.
        reason = _finish_reason(response)
        if "MAX_TOKENS" in reason:
            continuation_prompt = (
                "Continue the text below from exactly where it stopped. "
                "Do not repeat earlier content. Keep markdown formatting consistent.\n\n"
                "---\n"
                f"{text[-4000:]}\n"
                "---"
            )
            continuation = client.models.generate_content(
                model=_MODEL,
                contents=continuation_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system if system else None,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            cont_text = _extract_text(continuation)
            if cont_text:
                text = f"{text.rstrip()}\n\n{cont_text.lstrip()}"

        return text.strip()
    except Exception as e:
        log.warning("Gemini API call failed: %s", e)
        return None
