import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, GripVertical, CheckCircle2, Trash2, Tag, Pencil, Circle, PlayCircle, PauseCircle } from 'lucide-react';
import { Task, getTimeCategoryLabel, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskForm } from './TaskForm';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  existingCategories?: string[];
  timeIconOnly?: boolean; // If true, show only colored clock icon without text
  hideStatus?: boolean; // If true, hide the status badge (useful in Kanban where column shows status)
}

export const TaskCard = ({ 
  task, 
  onComplete, 
  onDelete, 
  onUpdateTask,
  existingCategories = [],
  timeIconOnly = false,
  hideStatus = false,
}: TaskCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const timeBadgeClass = task.timeRequired
    ? {
        1: 'bg-time-quick text-time-quick-foreground',
        2: 'bg-time-medium text-time-medium-foreground',
        3: 'bg-time-long text-time-long-foreground',
      }[task.timeRequired]
    : 'bg-muted text-muted-foreground';

  // Get time color for icon-only mode (green, yellow, red)
  const getTimeIconColor = (timeRequired: 1 | 2 | 3 | null): string => {
    if (!timeRequired) return 'text-muted-foreground';
    switch (timeRequired) {
      case 1: // <15 min - green
        return 'text-green-600 dark:text-green-400';
      case 2: // 15-60 min - yellow
        return 'text-yellow-600 dark:text-yellow-400';
      case 3: // 60+ min - red
        return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'To-do':
        return <Circle className="h-3.5 w-3.5" />;
      case 'In Progress':
        return <PlayCircle className="h-3.5 w-3.5" />;
      case 'On-hold':
        return <PauseCircle className="h-3.5 w-3.5" />;
      case 'Done':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'To-do':
        return 'text-muted-foreground';
      case 'In Progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'On-hold':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Done':
        return 'text-green-600 dark:text-green-400';
    }
  };

  // Generate a consistent color for a category name
  const getCategoryColor = (category: string): string => {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate a hue between 0-360
    const hue = Math.abs(hash) % 360;
    
    // Use HSL with fixed saturation and lightness for consistent appearance
    return `hsl(${hue}, 65%, 50%)`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && 'opacity-50 rotate-2 scale-105'
      )}
    >
      <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <button
              className="cursor-grab active:cursor-grabbing pt-1 text-muted-foreground hover:text-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-tight break-words">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pl-6">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {timeIconOnly ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn('shrink-0 cursor-help', getTimeIconColor(task.timeRequired))}>
                      <Clock className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getTimeCategoryLabel(task.timeRequired)}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn('text-xs shrink-0', timeBadgeClass)}>
                      <Clock className="h-3 w-3" />
                      <span className="ml-1 hidden sm:inline">{getTimeCategoryLabel(task.timeRequired)}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getTimeCategoryLabel(task.timeRequired)}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!hideStatus && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn('text-xs shrink-0', getStatusColor(task.status))}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 hidden sm:inline">{task.status}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.status}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {task.category && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-5 w-5 rounded-full border-2 border-background shadow-sm shrink-0 cursor-help flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: getCategoryColor(task.category) }}
                      aria-label={task.category}
                    >
                      <Tag className="h-2.5 w-2.5 text-white/90" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.category}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onUpdateTask && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onComplete(task.id)}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {onUpdateTask && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              task={task}
              onUpdateTask={(taskId, taskData) => {
                onUpdateTask(taskId, taskData);
                setIsEditDialogOpen(false);
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              existingCategories={existingCategories}
              onAddTask={() => {}} // Not used in edit mode
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
