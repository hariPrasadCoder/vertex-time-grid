"""
Service for parsing natural language date/time strings into datetime objects
"""
from datetime import datetime, timedelta
from typing import Optional
import re


class DateParserService:
    """Parse natural language date/time strings like 'tomorrow 5pm', 'Next Fri 9am'"""
    
    def __init__(self):
        # Common time patterns
        self.time_patterns = [
            (r'(\d{1,2}):(\d{2})\s*(am|pm)', self._parse_24h_time),  # 5:30pm, 9:00am
            (r'(\d{1,2})\s*(am|pm)', self._parse_12h_time),  # 5pm, 9am
            (r'(\d{1,2}):(\d{2})', self._parse_24h_no_meridian),  # 14:30 (24h format)
        ]
        
        # Day names
        self.days = {
            'monday': 0, 'mon': 0,
            'tuesday': 1, 'tue': 1, 'tues': 1,
            'wednesday': 2, 'wed': 2,
            'thursday': 3, 'thu': 3, 'thur': 3, 'thurs': 3,
            'friday': 4, 'fri': 4,
            'saturday': 5, 'sat': 5,
            'sunday': 6, 'sun': 6,
        }
    
    def parse(self, text: str, reference_date: Optional[datetime] = None) -> Optional[datetime]:
        """
        Parse natural language date/time string into datetime object
        
        Examples:
            - "tomorrow 5pm"
            - "Next Fri 9am"
            - "Monday 2pm"
            - "next week monday 10am"
            - "today 3pm"
        
        Args:
            text: Natural language date/time string
            reference_date: Reference date for relative parsing (defaults to now)
        
        Returns:
            Parsed datetime or None if parsing fails
        """
        if not text or not text.strip():
            return None
        
        text = text.strip().lower()
        if reference_date is None:
            reference_date = datetime.now()
        
        # Try to parse the date/time
        result = self._parse_date_time(text, reference_date)
        return result
    
    def _parse_date_time(self, text: str, reference: datetime) -> Optional[datetime]:
        """Parse date and time from text"""
        # Extract time first
        time_match = None
        time_str = None
        hour = None
        minute = 0
        
        for pattern, parser in self.time_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                time_match = match
                time_str = match.group(0)
                hour, minute = parser(match)
                break
        
        # Remove time from text for date parsing
        date_text = text
        if time_str:
            date_text = date_text.replace(time_str, '').strip()
        
        # Parse date
        date = self._parse_date(date_text, reference)
        if date is None:
            # If no date found but we have time, use today
            if hour is not None:
                date = reference.replace(hour=0, minute=0, second=0, microsecond=0)
            else:
                return None
        
        # Apply time if we found one
        if hour is not None:
            date = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        return date
    
    def _parse_date(self, text: str, reference: datetime) -> Optional[datetime]:
        """Parse date portion from text"""
        text = text.strip()
        if not text:
            return reference.replace(hour=0, minute=0, second=0, microsecond=0)
        
        today = reference.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # "today"
        if text in ['today', '']:
            return today
        
        # "tomorrow"
        if text in ['tomorrow', 'tom']:
            return today + timedelta(days=1)
        
        # "day after tomorrow"
        if text in ['day after tomorrow', 'day after tom']:
            return today + timedelta(days=2)
        
        # "yesterday"
        if text in ['yesterday', 'yest']:
            return today - timedelta(days=1)
        
        # "next [day]" or "[day]"
        day_match = None
        for day_name, day_num in self.days.items():
            if day_name in text:
                day_match = day_num
                break
        
        if day_match is not None:
            current_day = reference.weekday()
            days_ahead = day_match - current_day
            
            # Check for "next" keyword
            if 'next' in text:
                if days_ahead <= 0:
                    days_ahead += 7
                return today + timedelta(days=days_ahead)
            else:
                # This week's occurrence
                if days_ahead <= 0:
                    days_ahead += 7  # Next week
                return today + timedelta(days=days_ahead)
        
        # "in X days"
        days_match = re.search(r'in\s+(\d+)\s+days?', text)
        if days_match:
            days = int(days_match.group(1))
            return today + timedelta(days=days)
        
        # "X days from now"
        days_match = re.search(r'(\d+)\s+days?\s+from\s+now', text)
        if days_match:
            days = int(days_match.group(1))
            return today + timedelta(days=days)
        
        # Try to parse as relative week
        if 'next week' in text:
            # Find day name
            for day_name, day_num in self.days.items():
                if day_name in text:
                    current_day = reference.weekday()
                    days_ahead = day_num - current_day
                    if days_ahead <= 0:
                        days_ahead += 7
                    return today + timedelta(days=days_ahead + 7)
        
        # Default to today if we can't parse
        return today
    
    def _parse_24h_time(self, match) -> tuple[int, int]:
        """Parse 12-hour time format with AM/PM"""
        hour = int(match.group(1))
        minute = int(match.group(2))
        meridian = match.group(3).lower()
        
        if meridian == 'pm' and hour != 12:
            hour += 12
        elif meridian == 'am' and hour == 12:
            hour = 0
        
        return hour, minute
    
    def _parse_12h_time(self, match) -> tuple[int, int]:
        """Parse 12-hour time format without minutes"""
        hour = int(match.group(1))
        meridian = match.group(2).lower()
        
        if meridian == 'pm' and hour != 12:
            hour += 12
        elif meridian == 'am' and hour == 12:
            hour = 0
        
        return hour, 0
    
    def _parse_24h_no_meridian(self, match) -> tuple[int, int]:
        """Parse 24-hour time format"""
        hour = int(match.group(1))
        minute = int(match.group(2))
        return hour, minute

