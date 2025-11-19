import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task, getTimeCategoryLabel, getUrgencyLabel, getImportanceLabel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Tag, CheckCircle2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const Profile = () => {
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Group tasks by completion date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    completedTasks.forEach((task) => {
      if (!task.completedAt) return;
      
      const date = new Date(task.completedAt);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
    
    return sortedDates.map((date) => ({
      date,
      tasks: grouped[date].sort((a, b) => {
        const timeA = a.completedAt?.getTime() || 0;
        const timeB = b.completedAt?.getTime() || 0;
        return timeB - timeA; // Most recent first
      }),
    }));
  }, [completedTasks]);

  // Load completed tasks from database
  useEffect(() => {
    if (user) {
      loadCompletedTasks();
    }
  }, [user]);

  const loadCompletedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

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
        scheduledAt: task.scheduled_at ? new Date(task.scheduled_at) : undefined,
      }));

      setCompletedTasks(formattedTasks);
    } catch (error: any) {
      toast({
        title: 'Error loading completed tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCompletionTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">History</h1>
        <p className="text-muted-foreground">
          View your task history and accomplishments.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-lg font-semibold">
              {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} completed
            </span>
          </div>
        </div>

        {tasksByDate.length > 0 ? (
          <div className="space-y-8">
            {tasksByDate.map(({ date, tasks }) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>{date}</span>
                  <span className="text-sm font-normal">
                    ({tasks.length} {tasks.length === 1 ? 'task' : 'tasks'})
                  </span>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tasks.map((task) => (
                    <Card 
                      key={task.id} 
                      className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <h3 className="font-medium text-sm leading-tight break-words line-through text-muted-foreground">
                                {task.title}
                              </h3>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {task.timeRequired !== null && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-xs',
                                task.timeRequired === 1 && 'bg-time-quick text-time-quick-foreground',
                                task.timeRequired === 2 && 'bg-time-medium text-time-medium-foreground',
                                task.timeRequired === 3 && 'bg-time-long text-time-long-foreground'
                              )}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {getTimeCategoryLabel(task.timeRequired)}
                            </Badge>
                          )}
                          {task.urgency !== null && (
                            <Badge variant="outline" className="text-xs">
                              Urgency: {getUrgencyLabel(task.urgency)}
                            </Badge>
                          )}
                          {task.importance !== null && (
                            <Badge variant="outline" className="text-xs">
                              Importance: {getImportanceLabel(task.importance)}
                            </Badge>
                          )}
                          {task.category && (
                            <Badge variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {task.category}
                            </Badge>
                          )}
                        </div>

                        {task.completedAt && (
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            Completed at {formatCompletionTime(task.completedAt)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No completed tasks yet.</p>
            <p className="text-sm mt-2">Complete your first task to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;





