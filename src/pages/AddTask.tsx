import { useEffect, useState, useMemo } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { UnweightedTaskCard } from '@/components/UnweightedTaskCard';
import { Task, isTaskWeighted } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const AddTask = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Extract unique categories from tasks
  const categories = useMemo(() => {
    return Array.from(
      new Set(tasks.map((task) => task.category).filter((cat): cat is string => !!cat))
    ).sort();
  }, [tasks]);

  // Filter unweighted tasks (tasks that have at least one null value)
  const unweightedTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.urgency === null || task.importance === null || task.timeRequired === null
    );
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
        status: (task.status as 'To-do' | 'In Progress' | 'On-hold' | 'Done') || 'To-do',
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

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          description: taskData.description,
          urgency: taskData.urgency,
          importance: taskData.importance,
          time_required: taskData.timeRequired,
          category: taskData.category,
          status: taskData.status || 'To-do',
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        urgency: data.urgency as 1 | 2 | 3 | null,
        importance: data.importance as 1 | 2 | 3 | null,
        timeRequired: data.time_required as 1 | 2 | 3 | null,
        category: data.category || undefined,
        status: (data.status as 'To-do' | 'In Progress' | 'On-hold' | 'Done') || 'To-do',
        createdAt: new Date(data.created_at || new Date()),
      };

      setTasks((prev) => [...prev, newTask]);
      toast({
        title: 'Task added',
        description: 'Your task has been added.',
      });
    } catch (error: any) {
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const updateData: any = {};
      if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
      if (updates.importance !== undefined) updateData.importance = updates.importance;
      if (updates.timeRequired !== undefined) updateData.time_required = updates.timeRequired;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      );

      toast({
        title: 'Task updated',
        description: 'Task weights have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating task',
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Add New Task</h1>
        <p className="text-muted-foreground">
          Create tasks and weight them later, or set urgency, importance, and time upfront.
        </p>
      </div>

      <div data-onboarding="task-form">
        <TaskForm onAddTask={handleAddTask} existingCategories={categories} />
      </div>

      <div className="space-y-4" data-onboarding="unweighted-tasks">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Unweighted Tasks</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tasks that haven't been fully weighted yet. Set urgency, importance, and time to move them to the matrix.
          </p>
        </div>

        {unweightedTasks.length > 0 ? (
          <div className="grid gap-4">
            {unweightedTasks.map((task) => (
              <UnweightedTaskCard
                key={task.id}
                task={task}
                onUpdateTask={handleUpdateTask}
                onFullUpdateTask={handleFullUpdateTask}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                existingCategories={categories}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p className="text-lg">No unweighted tasks. All tasks are weighted!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTask;

