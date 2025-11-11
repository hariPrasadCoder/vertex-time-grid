import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { Task, QuadrantType, getQuadrantWeights } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface MatrixQuadrantProps {
  id: QuadrantType;
  title: string;
  subtitle: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  existingCategories?: string[];
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
  onUpdateTask,
  onAddTask,
  existingCategories = [],
}: MatrixQuadrantProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const quadrantWeights = getQuadrantWeights(id);

  const handleAddTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    onAddTask(task);
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        className={cn(
          'flex flex-col min-h-[300px] transition-all duration-200',
          quadrantStyles[id],
          isOver && 'ring-2 ring-primary shadow-lg scale-[1.02]'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          {tasks.length > 0 ? (
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onUpdateTask={onUpdateTask}
                  existingCategories={existingCategories}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm gap-2">
              <p>Drop tasks here</p>
              <Button 
                size="sm" 
                variant="ghost" 
                className="mt-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Task in {title}</DialogTitle>
            <DialogDescription>
              Add a new task to this quadrant. Urgency, importance, and time weights are pre-filled based on the quadrant.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onAddTask={handleAddTask}
            existingCategories={existingCategories}
            initialUrgency={quadrantWeights.urgency}
            initialImportance={quadrantWeights.importance}
            initialTimeRequired={quadrantWeights.timeRequired}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
