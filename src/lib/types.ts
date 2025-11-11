export type Task = {
  id: string;
  title: string;
  urgency: number; // 1-5
  importance: number; // 1-5
  timeRequired: number; // in minutes
  description?: string;
  createdAt: Date;
};

export type QuadrantType = 'urgent-important' | 'urgent-not' | 'not-urgent-important' | 'not-urgent-not';

export const getQuadrant = (urgency: number, importance: number): QuadrantType => {
  const isUrgent = urgency >= 3;
  const isImportant = importance >= 3;
  
  if (isUrgent && isImportant) return 'urgent-important';
  if (isUrgent && !isImportant) return 'urgent-not';
  if (!isUrgent && isImportant) return 'not-urgent-important';
  return 'not-urgent-not';
};

export const getTimeCategory = (minutes: number): 'quick' | 'medium' | 'long' => {
  if (minutes <= 30) return 'quick';
  if (minutes <= 120) return 'medium';
  return 'long';
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
