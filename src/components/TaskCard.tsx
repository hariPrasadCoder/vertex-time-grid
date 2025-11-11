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
import { Clock, GripVertical, CheckCircle2, Trash2, Tag, Pencil } from 'lucide-react';
import { Task, getTimeCategoryLabel } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskForm } from './TaskForm';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  existingCategories?: string[];
}

export const TaskCard = ({ 
  task, 
  onComplete, 
  onDelete, 
  onUpdateTask,
  existingCategories = [],
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', timeBadgeClass)}>
                <Clock className="h-3 w-3 mr-1" />
                {getTimeCategoryLabel(task.timeRequired)}
              </Badge>
              {task.category && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {task.category}
                </Badge>
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
                  <Pencil className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onComplete(task.id)}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
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
