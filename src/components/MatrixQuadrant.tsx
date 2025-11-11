import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TaskCard } from './TaskCard';
import { Task, QuadrantType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MatrixQuadrantProps {
  id: QuadrantType;
  title: string;
  subtitle: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const quadrantStyles: Record<QuadrantType, string> = {
  'urgent-important': 'bg-quadrant-urgent-important border-red-200 dark:border-red-900',
  'urgent-not': 'bg-quadrant-urgent-not border-amber-200 dark:border-amber-900',
  'not-urgent-important': 'bg-quadrant-not-urgent-important border-green-200 dark:border-green-900',
  'not-urgent-not': 'bg-quadrant-not-urgent-not border-border',
};

export const MatrixQuadrant = ({
  id,
  title,
  subtitle,
  tasks,
  onComplete,
  onDelete,
}: MatrixQuadrantProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-h-[300px] transition-all duration-200',
        quadrantStyles[id],
        isOver && 'ring-2 ring-primary shadow-lg scale-[1.02]'
      )}
    >
      <CardHeader className="pb-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
            Drop tasks here
          </div>
        )}
      </CardContent>
    </Card>
  );
};
