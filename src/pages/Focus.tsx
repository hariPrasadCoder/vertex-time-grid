import { useEffect, useState, useMemo } from 'react';
import { DndContext } from '@dnd-kit/core';
import { TaskCard } from '@/components/TaskCard';
import { Task, getQuadrant, isTaskWeighted } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Focus = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Filter to only show "Do First" tasks (urgent-important quadrant)
  const doFirstTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!isTaskWeighted(task)) return false;
      const quadrant = getQuadrant(task.urgency, task.importance);
      return quadrant === 'urgent-important';
    });
  }, [tasks]);

  // Extract unique categories from tasks
  const categories = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.category).filter((cat): cat is string => !!cat))
    ).sort();
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
        })
        .eq('id', taskId);

      if (error) throw error;

      const updatedTask: Task = {
        id: taskId,
        ...taskData,
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Focus</h1>
        <p className="text-muted-foreground">
          Your "Do First" tasks - urgent and important. Focus on these high-priority items.
        </p>
      </div>

      <div className="space-y-4">
        {doFirstTasks.length > 0 ? (
          <DndContext>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {doFirstTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                  onUpdateTask={handleFullUpdateTask}
                  existingCategories={categories}
                />
              ))}
            </div>
          </DndContext>
        ) : (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <p className="text-lg">No "Do First" tasks at the moment.</p>
            <p className="text-sm mt-2">Add urgent and important tasks to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Focus;

