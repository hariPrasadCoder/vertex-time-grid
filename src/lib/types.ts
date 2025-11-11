export type Task = {
  id: string;
  title: string;
  urgency: 1 | 2 | 3 | null; // Low, Med, High, or unweighted
  importance: 1 | 2 | 3 | null; // Low, Med, High, or unweighted
  timeRequired: 1 | 2 | 3 | null; // <15 min, 15-60, 60+ min, or unweighted
  category?: string;
  description?: string;
  createdAt: Date;
  completedAt?: Date; // When the task was completed
};

// Helper to check if a task is weighted (has all three values)
export const isTaskWeighted = (task: Task): boolean => {
  return task.urgency !== null && task.importance !== null && task.timeRequired !== null;
};

export type QuadrantType = 'urgent-important' | 'urgent-not' | 'not-urgent-important' | 'not-urgent-not';

export const getQuadrant = (urgency: number | null, importance: number | null): QuadrantType | null => {
  if (urgency === null || importance === null) return null;
  
  const isUrgent = urgency >= 2; // Med (2) or High (3) is urgent
  const isImportant = importance >= 2; // Med (2) or High (3) is important
  
  if (isUrgent && isImportant) return 'urgent-important';
  if (isUrgent && !isImportant) return 'urgent-not';
  if (!isUrgent && isImportant) return 'not-urgent-important';
  return 'not-urgent-not';
};

export const getTimeCategoryLabel = (timeRequired: 1 | 2 | 3 | null): string => {
  if (timeRequired === null) return 'Unweighted';
  switch (timeRequired) {
    case 1:
      return '<15 min';
    case 2:
      return '15-60 min';
    case 3:
      return '60+ min';
  }
};

export const getUrgencyLabel = (urgency: 1 | 2 | 3 | null): string => {
  if (urgency === null) return 'Unweighted';
  switch (urgency) {
    case 1:
      return 'Low';
    case 2:
      return 'Med';
    case 3:
      return 'High';
  }
};

export const getImportanceLabel = (importance: 1 | 2 | 3 | null): string => {
  if (importance === null) return 'Unweighted';
  switch (importance) {
    case 1:
      return 'Low';
    case 2:
      return 'Med';
    case 3:
      return 'High';
  }
};

// Get default weights for a task created in a specific quadrant
export const getQuadrantWeights = (quadrant: QuadrantType): {
  urgency: 1 | 2 | 3;
  importance: 1 | 2 | 3;
  timeRequired: 1 | 2 | 3;
} => {
  switch (quadrant) {
    case 'urgent-important':
      return { urgency: 3, importance: 3, timeRequired: 2 }; // High urgency, high importance, medium time
    case 'urgent-not':
      return { urgency: 3, importance: 1, timeRequired: 2 }; // High urgency, low importance, medium time
    case 'not-urgent-important':
      return { urgency: 1, importance: 3, timeRequired: 2 }; // Low urgency, high importance, medium time
    case 'not-urgent-not':
      return { urgency: 1, importance: 1, timeRequired: 2 }; // Low urgency, low importance, medium time
  }
};
