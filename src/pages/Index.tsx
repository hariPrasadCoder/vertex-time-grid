import { useEffect, useState, useMemo } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { MatrixView } from '@/components/MatrixView';
import { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

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
        status: (task.status as 'To-do' | 'In Progress' | 'On-hold' | 'Done') || 'To-do',
        createdAt: new Date(task.created_at),
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        scheduledAt: task.scheduled_at ? new Date(task.scheduled_at) : undefined,
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
        urgency: data.urgency as 1 | 2 | 3,
        importance: data.importance as 1 | 2 | 3,
        timeRequired: data.time_required as 1 | 2 | 3,
        category: data.category || undefined,
        status: (data.status as 'To-do' | 'In Progress' | 'On-hold' | 'Done') || 'To-do',
        createdAt: new Date(data.created_at),
      };

      setTasks((prev) => [...prev, newTask]);
      toast({
        title: 'Task added',
        description: 'Your task has been added to the matrix.',
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
      const { error } = await supabase
        .from('tasks')
        .update({
          urgency: updates.urgency,
          importance: updates.importance,
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      );
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-8">
        <header className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold tracking-tight">Vertex</h1>
            <p className="text-muted-foreground">
              3D Task Priority Matrix • Organize by urgency, importance, and time
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <TaskForm onAddTask={handleAddTask} existingCategories={categories} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Matrix</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-quick" />
                <span>&lt;15 min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-medium" />
                <span>15-60 min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-long" />
                <span>60+ min</span>
              </div>
            </div>
          </div>

          {tasks.length > 0 ? (
            <MatrixView
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onFullUpdateTask={handleFullUpdateTask}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              existingCategories={categories}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg">No tasks yet. Add your first task above!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
