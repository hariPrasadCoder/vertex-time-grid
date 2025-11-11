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
import { useState, useMemo } from 'react';
import { MatrixQuadrant } from './MatrixQuadrant';
import { TaskCard } from './TaskCard';
import { Task, QuadrantType, getQuadrant } from '@/lib/types';
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
  existingCategories?: string[];
}

export const MatrixView = ({
  tasks,
  onUpdateTask,
  onFullUpdateTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
  existingCategories = [],
}: MatrixViewProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    let targetQuadrant: QuadrantType;

    // Check if the drop target is a quadrant or a task
    const quadrantIds: QuadrantType[] = ['urgent-important', 'urgent-not', 'not-urgent-important', 'not-urgent-not'];
    
    if (quadrantIds.includes(over.id as QuadrantType)) {
      // Dropped directly on a quadrant
      targetQuadrant = over.id as QuadrantType;
    } else {
      // Dropped on a task - find which quadrant contains that task
      const targetTask = filteredTasks.find((t) => t.id === over.id);
      if (!targetTask) return; // Task not found, exit early
      targetQuadrant = getQuadrant(targetTask.urgency, targetTask.importance);
    }

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
    return filteredTasks.filter((task) => {
      const taskQuadrant = getQuadrant(task.urgency, task.importance);
      return taskQuadrant === quadrant;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {categories.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Label htmlFor="category-filter" className="text-sm font-medium">
            Filter by Category:
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
