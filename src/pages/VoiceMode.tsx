import { useState } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Square, Pause, Play, Loader2, CheckCircle2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/TaskForm';
import { Task } from '@/lib/types';

// Backend API URL - should be in env variable
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

interface ExtractedTask {
  title: string;
  description?: string | null;
  urgency?: number | null;
  importance?: number | null;
  time_required?: number | null;
  category?: string | null;
}

interface VoiceProcessResponse {
  transcript: string;
  tasks: ExtractedTask[];
  processing_time: number;
}

const VoiceMode = () => {
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setProcessing(true);
    setTranscript(null);
    setExtractedTasks([]);
    setSelectedTasks(new Set());
    
    try {
      // Create FormData to send audio file
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
      formData.append('audio_file', audioFile);
      
      if (user?.id) {
        formData.append('user_id', user.id);
      }
      
      // Send to backend
      const response = await fetch(`${BACKEND_API_URL}/api/voice/process`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data: VoiceProcessResponse = await response.json();
      
      setTranscript(data.transcript);
      setExtractedTasks(data.tasks);
      
      // Auto-select all tasks
      setSelectedTasks(new Set(data.tasks.map((_, index) => index)));
      
      toast({
        title: 'Processing complete!',
        description: `Found ${data.tasks.length} task(s) in ${data.processing_time}s`,
      });
      
    } catch (error: any) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Error processing audio',
        description: error.message || 'Failed to process recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
  } = useVoiceRecorder({
    maxDuration: 3600, // 60 minutes
    onRecordingComplete: handleRecordingComplete,
  });

  const handleSaveTasks = async () => {
    if (!user || selectedTasks.size === 0) return;
    
    setSaving(true);
    
    try {
      const tasksToSave = Array.from(selectedTasks)
        .map(index => extractedTasks[index])
        .filter(task => task.title.trim());
      
      // Convert extracted tasks to database format
      const tasksToInsert = tasksToSave.map(task => ({
        user_id: user.id,
        title: task.title,
        description: task.description || null,
        urgency: task.urgency || null,
        importance: task.importance || null,
        time_required: task.time_required || null,
        category: task.category || null,
        status: 'To-do' as const,
      }));
      
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Tasks saved!',
        description: `Successfully added ${tasksToSave.length} task(s) to your list.`,
      });
      
      // Reset state
      setExtractedTasks([]);
      setSelectedTasks(new Set());
      setTranscript(null);
      
    } catch (error: any) {
      console.error('Error saving tasks:', error);
      toast({
        title: 'Error saving tasks',
        description: error.message || 'Failed to save tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskSelection = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const handleEditTask = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent task selection when clicking edit
    setEditingIndex(index);
  };

  const handleUpdateTask = (index: number, updatedTask: Omit<Task, 'id' | 'createdAt'>) => {
    const newTasks = [...extractedTasks];
    newTasks[index] = {
      title: updatedTask.title,
      description: updatedTask.description || null,
      urgency: updatedTask.urgency || null,
      importance: updatedTask.importance || null,
      time_required: updatedTask.timeRequired || null,
      category: updatedTask.category || null,
    };
    setExtractedTasks(newTasks);
    setEditingIndex(null);
    toast({
      title: 'Task updated',
      description: 'The task has been updated successfully.',
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getUrgencyLabel = (urgency: number | null | undefined): string => {
    if (!urgency) return 'Unweighted';
    return urgency === 1 ? 'Low' : urgency === 2 ? 'Med' : 'High';
  };

  const getImportanceLabel = (importance: number | null | undefined): string => {
    if (!importance) return 'Unweighted';
    return importance === 1 ? 'Low' : importance === 2 ? 'Med' : 'High';
  };

  const getTimeLabel = (time: number | null | undefined): string => {
    if (!time) return 'Unweighted';
    return time === 1 ? '<15 min' : time === 2 ? '15-60 min' : '60+ min';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Voice Mode</h1>
        <p className="text-muted-foreground">
          Speak naturally for up to 60 minutes. We'll convert your speech to text and extract actionable tasks.
        </p>
      </div>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Recording</CardTitle>
          <CardDescription>
            Click the microphone to start recording. Speak clearly and naturally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="h-20 w-20 rounded-full"
                disabled={processing}
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  size="lg"
                  variant="outline"
                  className="h-16 w-16 rounded-full"
                >
                  {isPaused ? (
                    <Play className="h-6 w-6" />
                  ) : (
                    <Pause className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="h-20 w-20 rounded-full"
                >
                  <Square className="h-8 w-8" />
                </Button>
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="text-center space-y-2">
              <div className="text-3xl font-mono font-bold">
                {formatTime(duration)}
              </div>
              <div className="text-sm text-muted-foreground">
                {isPaused ? 'Paused' : 'Recording...'}
              </div>
            </div>
          )}
          
          {processing && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing audio and extracting tasks...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Your spoken words converted to text</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{transcript}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Tasks */}
      {extractedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Extracted Tasks</CardTitle>
                <CardDescription>
                  Review and select tasks to add to your list ({selectedTasks.size} selected)
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveTasks}
                disabled={saving || selectedTasks.size === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Selected Tasks
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractedTasks.map((task, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTasks.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleTaskSelection(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {selectedTasks.has(index) ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold flex-1">{task.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleEditTask(index, e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {task.urgency && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                            Urgency: {getUrgencyLabel(task.urgency)}
                          </span>
                        )}
                        {task.importance && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">
                            Importance: {getImportanceLabel(task.importance)}
                          </span>
                        )}
                        {task.time_required && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 rounded">
                            Time: {getTimeLabel(task.time_required)}
                          </span>
                        )}
                        {task.category && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingIndex !== null && extractedTasks[editingIndex] && (
            <TaskForm
              task={{
                id: `temp-${editingIndex}`,
                title: extractedTasks[editingIndex].title,
                description: extractedTasks[editingIndex].description || undefined,
                urgency: extractedTasks[editingIndex].urgency as 1 | 2 | 3 | null | undefined,
                importance: extractedTasks[editingIndex].importance as 1 | 2 | 3 | null | undefined,
                timeRequired: extractedTasks[editingIndex].time_required as 1 | 2 | 3 | null | undefined,
                category: extractedTasks[editingIndex].category || undefined,
                status: 'To-do',
                createdAt: new Date(),
              }}
              onUpdateTask={(taskId, updatedTask) => {
                handleUpdateTask(editingIndex, updatedTask);
              }}
              onCancel={() => setEditingIndex(null)}
              onAddTask={() => {}} // Not used in edit mode
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoiceMode;

