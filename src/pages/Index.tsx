import { useState } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { MatrixView } from '@/components/MatrixView';
import { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setTasks((prev) => [...prev, newTask]);
    toast({
      title: 'Task added',
      description: 'Your task has been added to the matrix.',
    });
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    );
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    toast({
      title: 'Task completed! 🎉',
      description: task?.title || 'Great work!',
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    toast({
      title: 'Task deleted',
      description: 'The task has been removed.',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Vertex</h1>
          <p className="text-muted-foreground">
            3D Task Priority Matrix • Organize by urgency, importance, and time
          </p>
        </header>

        <TaskForm onAddTask={handleAddTask} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Matrix</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-quick" />
                <span>Quick (&lt;30m)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-medium" />
                <span>Medium (30m-2h)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-time-long" />
                <span>Long (&gt;2h)</span>
              </div>
            </div>
          </div>

          {tasks.length > 0 ? (
            <MatrixView
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
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
