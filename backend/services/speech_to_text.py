"""
Speech-to-Text Service using OpenAI Whisper API
"""
import os
from openai import OpenAI
from pathlib import Path


class SpeechToTextService:
    """Service for converting speech to text using OpenAI Whisper"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=api_key)
    
    async def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio file to text using OpenAI Whisper
        
        Args:
            audio_file_path: Path to the audio file
        
        Returns:
            Transcribed text
        """
        try:
            with open(audio_file_path, "rb") as audio_file:
                # Use Whisper API for transcription
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text",
                    language="en"  # Can be made configurable
                )
                
                return transcript if isinstance(transcript, str) else str(transcript)
        
        except Exception as e:
            raise Exception(f"Error during transcription: {str(e)}")

