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
import { useState } from 'react';
import { MatrixQuadrant } from './MatrixQuadrant';
import { TaskCard } from './TaskCard';
import { Task, QuadrantType, getQuadrant } from '@/lib/types';

interface MatrixViewProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export const MatrixView = ({
  tasks,
  onUpdateTask,
  onCompleteTask,
  onDeleteTask,
}: MatrixViewProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    const targetQuadrant = over.id as QuadrantType;

    // Calculate new urgency and importance based on target quadrant
    let newUrgency: number;
    let newImportance: number;

    switch (targetQuadrant) {
      case 'urgent-important':
        newUrgency = 5;
        newImportance = 5;
        break;
      case 'urgent-not':
        newUrgency = 5;
        newImportance = 2;
        break;
      case 'not-urgent-important':
        newUrgency = 2;
        newImportance = 5;
        break;
      case 'not-urgent-not':
        newUrgency = 2;
        newImportance = 2;
        break;
    }

    onUpdateTask(taskId, { urgency: newUrgency, importance: newImportance });
  };

  const getTasksByQuadrant = (quadrant: QuadrantType) => {
    return tasks.filter(
      (task) => getQuadrant(task.urgency, task.importance) === quadrant
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MatrixQuadrant
          id="urgent-important"
          title="Do First"
          subtitle="Urgent & Important"
          tasks={getTasksByQuadrant('urgent-important')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
        />
        <MatrixQuadrant
          id="not-urgent-important"
          title="Schedule"
          subtitle="Not Urgent & Important"
          tasks={getTasksByQuadrant('not-urgent-important')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
        />
        <MatrixQuadrant
          id="urgent-not"
          title="Delegate"
          subtitle="Urgent & Not Important"
          tasks={getTasksByQuadrant('urgent-not')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
        />
        <MatrixQuadrant
          id="not-urgent-not"
          title="Eliminate"
          subtitle="Not Urgent & Not Important"
          tasks={getTasksByQuadrant('not-urgent-not')}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
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
