import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Trash2, Tag, Pencil } from 'lucide-react';
import { Task, getTimeCategoryLabel, getUrgencyLabel, getImportanceLabel } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TaskForm } from './TaskForm';

interface UnweightedTaskCardProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onFullUpdateTask?: (taskId: string, task: Omit<Task, 'id' | 'createdAt'>) => void;
  existingCategories?: string[];
}

export const UnweightedTaskCard = ({
  task,
  onUpdateTask,
  onComplete,
  onDelete,
  onFullUpdateTask,
  existingCategories = [],
}: UnweightedTaskCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const handleWeightChange = (field: 'urgency' | 'importance' | 'timeRequired', value: string) => {
    const numValue = value === 'unweighted' ? null : (parseInt(value) as 1 | 2 | 3);
    onUpdateTask(task.id, { [field]: numValue });
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base leading-tight break-words mb-1">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            {task.category && (
              <Badge variant="secondary" className="text-xs mt-2">
                <Tag className="h-3 w-3 mr-1" />
                {task.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onFullUpdateTask && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onComplete(task.id)}
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Urgency</Label>
            <Select
              value={task.urgency?.toString() || 'unweighted'}
              onValueChange={(value) => handleWeightChange('urgency', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unweighted">Unweighted</SelectItem>
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Med</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Importance</Label>
            <Select
              value={task.importance?.toString() || 'unweighted'}
              onValueChange={(value) => handleWeightChange('importance', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unweighted">Unweighted</SelectItem>
                <SelectItem value="1">Low</SelectItem>
                <SelectItem value="2">Med</SelectItem>
                <SelectItem value="3">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Time Required</Label>
            <Select
              value={task.timeRequired?.toString() || 'unweighted'}
              onValueChange={(value) => handleWeightChange('timeRequired', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
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
      </CardContent>

      {onFullUpdateTask && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              task={task}
              onUpdateTask={(taskId, taskData) => {
                onFullUpdateTask(taskId, taskData);
                setIsEditDialogOpen(false);
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              existingCategories={existingCategories}
              onAddTask={() => {}} // Not used in edit mode
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

