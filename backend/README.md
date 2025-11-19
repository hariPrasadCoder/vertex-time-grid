# Vertex Time Grid - Voice Mode Backend

FastAPI backend service for processing voice recordings and extracting actionable tasks.

## Features

- **Speech-to-Text**: Converts audio recordings to text using OpenAI Whisper API
- **Action Extraction**: Uses GPT to intelligently extract actionable tasks from transcripts
- **Task Intelligence**: Automatically infers urgency, importance, time requirements, and categories
- **AI Task Weighting**: Uses OpenAI GPT to automatically weight and categorize unweighted tasks based on existing task patterns

## Setup

### Prerequisites

- Python 3.9 or higher
- OpenAI API key (for voice mode and task weighting)

### Installation

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Python directly
python main.py
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### POST `/api/voice/process`

Process an audio file and extract tasks.

**Request:**
- `audio_file`: Audio file (wav, mp3, m4a, webm, ogg)
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

### POST `/api/voice/transcribe`

Only transcribe audio without extracting tasks (for testing).

**Request:**
- `audio_file`: Audio file

**Response:**
```json
{
  "transcript": "Full transcript text..."
}
```

### POST `/api/tasks/weight`

Analyze unweighted tasks and suggest weights/categories using OpenAI GPT.

**Request:**
```json
{
  "unweighted_tasks": [
    {
      "id": "task-id-1",
      "title": "Review quarterly report",
      "description": "Need to review the Q4 report",
      "category": null
    }
  ],
  "reference_tasks": [
    {
      "id": "task-id-2",
      "title": "Complete project proposal",
      "description": "Finish the proposal document",
      "urgency": 3,
      "importance": 3,
      "time_required": 3,
      "category": "Work"
    }
  ],
  "user_id": "optional-user-id"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "task-id-1",
      "urgency": 2,
      "importance": 3,
      "time_required": 2,
      "category": "Work"
    }
  ],
  "processing_time": 1.5
}
```

## Environment Variables

- `OPENAI_API_KEY`: Required. Your OpenAI API key for Whisper, GPT, and task weighting
- `BACKEND_HOST`: Server host (default: 0.0.0.0)
- `BACKEND_PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (default: http://localhost:8080,http://localhost:5173)

## Architecture

- `main.py`: FastAPI application and route handlers
- `models.py`: Pydantic models for request/response validation
- `services/speech_to_text.py`: OpenAI Whisper integration
- `services/action_extractor.py`: GPT-based task extraction
- `services/task_weighting.py`: OpenAI GPT task weighting and categorization

## Notes

- Audio files are temporarily stored during processing and automatically deleted
- The service uses `gpt-4o-mini` for cost-effective task extraction (can be upgraded to `gpt-4o`)
- Minimum transcript length is 10 characters to ensure meaningful content
- Task weighting uses `gpt-4o-mini` for fast and cost-effective analysis (can be upgraded to `gpt-4o`)
- The AI analyzes your existing weighted tasks to understand your categorization patterns and applies similar logic to unweighted tasks

