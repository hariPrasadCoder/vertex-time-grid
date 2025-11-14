import { useEffect, useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from '@/components/TaskCard';
import { cn } from '@/lib/utils';
import { Circle, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';

// Component for each Kanban column
const KanbanColumn = ({ status, tasks, onComplete, onDelete, onUpdateTask, categories }: {
  status: TaskStatus;
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  categories: string[];
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'To-do':
        return <Circle className="h-5 w-5" />;
      case 'In Progress':
        return <PlayCircle className="h-5 w-5" />;
      case 'On-hold':
        return <PauseCircle className="h-5 w-5" />;
      case 'Done':
        return <CheckCircle2 className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'To-do':
        return 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30';
      case 'In Progress':
        return 'border-blue-300 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-950/20';
      case 'On-hold':
        return 'border-yellow-300 dark:border-yellow-800/30 bg-yellow-50 dark:bg-yellow-950/20';
      case 'Done':
        return 'border-green-300 dark:border-green-800/30 bg-green-50 dark:bg-green-950/20';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full transition-colors',
        getStatusColor(status),
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getStatusIcon(status)}
          <span>{status}</span>
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            ({tasks.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-[400px] max-h-[600px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onUpdateTask={onUpdateTask}
                  existingCategories={categories}
                  timeIconOnly={true}
                  hideStatus={true}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No tasks</p>
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
};

const Kanban = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const statuses: TaskStatus[] = ['To-do', 'In Progress', 'On-hold', 'Done'];

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'To-do': [],
      'In Progress': [],
      'On-hold': [],
      'Done': [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort each group by created date (newest first)
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    });

    return grouped;
  }, [tasks]);

  // Load tasks from database
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('completed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks: Task[] = (data || []).map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        urgency: task.urgency as 1 | 2 | 3 | null,
        importance: task.importance as 1 | 2 | 3 | null,
        timeRequired: task.time_required as 1 | 2 | 3 | null,
        category: task.category || undefined,
        status: (task.status as TaskStatus) || 'To-do',
        order: task.order || undefined,
        createdAt: new Date(task.created_at || new Date()),
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
      }));

      setTasks(formattedTasks);
    } catch (error: any) {
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const activeTask = tasks.find((t) => t.id === taskId);
    if (!activeTask) return;

    // Check if dropped on a status column
    const targetStatus = over.id as string;
    if (!statuses.includes(targetStatus as TaskStatus)) {
      // Check if dropped on another task (reordering within same status)
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask && targetTask.status === activeTask.status) {
        // Reordering within the same status column
        const statusTasks = tasksByStatus[activeTask.status];
        const oldIndex = statusTasks.findIndex((task) => task.id === taskId);
        const newIndex = statusTasks.findIndex((task) => task.id === over.id);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reorderedTasks = arrayMove(statusTasks, oldIndex, newIndex);
        
        // Update local state
        setTasks((prev) => {
          const updated = [...prev];
          reorderedTasks.forEach((task, index) => {
            const taskIndex = updated.findIndex((t) => t.id === task.id);
            if (taskIndex !== -1) {
              updated[taskIndex] = { ...updated[taskIndex], order: index + 1 };
            }
          });
          return updated;
        });

        // Update order in database
        try {
          const updatePromises = reorderedTasks.map((task, index) =>
            supabase
              .from('tasks')
              .update({ order: index + 1 })
              .eq('id', task.id)
          );
          await Promise.all(updatePromises);
        } catch (error: any) {
          toast({
            title: 'Error reordering tasks',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
      return;
    }

    // Moving to a different status column
    if (activeTask.status === targetStatus) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: targetStatus as TaskStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: targetStatus as TaskStatus } : task
        )
      );

      toast({
        title: 'Status updated',
        description: `Task moved to ${targetStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast({
        title: 'Task completed! 🎉',
        description: task?.title || 'Great work!',
      });
    } catch (error: any) {
      toast({
        title: 'Error completing task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast({
        title: 'Task deleted',
        description: 'The task has been removed.',
        variant: 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFullUpdateTask = async (taskId: string, taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskData.title,
          description: taskData.description,
          urgency: taskData.urgency,
          importance: taskData.importance,
          time_required: taskData.timeRequired,
          category: taskData.category,
          status: taskData.status,
        })
        .eq('id', taskId);

      if (error) throw error;

      const updatedTask: Task = {
        id: taskId,
        ...taskData,
        order: tasks.find((t) => t.id === taskId)?.order,
        createdAt: tasks.find((t) => t.id === taskId)?.createdAt || new Date(),
      };

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask : task))
      );

      toast({
        title: 'Task updated',
        description: 'Your task has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Extract unique categories from tasks
  const categories = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.category).filter((cat): cat is string => !!cat))
    ).sort();
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Kanban Board</h1>
        <p className="text-muted-foreground">
          Organize your tasks by status. Drag tasks between columns to update their status.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const statusTasks = tasksByStatus[status];
            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={statusTasks}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                onUpdateTask={handleFullUpdateTask}
                categories={categories}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3">
              <TaskCard
                task={activeTask}
                onComplete={() => {}}
                onDelete={() => {}}
                timeIconOnly={true}
                hideStatus={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Kanban;

