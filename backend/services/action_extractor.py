"""
Action Item Extraction Service using OpenAI GPT
Extracts tasks from transcripts with urgency, importance, and time estimates
"""
import os
import json
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from openai import OpenAI

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))
from models import ExtractedTask


class ActionExtractorService:
    """Service for extracting action items from transcripts"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=api_key)
    
    async def extract_tasks(self, transcript: str, user_id: Optional[str] = None) -> List[ExtractedTask]:
        """
        Extract action items from transcript using GPT
        
        Args:
            transcript: The transcribed text
            user_id: Optional user ID for context
        
        Returns:
            List of extracted tasks
        """
        system_prompt = """You are an intelligent task extraction assistant. Your job is to analyze a conversation transcript and extract actionable tasks from the user's perspective.

For each task you identify, extract:
1. **Title**: A clear, concise task title (required)
2. **Description**: Additional context or details (optional)
3. **Urgency**: On a scale of 1-3 where 1=Low, 2=Medium, 3=High (optional, infer from context)
4. **Importance**: On a scale of 1-3 where 1=Low, 2=Medium, 3=High (optional, infer from context)
5. **Time Required**: On a scale of 1-3 where 1=<15 min, 2=15-60 min, 3=60+ min (optional, infer from context)
6. **Category**: A relevant category if mentioned (optional)

Guidelines:
- Only extract tasks that are actionable items (things the user needs to do)
- Ignore general statements, questions, or non-actionable content
- If urgency/importance/time cannot be inferred, leave them as null
- Be conservative - only extract clear action items
- Group related actions when appropriate
- Return tasks in JSON format as a list

Return ONLY valid JSON array, no markdown, no explanation."""

        user_prompt = f"""Analyze the following transcript and extract all actionable tasks from the user's perspective:

Transcript:
{transcript}

Extract tasks and return them as a JSON array. Each task should have:
- title (string, required)
- description (string, optional)
- urgency (integer 1-3, optional)
- importance (integer 1-3, optional)
- time_required (integer 1-3, optional)
- category (string, optional)

Return a JSON object with a "tasks" key containing the array of tasks. Example format:
{{
  "tasks": [
    {{
      "title": "Task title",
      "description": "Optional description",
      "urgency": 2,
      "importance": 3,
      "time_required": 1,
      "category": "Work"
    }}
  ]
}}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Using cost-effective model, can upgrade to gpt-4o if needed
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent extraction
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON response
            try:
                # Handle both direct array and object with tasks key
                parsed = json.loads(content)
                
                # If it's an object, try to find tasks array
                if isinstance(parsed, dict):
                    tasks_data = parsed.get("tasks", parsed.get("action_items", parsed.get("items", [])))
                else:
                    tasks_data = parsed
                
                # Ensure it's a list
                if not isinstance(tasks_data, list):
                    tasks_data = [tasks_data] if tasks_data else []
                
                # Convert to ExtractedTask objects
                tasks = []
                for task_data in tasks_data:
                    if not isinstance(task_data, dict):
                        continue
                    # Validate and convert task data
                    # Handle None values safely
                    title = task_data.get("title") or ""
                    description = task_data.get("description")
                    category = task_data.get("category")
                    
                    task = ExtractedTask(
                        title=title.strip() if title else "",
                        description=description.strip() if description else None,
                        urgency=self._validate_scale(task_data.get("urgency")),
                        importance=self._validate_scale(task_data.get("importance")),
                        time_required=self._validate_scale(task_data.get("time_required")),
                        category=category.strip() if category else None
                    )
                    
                    # Only add tasks with valid titles
                    if task.title:
                        tasks.append(task)
                
                return tasks
            
            except json.JSONDecodeError as e:
                # Fallback: try to extract tasks from text response
                print(f"JSON parsing error: {e}")
                print(f"Response content: {content}")
                # Return empty list if parsing fails
                return []
        
        except Exception as e:
            raise Exception(f"Error extracting tasks: {str(e)}")
    
    def _validate_scale(self, value: any) -> Optional[int]:
        """Validate and return value if it's in 1-3 range, else None"""
        if value is None:
            return None
        try:
            int_value = int(value)
            if 1 <= int_value <= 3:
                return int_value
        except (ValueError, TypeError):
            pass
        return None

