import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, GripVertical, CheckCircle2, Trash2 } from 'lucide-react';
import { Task, getTimeCategory, formatTime } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskCard = ({ task, onComplete, onDelete }: TaskCardProps) => {
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

  const timeCategory = getTimeCategory(task.timeRequired);
  const timeBadgeClass = {
    quick: 'bg-time-quick text-time-quick-foreground',
    medium: 'bg-time-medium text-time-medium-foreground',
    long: 'bg-time-long text-time-long-foreground',
  }[timeCategory];

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
            <Badge variant="outline" className={cn('text-xs', timeBadgeClass)}>
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(task.timeRequired)}
            </Badge>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
};
