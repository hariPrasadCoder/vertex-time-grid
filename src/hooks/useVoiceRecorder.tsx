import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderOptions {
  minDuration?: number; // Minimum duration in seconds (default: 2)
  maxDuration?: number; // Maximum duration in seconds (default: 3600 = 60 min)
  onRecordingComplete?: (audioBlob: Blob) => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  error: string | null;
  audioBlob: Blob | null;
}

export const useVoiceRecorder = (options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn => {
  const { minDuration = 2, maxDuration = 3600, onRecordingComplete } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    durationIntervalRef.current = window.setInterval(() => {
      if (startTimeRef.current && !isPaused) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedTimeRef.current;
        setDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }
    }, 1000);
  }, [maxDuration, isPaused]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);
      pausedTimeRef.current = 0;
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder with preferred MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: selectedMimeType || 'audio/webm' 
        });
        setAudioBlob(audioBlob);
        
        // Calculate actual duration from timestamps (more reliable than state)
        let actualDuration = pausedTimeRef.current;
        if (startTimeRef.current) {
          actualDuration += Math.floor((Date.now() - startTimeRef.current) / 1000);
        }
        
        // Update duration state to final value
        setDuration(actualDuration);
        
        // Call completion handler regardless of duration
        onRecordingComplete?.(audioBlob);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.onerror = (event) => {
        setError('Recording error occurred');
        console.error('MediaRecorder error:', event);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimeRef.current = Date.now();
      startDurationTimer();
      
    } catch (err: any) {
      setError(err.message || 'Failed to start recording. Please check microphone permissions.');
      console.error('Error starting recording:', err);
    }
  }, [minDuration, maxDuration, onRecordingComplete, startDurationTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      startTimeRef.current = null;
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (startTimeRef.current) {
        pausedTimeRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
        startTimeRef.current = null;
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now();
      startDurationTimer();
    }
  }, [isRecording, isPaused, startDurationTimer]);

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    audioBlob,
  };
};

