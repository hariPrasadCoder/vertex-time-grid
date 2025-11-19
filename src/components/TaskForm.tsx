import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Calendar } from 'lucide-react';
import { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface TaskFormProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  existingCategories?: string[];
  task?: Task; // Optional task for edit mode
  onUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void; // Optional update handler
  onCancel?: () => void; // Optional cancel handler for edit mode
  initialUrgency?: 1 | 2 | 3 | null; // Initial urgency value
  initialImportance?: 1 | 2 | 3 | null; // Initial importance value
  initialTimeRequired?: 1 | 2 | 3 | null; // Initial time required value
}

export const TaskForm = ({ 
  onAddTask, 
  existingCategories = [],
  task,
  onUpdateTask,
  onCancel,
  initialUrgency,
  initialImportance,
  initialTimeRequired,
}: TaskFormProps) => {
  const isEditMode = !!task;
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<1 | 2 | 3 | null>(initialUrgency ?? null);
  const [importance, setImportance] = useState<1 | 2 | 3 | null>(initialImportance ?? null);
  const [timeRequired, setTimeRequired] = useState<1 | 2 | 3 | null>(initialTimeRequired ?? null);
  const [category, setCategory] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');
  const [status, setStatus] = useState<'To-do' | 'In Progress' | 'On-hold' | 'Done'>('To-do');
  const [scheduleText, setScheduleText] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [parsingSchedule, setParsingSchedule] = useState(false);

  // Populate form when task is provided (edit mode)
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setUrgency(task.urgency);
      setImportance(task.importance);
      setTimeRequired(task.timeRequired);
      setCategory(task.category || '');
      setNewCategory('');
      setStatus(task.status);
      setScheduledAt(task.scheduledAt);
      // Format scheduled date for display
      if (task.scheduledAt) {
        const date = new Date(task.scheduledAt);
        const options: Intl.DateTimeFormatOptions = { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        };
        setScheduleText(date.toLocaleString('en-US', options));
      } else {
        setScheduleText('');
      }
    }
  }, [task]);

  // Update form when initial values change (for quadrant-based creation)
  useEffect(() => {
    if (!task && (initialUrgency !== undefined || initialImportance !== undefined || initialTimeRequired !== undefined)) {
      if (initialUrgency !== undefined) setUrgency(initialUrgency);
      if (initialImportance !== undefined) setImportance(initialImportance);
      if (initialTimeRequired !== undefined) setTimeRequired(initialTimeRequired);
    }
  }, [initialUrgency, initialImportance, initialTimeRequired, task]);

  const parseScheduleText = async (text: string) => {
    if (!text.trim()) {
      setScheduledAt(undefined);
      return;
    }

    setParsingSchedule(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('text', text);

      const response = await fetch(`${backendUrl}/api/date/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to parse date');
      }

      const data = await response.json();
      const parsedDate = new Date(data.datetime);
      setScheduledAt(parsedDate);
      
      // Update display text with formatted version
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      };
      setScheduleText(parsedDate.toLocaleString('en-US', options));
      
      toast({
        title: 'Schedule parsed',
        description: `Scheduled for ${parsedDate.toLocaleString('en-US', options)}`,
      });
    } catch (error: any) {
      toast({
        title: 'Could not parse schedule',
        description: error.message || 'Please try a different format (e.g., "tomorrow 5pm", "Next Fri 9am")',
        variant: 'destructive',
      });
      setScheduledAt(undefined);
    } finally {
      setParsingSchedule(false);
    }
  };

  const handleScheduleBlur = () => {
    if (scheduleText.trim()) {
      parseScheduleText(scheduleText);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = category === 'new' ? newCategory.trim() : category.trim();

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      urgency,
      importance,
      timeRequired,
      category: finalCategory || undefined,
      status,
      scheduledAt: scheduledAt,
    };

    if (isEditMode && task && onUpdateTask) {
      onUpdateTask(task.id, taskData);
      // Don't reset form in edit mode, let parent handle closing
    } else {
      onAddTask(taskData);
      // Reset form only in add mode
      setTitle('');
      setDescription('');
      setUrgency(null);
      setImportance(null);
      setTimeRequired(null);
      setCategory('');
      setNewCategory('');
      setStatus('To-do');
      setScheduleText('');
      setScheduledAt(undefined);
    }
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Save className="h-5 w-5" />
              Edit Task
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Add New Task
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency (Optional)</Label>
              <Select
                value={urgency?.toString() || 'unweighted'}
                onValueChange={(value) => setUrgency(value === 'unweighted' ? null : (parseInt(value) as 1 | 2 | 3))}
              >
                <SelectTrigger id="urgency">
                  <SelectValue placeholder="Unweighted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unweighted">Unweighted</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Med</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">Importance (Optional)</Label>
              <Select
                value={importance?.toString() || 'unweighted'}
                onValueChange={(value) => setImportance(value === 'unweighted' ? null : (parseInt(value) as 1 | 2 | 3))}
              >
                <SelectTrigger id="importance">
                  <SelectValue placeholder="Unweighted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unweighted">Unweighted</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Med</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeRequired">Time Required (Optional)</Label>
              <Select
                value={timeRequired?.toString() || 'unweighted'}
                onValueChange={(value) => setTimeRequired(value === 'unweighted' ? null : (parseInt(value) as 1 | 2 | 3))}
              >
                <SelectTrigger id="timeRequired">
                  <SelectValue placeholder="Unweighted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unweighted">Unweighted</SelectItem>
                  <SelectItem value="1">&lt;15 min</SelectItem>
                  <SelectItem value="2">15-60 min</SelectItem>
                  <SelectItem value="3">60+ min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'To-do' | 'In Progress' | 'On-hold' | 'Done')}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To-do">To-do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On-hold">On-hold</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select or add a category" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  // Include task's category if it exists and isn't in existingCategories
                  const allCategories = [...existingCategories];
                  if (task?.category && !allCategories.includes(task.category)) {
                    allCategories.push(task.category);
                  }
                  
                  if (allCategories.length > 0) {
                    return (
                      <>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ Add New Category</SelectItem>
                      </>
                    );
                  }
                  return <SelectItem value="new">+ Add New Category</SelectItem>;
                })()}
              </SelectContent>
            </Select>
            {category === 'new' && (
              <Input
                placeholder="Enter new category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule (Optional - e.g., "tomorrow 5pm", "Next Fri 9am")
            </Label>
            <Input
              id="schedule"
              placeholder="tomorrow 5pm, Next Fri 9am, Monday 2pm..."
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              onBlur={handleScheduleBlur}
              disabled={parsingSchedule}
            />
            {parsingSchedule && (
              <p className="text-xs text-muted-foreground">Parsing schedule...</p>
            )}
            {scheduledAt && !parsingSchedule && (
              <p className="text-xs text-muted-foreground">
                Scheduled for: {scheduledAt.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {isEditMode ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </>
              )}
            </Button>
            {isEditMode && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
