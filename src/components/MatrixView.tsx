import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState, useMemo } from 'react';
import { MatrixQuadrant } from './MatrixQuadrant';
import { TaskCard } from './TaskCard';
import { Task, QuadrantType, getQuadrant } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface MatrixViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onFullUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
  existingCategories?: string[];
}

type SortOption = 'time' | 'created' | 'title' | 'custom';

export const MatrixView = ({
  tasks,
  onUpdateTask,
  onFullUpdateTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
  onTasksUpdate,
  existingCategories = [],
}: MatrixViewProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const { toast } = useToast();

  // Extract unique categories from tasks
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(tasks.map((task) => task.category).filter((cat): cat is string => !!cat))
    ).sort();
    return uniqueCategories;
  }, [tasks]);

  // Filter tasks by category
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') return tasks;
    return tasks.filter((task) => task.category === selectedCategory);
  }, [tasks, selectedCategory]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const activeTask = filteredTasks.find((t) => t.id === taskId);
    if (!activeTask) return;

    const quadrantIds: QuadrantType[] = ['urgent-important', 'urgent-not', 'not-urgent-important', 'not-urgent-not'];
    
    // Check if dropped on a task (reordering within quadrant) or on a quadrant (moving between quadrants)
    const targetTask = filteredTasks.find((t) => t.id === over.id);
    const sourceQuadrant = getQuadrant(activeTask.urgency, activeTask.importance);
    
    if (targetTask && sourceQuadrant === getQuadrant(targetTask.urgency, targetTask.importance)) {
      // Reordering within the same quadrant
      const quadrantTasks = getTasksByQuadrant(sourceQuadrant);
      const oldIndex = quadrantTasks.findIndex((task) => task.id === taskId);
      const newIndex = quadrantTasks.findIndex((task) => task.id === over.id);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reorderedTasks = arrayMove(quadrantTasks, oldIndex, newIndex);

      // Update order values for all reordered tasks in this quadrant
      const orderUpdates = reorderedTasks.map((task, index) => ({
        id: task.id,
        order: index + 1,
      }));

      try {
        // Batch update all tasks with their new order values
        const updatePromises = orderUpdates.map(({ id, order }) =>
          supabase
            .from('tasks')
            .update({ order })
            .eq('id', id)
        );

        await Promise.all(updatePromises);

        // Update local state
        if (onTasksUpdate) {
          const updatedTasks = [...tasks];
          orderUpdates.forEach(({ id, order }) => {
            const taskIndex = updatedTasks.findIndex((t) => t.id === id);
            if (taskIndex !== -1) {
              updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], order };
            }
          });
          onTasksUpdate(updatedTasks);
        }
      } catch (error: any) {
        toast({
          title: 'Error reordering tasks',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    // Moving between quadrants
    let targetQuadrant: QuadrantType;
    
    if (quadrantIds.includes(over.id as QuadrantType)) {
      // Dropped directly on a quadrant
      targetQuadrant = over.id as QuadrantType;
    } else if (targetTask) {
      // Dropped on a task in a different quadrant
      targetQuadrant = getQuadrant(targetTask.urgency, targetTask.importance);
    } else {
      return;
    }

    // Only move if it's a different quadrant
    if (sourceQuadrant === targetQuadrant) return;

    // Calculate new urgency and importance based on target quadrant
    let newUrgency: number;
    let newImportance: number;

    switch (targetQuadrant) {
      case 'urgent-important':
        newUrgency = 3;
        newImportance = 3;
        break;
      case 'urgent-not':
        newUrgency = 3;
        newImportance = 1;
        break;
      case 'not-urgent-important':
        newUrgency = 1;
        newImportance = 3;
        break;
      case 'not-urgent-not':
        newUrgency = 1;
        newImportance = 1;
        break;
    }

    onUpdateTask(taskId, { urgency: newUrgency, importance: newImportance });
  };

  const getTasksByQuadrant = (quadrant: QuadrantType) => {
    const quadrantTasks = filteredTasks.filter((task) => {
      const taskQuadrant = getQuadrant(task.urgency, task.importance);
      return taskQuadrant === quadrant;
    });
    
    // Sort based on selected sort option
    return quadrantTasks.sort((a, b) => {
      // Custom order (when user has manually reordered)
      if (sortBy === 'custom') {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        // Fallback to time if no custom order
        if (a.timeRequired !== null && b.timeRequired !== null) {
          return a.timeRequired - b.timeRequired;
        }
        if (a.timeRequired !== null) return -1;
        if (b.timeRequired !== null) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      // Sort by time required (<15 min, 15-60 min, 60+ min)
      if (sortBy === 'time') {
        if (a.timeRequired !== null && b.timeRequired !== null) {
          return a.timeRequired - b.timeRequired;
        }
        if (a.timeRequired !== null) return -1;
        if (b.timeRequired !== null) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      // Sort by created date (newest first)
      if (sortBy === 'created') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      // Sort by title (alphabetical)
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      return 0;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="category-filter" className="text-sm font-medium">
              Filter:
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-filter" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-by" className="text-sm font-medium">
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger id="sort-by" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time Required</SelectItem>
              <SelectItem value="created">Created Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="custom">Custom Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MatrixQuadrant
          id="urgent-important"
          title="Do First"
          subtitle="Urgent & Important"
          tasks={getTasksByQuadrant('urgent-important')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
          onUpdateTask={onFullUpdateTask}
          onAddTask={onAddTask}
          existingCategories={existingCategories}
        />
        <MatrixQuadrant
          id="not-urgent-important"
          title="Schedule"
          subtitle="Not Urgent & Important"
          tasks={getTasksByQuadrant('not-urgent-important')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
          onUpdateTask={onFullUpdateTask}
          onAddTask={onAddTask}
          existingCategories={existingCategories}
        />
        <MatrixQuadrant
          id="urgent-not"
          title="Delegate"
          subtitle="Urgent & Not Important"
          tasks={getTasksByQuadrant('urgent-not')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
          onUpdateTask={onFullUpdateTask}
          onAddTask={onAddTask}
          existingCategories={existingCategories}
        />
        <MatrixQuadrant
          id="not-urgent-not"
          title="Eliminate"
          subtitle="Not Urgent & Not Important"
          tasks={getTasksByQuadrant('not-urgent-not')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
          onUpdateTask={onFullUpdateTask}
          onAddTask={onAddTask}
          existingCategories={existingCategories}
        />
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3">
            <TaskCard
              task={activeTask}
              onComplete={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
