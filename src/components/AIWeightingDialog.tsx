import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Task, getUrgencyLabel, getImportanceLabel, getTimeCategoryLabel } from '@/lib/types';

interface TaskSuggestion {
  id: string;
  urgency: number;
  importance: number;
  time_required: number;
  category?: string;
}

interface AIWeightingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unweightedTasks: Task[];
  onApprove: (suggestions: TaskSuggestion[]) => void;
  onCancel: () => void;
}

export const AIWeightingDialog = ({
  open,
  onOpenChange,
  unweightedTasks,
  onApprove,
  onCancel,
}: AIWeightingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      // Get all tasks from Supabase to use as reference
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: allTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .is('completed_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Separate weighted and unweighted tasks
      const weightedTasks = (allTasks || []).filter(
        (task) => task.urgency !== null && task.importance !== null && task.time_required !== null
      );

      // Prepare request
      const unweightedTasksData = unweightedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || null,
        category: task.category || null,
      }));

      const referenceTasksData = weightedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description || null,
        urgency: task.urgency,
        importance: task.importance,
        time_required: task.time_required,
        category: task.category || null,
      }));

      // Call backend API
      const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND_API_URL}/api/tasks/weight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unweighted_tasks: unweightedTasksData,
          reference_tasks: referenceTasksData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      // Select all suggestions by default
      setSelectedSuggestions(new Set(data.suggestions?.map((s: TaskSuggestion) => s.id) || []));
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestions');
      console.error('Error generating suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuggestion = (taskId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleApprove = () => {
    const approvedSuggestions = suggestions.filter((s) => selectedSuggestions.has(s.id));
    onApprove(approvedSuggestions);
    onOpenChange(false);
    // Reset state
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setError(null);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    // Reset state
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setError(null);
  };

  const getTaskById = (id: string) => {
    return unweightedTasks.find((t) => t.id === id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Task Weighting & Categorization
          </DialogTitle>
          <DialogDescription>
            AI will analyze your unweighted tasks and suggest urgency, importance, time
            requirements, and categories based on your existing tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!suggestions.length && !loading && !error && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Ready to analyze {unweightedTasks.length} unweighted task
                {unweightedTasks.length !== 1 ? 's' : ''}?
              </p>
              <Button onClick={handleGenerateSuggestions} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate AI Suggestions
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                Analyzing tasks with AI... This may take a moment.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">Error generating suggestions</p>
              </div>
              <p className="text-sm text-destructive/80 mt-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSuggestions}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="space-y-3">
                {suggestions.map((suggestion) => {
                  const task = getTaskById(suggestion.id);
                  const isSelected = selectedSuggestions.has(suggestion.id);
                  
                  return (
                    <Card
                      key={suggestion.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleToggleSuggestion(suggestion.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium mb-1">{task?.title}</h4>
                            {task?.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                Urgency: {getUrgencyLabel(suggestion.urgency as 1 | 2 | 3)}
                              </Badge>
                              <Badge variant="secondary">
                                Importance: {getImportanceLabel(suggestion.importance as 1 | 2 | 3)}
                              </Badge>
                              <Badge variant="secondary">
                                Time: {getTimeCategoryLabel(suggestion.time_required as 1 | 2 | 3)}
                              </Badge>
                              {suggestion.category && (
                                <Badge variant="outline">{suggestion.category}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedSuggestions.size} of {suggestions.length} suggestions selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={selectedSuggestions.size === 0}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Selected Suggestions ({selectedSuggestions.size})
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

