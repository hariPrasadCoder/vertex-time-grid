import { useEffect, useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from '@/components/TaskCard';
import { Task, getQuadrant, isTaskWeighted } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortOption = 'time' | 'created' | 'title' | 'custom';

const Focus = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const { toast } = useToast();
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter to only show "Do First" tasks (urgent-important quadrant)
  // Apply category filter and sort based on selected option
  const doFirstTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      if (!isTaskWeighted(task)) return false;
      const quadrant = getQuadrant(task.urgency, task.importance);
      return quadrant === 'urgent-important';
    });

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((task) => task.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => {
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
  }, [tasks, selectedCategory, sortBy]);

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
        .order('order', { ascending: true, nullsLast: true })
        .order('time_required', { ascending: true, nullsLast: true })
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

  const handleDragStart = (event: DragStartEvent) => {
    const task = doFirstTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const oldIndex = doFirstTasks.findIndex((task) => task.id === active.id);
    const newIndex = doFirstTasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = arrayMove(doFirstTasks, oldIndex, newIndex);

    // Update order values for all reordered tasks
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

      // Update local state for all tasks (not just doFirstTasks)
      setTasks((prevTasks) => {
        const updatedTasks = [...prevTasks];
        orderUpdates.forEach(({ id, order }) => {
          const taskIndex = updatedTasks.findIndex((t) => t.id === id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], order };
          }
        });
        return updatedTasks;
      });
    } catch (error: any) {
      toast({
        title: 'Error reordering tasks',
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
        <div className="flex items-center gap-4 flex-wrap">
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

        {doFirstTasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={doFirstTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
            </SortableContext>
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

