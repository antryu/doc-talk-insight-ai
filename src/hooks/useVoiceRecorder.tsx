
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceRecorderProps {
  onTranscription: (text: string, speaker: 'doctor' | 'patient') => void;
  onError: (error: string) => void;
}

export const useVoiceRecorder = ({ onTranscription, onError }: UseVoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('마이크 접근 권한이 필요합니다.');
    }
  }, [onTranscription, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      console.log('Calling Supabase Edge Function for voice-to-text...');
      
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: formData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('음성 변환에 실패했습니다.');
      }

      console.log('Voice-to-text result:', data);
      
      if (data?.text && data.text.trim()) {
        // 간단한 화자 구분 로직 (실제로는 더 정교한 로직 필요)
        const speaker = Math.random() > 0.5 ? 'doctor' : 'patient';
        onTranscription(data.text.trim(), speaker);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      onError('음성 변환 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
};
