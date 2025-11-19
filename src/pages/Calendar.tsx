import { useEffect, useState, useMemo } from 'react';
import { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  addMinutes,
  startOfDay
} from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  task: Task;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  color: string;
};

const HOUR_HEIGHT = 60; // Height in pixels for each hour
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 0 AM (midnight) to 11 PM
const START_HOUR = 0;
const END_HOUR = 24;

// Generate colors for tasks based on category or urgency/importance
const getTaskColor = (task: Task): string => {
  if (task.category) {
    // Generate a color based on category hash
    const hash = task.category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-teal-100 text-teal-800 border-teal-200',
    ];
    return colors[hash % colors.length];
  }
  
  // Default colors based on urgency/importance
  if (task.urgency === 3 && task.importance === 3) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (task.urgency === 3 || task.importance === 3) {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  return 'bg-blue-100 text-blue-800 border-blue-200';
};

const Calendar = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Calculate week dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

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

  // Process tasks into calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    
    tasks.forEach((task) => {
      if (!task.scheduledAt) return;
      
      const scheduledDate = new Date(task.scheduledAt);
      const hour = getHours(scheduledDate);
      const minute = getMinutes(scheduledDate);
      
      // Determine if it's an all-day event (tasks without specific time components)
      // Since we now show all 24 hours, we only mark as all-day if truly needed
      const isAllDay = false; // All events with scheduled_at will show in time grid
      
      // Calculate duration based on timeRequired
      let durationMinutes = 60; // Default 1 hour
      if (task.timeRequired === 1) durationMinutes = 15;
      else if (task.timeRequired === 2) durationMinutes = 60;
      else if (task.timeRequired === 3) durationMinutes = 120;
      
      const startTime = isAllDay 
        ? startOfDay(scheduledDate)
        : scheduledDate;
      
      const endTime = isAllDay
        ? startOfDay(scheduledDate)
        : addMinutes(startTime, durationMinutes);
      
      events.push({
        task,
        startTime,
        endTime,
        isAllDay,
        color: getTaskColor(task),
      });
    });
    
    return events;
  }, [tasks]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      if (event.isAllDay) {
        return isSameDay(event.startTime, day);
      }
      return isSameDay(event.startTime, day);
    });
  };

  // Get time-specific events for a day
  const getTimeEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      if (event.isAllDay) return false;
      return isSameDay(event.startTime, day);
    });
  };

  // Get all-day events for a day
  const getAllDayEventsForDay = (day: Date) => {
    return calendarEvents.filter((event) => {
      return event.isAllDay && isSameDay(event.startTime, day);
    });
  };

  // Calculate position and height for time-based events
  const getEventPosition = (event: CalendarEvent) => {
    if (event.isAllDay) return { top: 0, height: 0 };
    
    const startHour = getHours(event.startTime);
    const startMinute = getMinutes(event.startTime);
    const endHour = getHours(event.endTime);
    const endMinute = getMinutes(event.endTime);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;
    
    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;
    
    return { top, height: Math.max(height, 20) }; // Minimum height of 20px
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast({
        title: 'Task completed! 🎉',
        description: 'Great work!',
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
        .update({ scheduled_at: null })
        .eq('id', taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast({
        title: 'Task unscheduled',
        description: 'The task has been removed from the calendar.',
      });
    } catch (error: any) {
      toast({
        title: 'Error unscheduling task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  const weekRange = (() => {
    if (format(weekStart, 'MMM') === format(weekEnd, 'MMM')) {
      return format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'd, yyyy');
    } else if (format(weekStart, 'yyyy') === format(weekEnd, 'yyyy')) {
      return format(weekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d, yyyy');
    } else {
      return format(weekStart, 'MMM d, yyyy') + ' - ' + format(weekEnd, 'MMM d, yyyy');
    }
  })();

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem - 2rem)', maxHeight: 'calc(100vh - 4rem - 2rem)', minHeight: 0, overflow: 'hidden' }}>
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs sm:text-sm">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 sm:h-10 sm:w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 sm:h-10 sm:w-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm sm:text-lg font-medium px-2 min-w-[140px] sm:min-w-[180px]">
            {weekRange}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col border rounded-lg bg-background min-h-0 overflow-hidden">
        <div className="min-w-[800px] sm:min-w-full flex-shrink-0">
          {/* Header with day names */}
          <div className="bg-background border-b">
            <div className="grid grid-cols-8" style={{ gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))' }}>
              <div className="border-r p-1 sm:p-2 text-xs font-medium text-muted-foreground">
                <div className="hidden sm:block">GMT{format(new Date(), 'xxx')}</div>
                <div className="sm:hidden text-[10px]">TZ</div>
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r last:border-r-0 p-1 sm:p-2 text-center",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-sm sm:text-lg font-semibold mt-0.5 sm:mt-1",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All-day events row */}
          <div className="border-b bg-muted/30 flex-shrink-0">
            <div className="grid grid-cols-8" style={{ gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))' }}>
              <div className="border-r p-1 sm:p-2 text-[10px] sm:text-xs font-medium text-muted-foreground text-center">
                All Day
              </div>
              {weekDays.map((day) => {
                const allDayEvents = getAllDayEventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="border-r last:border-r-0 p-0.5 sm:p-1 min-h-[50px] sm:min-h-[60px] space-y-0.5 sm:space-y-1"
                  >
                    {allDayEvents.map((event) => (
                      <div
                        key={event.task.id}
                        onClick={() => handleTaskClick(event.task)}
                        className={cn(
                          "px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity border",
                          event.color
                        )}
                      >
                        <span className="truncate block">{event.task.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time grid - scrollable */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="min-w-[800px] sm:min-w-full">
            <div className="relative">
              <div className="grid grid-cols-8" style={{ gridTemplateColumns: '60px repeat(7, minmax(100px, 1fr))' }}>
                {/* Time column */}
                <div className="border-r sticky left-0 z-20 bg-background">
                  {TIME_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b h-[60px] flex items-start justify-end pr-1 sm:pr-2 pt-1"
                    >
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const timeEvents = getTimeEventsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className="border-r last:border-r-0 relative"
                    >
                      {/* Time slot grid lines */}
                      {TIME_SLOTS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b h-[60px]"
                        />
                      ))}

                      {/* Events */}
                      {timeEvents.map((event) => {
                        const { top, height } = getEventPosition(event);
                        return (
                          <div
                            key={event.task.id}
                            onClick={() => handleTaskClick(event.task)}
                            className={cn(
                              "absolute left-0.5 sm:left-1 right-0.5 sm:right-1 rounded px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs cursor-pointer hover:opacity-80 transition-opacity border z-10 overflow-hidden",
                              event.color
                            )}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              minHeight: '18px',
                            }}
                          >
                            <div className="font-medium truncate">{event.task.title}</div>
                            {height > 35 && event.task.description && (
                              <div className="text-[9px] sm:text-[10px] opacity-80 truncate mt-0.5">
                                {event.task.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.scheduledAt &&
                format(new Date(selectedTask.scheduledAt), 'EEEE, MMMM d, yyyy • h:mm a')}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>
              )}
              <div className="flex gap-2">
                {selectedTask.category && (
                  <Badge variant="outline">{selectedTask.category}</Badge>
                )}
                <Badge variant="secondary">{selectedTask.status}</Badge>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    handleCompleteTask(selectedTask.id);
                    setDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDeleteTask(selectedTask.id);
                    setDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Unschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
