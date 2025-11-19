# Voice Mode Feature Implementation

## Overview

The voice mode feature allows users to speak naturally for 2 seconds to 60 minutes, automatically converting speech to text and extracting actionable tasks with intelligent inference of urgency, importance, time requirements, and categories.

## Architecture

### Backend (FastAPI + Python)

Located in `/backend` directory:

1. **main.py**: FastAPI application with endpoints:
   - `POST /api/voice/process`: Main endpoint for processing audio and extracting tasks
   - `POST /api/voice/transcribe`: Testing endpoint for transcription only
   - `GET /health`: Health check endpoint

2. **services/speech_to_text.py**: 
   - Uses OpenAI Whisper API for speech-to-text conversion
   - Supports multiple audio formats (wav, mp3, m4a, webm, ogg)

3. **services/action_extractor.py**:
   - Uses OpenAI GPT-4o-mini for intelligent task extraction
   - Analyzes transcripts and extracts:
     - Task titles (required)
     - Descriptions (optional)
     - Urgency (1-3 scale, inferred from context)
     - Importance (1-3 scale, inferred from context)
     - Time required (1-3 scale, inferred from context)
     - Categories (optional, if mentioned)

4. **models.py**: Pydantic models for request/response validation

### Frontend (React + TypeScript)

1. **src/hooks/useVoiceRecorder.tsx**:
   - Custom hook for managing voice recording
   - Handles MediaRecorder API
   - Enforces minimum (2s) and maximum (60min) duration
   - Supports pause/resume functionality
   - Auto-stops at maximum duration

2. **src/pages/VoiceMode.tsx**:
   - Main voice mode page component
   - Recording controls with visual feedback
   - Displays transcript after processing
   - Shows extracted tasks with selection interface
   - Allows users to review and select tasks before saving
   - Integrates with Supabase to save selected tasks

3. **Navigation Integration**:
   - Added "Voice Mode" to sidebar navigation
   - Route: `/voice`
   - Protected route (requires authentication)

## Features

### Recording
- ✅ Minimum duration: 2 seconds
- ✅ Maximum duration: 60 minutes (3600 seconds)
- ✅ Pause/Resume functionality
- ✅ Real-time duration display
- ✅ Auto-stop at maximum duration
- ✅ Microphone permission handling
- ✅ Error handling and user feedback

### Processing
- ✅ Speech-to-text conversion using OpenAI Whisper
- ✅ Intelligent task extraction using GPT
- ✅ Automatic inference of task properties:
  - Urgency (Low/Medium/High)
  - Importance (Low/Medium/High)
  - Time required (<15 min / 15-60 min / 60+ min)
  - Categories (if mentioned)

### Task Management
- ✅ Review extracted tasks before saving
- ✅ Select/deselect individual tasks
- ✅ Batch save selected tasks
- ✅ Tasks saved as unweighted if properties can't be inferred
- ✅ Integration with existing task management system

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env and add OPENAI_API_KEY
```

5. Start server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Add environment variable to `.env`:
```
VITE_BACKEND_API_URL=http://localhost:8000
```

2. Start frontend (if not already running):
```bash
npm run dev
```

## API Endpoints

### POST /api/voice/process

Process audio file and extract tasks.

**Request:**
- `audio_file`: Audio file (multipart/form-data)
- `user_id` (optional): User ID for context

**Response:**
```json
{
  "transcript": "Full transcript text...",
  "tasks": [
    {
      "title": "Task title",
      "description": "Optional description",
      "urgency": 2,
      "importance": 3,
      "time_required": 1,
      "category": "Work"
    }
  ],
  "processing_time": 2.5
}
```

## Usage Flow

1. User navigates to Voice Mode page (`/voice`)
2. User clicks microphone button to start recording
3. User speaks naturally (minimum 2 seconds, maximum 60 minutes)
4. User can pause/resume recording
5. User stops recording
6. Audio is sent to backend for processing
7. Backend transcribes audio using Whisper
8. Backend extracts tasks using GPT
9. Frontend displays transcript and extracted tasks
10. User reviews and selects tasks to save
11. Selected tasks are saved to Supabase database

## Technical Details

### Audio Formats Supported
- WebM (preferred, with Opus codec)
- OGG (with Opus codec)
- MP4/M4A
- WAV

### AI Models Used
- **Whisper-1**: OpenAI's speech-to-text model
- **GPT-4o-mini**: Cost-effective model for task extraction (can be upgraded to GPT-4o)

### Cost Considerations
- Whisper API: ~$0.006 per minute of audio
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical 5-minute recording: ~$0.03 (Whisper) + ~$0.01 (GPT) = ~$0.04 total

## Future Enhancements

Potential improvements:
- Real-time transcription (streaming)
- Voice activity detection (auto-start/stop)
- Multiple language support
- Custom task extraction prompts
- Voice commands for task management
- Integration with calendar for scheduling
- Audio playback for review

## Troubleshooting

### Backend Issues
- Ensure OpenAI API key is set correctly
- Check that port 8000 is available
- Verify CORS origins include frontend URL

### Frontend Issues
- Check microphone permissions in browser
- Verify `VITE_BACKEND_API_URL` is set correctly
- Ensure backend is running before using voice mode

### Audio Issues
- Use Chrome/Edge for best audio format support
- Check browser console for MediaRecorder errors
- Ensure microphone is not being used by another application


