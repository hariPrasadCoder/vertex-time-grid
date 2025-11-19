"""
Task Weighting Service using OpenAI GPT
Analyzes unweighted tasks and suggests urgency, importance, time, and category
based on existing weighted tasks as reference
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


class TaskWeightingService:
    """Service for weighting and categorizing tasks using OpenAI GPT"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=api_key)
    
    async def weight_tasks(
        self,
        unweighted_tasks: List[Dict[str, Any]],
        reference_tasks: List[Dict[str, Any]],
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze unweighted tasks and suggest weights/categories based on reference tasks
        
        Args:
            unweighted_tasks: List of tasks without urgency/importance/time_required
            reference_tasks: List of existing weighted tasks to use as reference
            user_id: Optional user ID for context
        
        Returns:
            List of tasks with suggested weights and categories
        """
        # Build reference context from existing tasks
        reference_context = self._build_reference_context(reference_tasks)
        
        # Build prompt for AI
        system_prompt = """You are an intelligent task management assistant. Your job is to analyze unweighted tasks and suggest appropriate urgency, importance, time requirements, and categories based on patterns from existing weighted tasks.

For each unweighted task, you need to suggest:
1. **Urgency** (1-3): 1=Low, 2=Medium, 3=High
   - Consider deadlines, time sensitivity, dependencies
2. **Importance** (1-3): 1=Low, 2=Medium, 3=High
   - Consider impact, value, strategic importance
3. **Time Required** (1-3): 1=<15 min, 2=15-60 min, 3=60+ min
   - Estimate based on task complexity and scope
4. **Category**: Suggest a category that matches the user's existing categorization patterns

Guidelines:
- Analyze the reference tasks to understand the user's weighting patterns
- Match similar tasks to similar weights
- Be consistent with the user's existing categorization
- If a task is unclear, make reasonable inferences
- Return suggestions in JSON format

Return ONLY valid JSON array, no markdown, no explanation."""

        # Format tasks for prompt
        unweighted_tasks_text = self._format_tasks_for_prompt(unweighted_tasks)
        reference_tasks_text = self._format_tasks_for_prompt(reference_tasks, include_weights=True)
        
        user_prompt = f"""Analyze the following unweighted tasks and suggest urgency, importance, time_required, and category for each.

REFERENCE TASKS (existing weighted tasks to understand patterns):
{reference_tasks_text}

UNWEIGHTED TASKS (need suggestions):
{unweighted_tasks_text}

For each unweighted task, return a JSON object with:
- id: The task ID (required)
- urgency: Integer 1-3 (required)
- importance: Integer 1-3 (required)
- time_required: Integer 1-3 (required)
- category: String matching existing categories when possible (optional)

Return a JSON object with a "suggestions" key containing an array of suggestions. Example:
{{
  "suggestions": [
    {{
      "id": "task-id-1",
      "urgency": 2,
      "importance": 3,
      "time_required": 1,
      "category": "Work"
    }},
    {{
      "id": "task-id-2",
      "urgency": 1,
      "importance": 2,
      "time_required": 2,
      "category": "Personal"
    }}
  ]
}}"""

        try:
            # Call OpenAI GPT
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Using cost-effective model, can upgrade to gpt-4o if needed
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent extraction
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                # Remove markdown code blocks if present
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                parsed = json.loads(content)
                
                # Extract suggestions array
                if isinstance(parsed, dict):
                    suggestions = parsed.get("suggestions", parsed.get("tasks", []))
                else:
                    suggestions = parsed if isinstance(parsed, list) else []
                
                # Validate and format suggestions
                validated_suggestions = []
                for suggestion in suggestions:
                    if not isinstance(suggestion, dict):
                        continue
                    
                    task_id = suggestion.get("id")
                    if not task_id:
                        continue
                    
                    validated_suggestions.append({
                        "id": task_id,
                        "urgency": self._validate_scale(suggestion.get("urgency")),
                        "importance": self._validate_scale(suggestion.get("importance")),
                        "time_required": self._validate_scale(suggestion.get("time_required")),
                        "category": suggestion.get("category") if suggestion.get("category") else None
                    })
                
                return validated_suggestions
            
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"Response content: {content}")
                # Return empty list if parsing fails
                return []
        
        except Exception as e:
            raise Exception(f"Error weighting tasks: {str(e)}")
    
    def _build_reference_context(self, reference_tasks: List[Dict[str, Any]]) -> str:
        """Build a summary of reference tasks for context"""
        if not reference_tasks:
            return "No reference tasks available."
        
        # Group by category
        categories = {}
        for task in reference_tasks:
            cat = task.get("category") or "Uncategorized"
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(task)
        
        context_parts = []
        for category, tasks in categories.items():
            context_parts.append(f"\n{category} ({len(tasks)} tasks):")
            for task in tasks[:5]:  # Limit to 5 per category
                urgency = task.get("urgency", "?")
                importance = task.get("importance", "?")
                time = task.get("time_required", "?")
                title = task.get("title", "")
                context_parts.append(f"  - {title}: U={urgency}, I={importance}, T={time}")
        
        return "\n".join(context_parts)
    
    def _format_tasks_for_prompt(
        self,
        tasks: List[Dict[str, Any]],
        include_weights: bool = False
    ) -> str:
        """Format tasks for the AI prompt"""
        if not tasks:
            return "None"
        
        formatted = []
        for task in tasks:
            parts = [f"ID: {task.get('id', 'unknown')}"]
            parts.append(f"Title: {task.get('title', '')}")
            if task.get('description'):
                parts.append(f"Description: {task.get('description')}")
            if include_weights:
                parts.append(f"Urgency: {task.get('urgency', 'N/A')}")
                parts.append(f"Importance: {task.get('importance', 'N/A')}")
                parts.append(f"Time Required: {task.get('time_required', 'N/A')}")
            if task.get('category'):
                parts.append(f"Category: {task.get('category')}")
            formatted.append(" | ".join(parts))
        
        return "\n".join(formatted)
    
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

