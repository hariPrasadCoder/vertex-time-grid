"""
FastAPI Backend for Vertex Time Grid - Voice Mode Feature
Handles speech-to-text conversion and action item extraction
"""
import os
import tempfile
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import openai
from models import ExtractedTask, VoiceProcessResponse, TaskWeightingRequest, TaskWeightingResponse, TaskSuggestion
from services.speech_to_text import SpeechToTextService
from services.action_extractor import ActionExtractorService
from services.task_weighting import TaskWeightingService
from services.date_parser import DateParserService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Vertex Time Grid Voice API",
    description="API for voice-to-task conversion",
    version="1.0.0"
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
# Note: Services will check for API key themselves
try:
    speech_service = SpeechToTextService()
    action_extractor = ActionExtractorService()
except ValueError as e:
    print(f"Warning: {e}. Services will fail if API key is not set in environment.")
    speech_service = None
    action_extractor = None

try:
    task_weighting_service = TaskWeightingService()
except ValueError as e:
    print(f"Warning: {e}. Task weighting service will fail if OPENAI_API_KEY is not set in environment.")
    task_weighting_service = None

# Initialize date parser service
date_parser_service = DateParserService()


# Models are imported from models.py


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Vertex Time Grid Voice API", "status": "healthy"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services_initialized": speech_service is not None and action_extractor is not None,
        "openai_api_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "task_weighting_initialized": task_weighting_service is not None
    }


@app.post("/api/voice/process", response_model=VoiceProcessResponse)
async def process_voice(
    audio_file: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """
    Process audio file and extract action items
    
    Args:
        audio_file: Audio file (supports wav, mp3, m4a, webm, ogg)
        user_id: Optional user ID for context
    
    Returns:
        Transcript and extracted tasks
    """
    import time
    import traceback
    start_time = time.time()
    
    # Check if services are initialized
    if not speech_service or not action_extractor:
        raise HTTPException(
            status_code=500,
            detail="Voice services not initialized. Please check OPENAI_API_KEY environment variable."
        )
    
    # Validate audio file
    # Handle cases where filename might be missing or extension might be in content_type
    file_extension = None
    if audio_file.filename:
        file_extension = Path(audio_file.filename).suffix.lower()
    
    # If no extension in filename, try to infer from content_type
    if not file_extension and audio_file.content_type:
        content_type_to_ext = {
            'audio/webm': '.webm',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/mp4': '.mp4',
            'audio/wav': '.wav',
            'audio/x-wav': '.wav',
            'audio/m4a': '.m4a',
        }
        file_extension = content_type_to_ext.get(audio_file.content_type)
    
    # Default to .webm if we still don't have an extension
    if not file_extension:
        file_extension = '.webm'
    
    allowed_extensions = {'.wav', '.mp3', '.m4a', '.webm', '.ogg', '.mp4'}
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}. Received: {file_extension}"
        )
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await audio_file.read()
            if not content:
                raise HTTPException(
                    status_code=400,
                    detail="Audio file is empty"
                )
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Step 1: Convert speech to text
            transcript = await speech_service.transcribe(temp_file_path)
            
            if not transcript or len(transcript.strip()) < 10:
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract meaningful text from audio. Please ensure the audio is clear and contains speech."
                )
            
            # Step 2: Extract action items from transcript
            tasks = await action_extractor.extract_tasks(transcript, user_id)
            
            processing_time = time.time() - start_time
            
            return VoiceProcessResponse(
                transcript=transcript,
                tasks=tasks,
                processing_time=round(processing_time, 2)
            )
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error processing audio: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )


@app.post("/api/voice/transcribe")
async def transcribe_only(
    audio_file: UploadFile = File(...)
):
    """
    Only transcribe audio without extracting tasks (for testing)
    """
    if not speech_service:
        raise HTTPException(
            status_code=500,
            detail="Speech service not initialized. Please check OPENAI_API_KEY environment variable."
        )
    
    if not audio_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Audio file must have a filename"
        )
    
    file_extension = Path(audio_file.filename).suffix.lower() or '.webm'
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            transcript = await speech_service.transcribe(temp_file_path)
            return {"transcript": transcript}
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error transcribing audio: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing audio: {str(e)}"
        )


@app.post("/api/tasks/weight", response_model=TaskWeightingResponse)
async def weight_tasks(request: TaskWeightingRequest):
    """
    Analyze unweighted tasks and suggest weights/categories using OpenAI GPT
    
    Args:
        request: Contains unweighted tasks and reference tasks
    
    Returns:
        Suggestions for urgency, importance, time_required, and category
    """
    import time
    start_time = time.time()
    
    # Check if service is initialized
    if not task_weighting_service:
        raise HTTPException(
            status_code=500,
            detail="Task weighting service not initialized. Please check OPENAI_API_KEY environment variable."
        )
    
    # Validate request
    if not request.unweighted_tasks:
        raise HTTPException(
            status_code=400,
            detail="No unweighted tasks provided"
        )
    
    try:
        # Call the weighting service
        suggestions_data = await task_weighting_service.weight_tasks(
            unweighted_tasks=request.unweighted_tasks,
            reference_tasks=request.reference_tasks,
            user_id=request.user_id
        )
        
        # Convert to TaskSuggestion objects
        suggestions = [
            TaskSuggestion(
                id=sug["id"],
                urgency=sug["urgency"],
                importance=sug["importance"],
                time_required=sug["time_required"],
                category=sug.get("category")
            )
            for sug in suggestions_data
        ]
        
        processing_time = time.time() - start_time
        
        return TaskWeightingResponse(
            suggestions=suggestions,
            processing_time=round(processing_time, 2)
        )
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error weighting tasks: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error weighting tasks: {str(e)}"
        )


@app.post("/api/date/parse")
async def parse_date(text: str = Form(...)):
    """
    Parse natural language date/time string into ISO format datetime
    
    Args:
        text: Natural language date/time string (e.g., "tomorrow 5pm", "Next Fri 9am")
    
    Returns:
        Parsed datetime in ISO format or error message
    """
    try:
        parsed_date = date_parser_service.parse(text)
        if parsed_date is None:
            raise HTTPException(
                status_code=400,
                detail=f"Could not parse date/time from: {text}"
            )
        
        return {
            "datetime": parsed_date.isoformat(),
            "text": text
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing date: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run(app, host=host, port=port)

