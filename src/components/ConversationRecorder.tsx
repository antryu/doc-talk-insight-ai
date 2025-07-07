
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Square, User, Loader2, Wifi, WifiOff } from "lucide-react";
import { useSimpleVoiceChat } from "@/hooks/useSimpleVoiceChat";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

interface ConversationRecorderProps {
  patientInfo: { name: string; age: string; consent: boolean };
  onEndRecording: (messages: Message[]) => void;
}

export default function ConversationRecorder({ patientInfo, onEndRecording }: ConversationRecorderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const addMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTranscription = (text: string) => {
    console.log('New transcription received:', text);
    addMessage(text);
  };

  const handleError = (error: string) => {
    console.error('Voice chat error:', error);
    toast({
      title: "오류",
      description: error,
      variant: "destructive",
    });
  };

  const {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  } = useSimpleVoiceChat({
    onTranscription: handleTranscription,
    onError: handleError,
  });

  const handleStartConversation = async () => {
    try {
      console.log('Starting simple voice recording...');
      await startRecording();
      setConversationStarted(true);
      toast({
        title: "음성 녹음 시작",
        description: "음성을 녹음하여 AI가 응답합니다.",
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      handleError('녹음을 시작할 수 없습니다.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({
      title: "음성 처리 중",
      description: "녹음된 음성을 분석하고 있습니다...",
    });
  };

  const handleEndSession = async () => {
    console.log('=== 진료종료 요청 ===');
    console.log('현재 메시지 수:', messages.length);
    
    if (isRecording) {
      stopRecording();
    }
    
    setIsEndingSession(true);
    
    try {
      // 1. Supabase 인증 사용자 확인
      if (!user) {
        throw new Error('사용자 인증이 필요합니다');
      }

      console.log('Saving patient record to database...');
      const { data: savedRecord, error: saveError } = await supabase
        .from('patient_records')
        .insert({
          user_id: user.id,
          patient_name: patientInfo.name,
          patient_age: patientInfo.age,
          conversation_data: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          }))
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      console.log('Patient record saved:', savedRecord);

      // 2. 의료법 검토 요청
      toast({
        title: "의료법 검토 중",
        description: "대화기록을 바탕으로 의료법을 검토하고 있습니다...",
      });

      const { data: reviewData, error: reviewError } = await supabase.functions.invoke('medical-law-review', {
        body: { 
          recordId: savedRecord.id,
          conversationData: messages,
          patientInfo: patientInfo
        }
      });

      if (reviewError) {
        console.error('Medical law review error:', reviewError);
        // 검토 실패해도 진료 종료는 진행
      } else {
        console.log('Medical law review completed:', reviewData);
        
        // 검토 결과를 데이터베이스에 업데이트
        await supabase
          .from('patient_records')
          .update({ medical_law_review: reviewData })
          .eq('id', savedRecord.id);
      }

      toast({
        title: "진료 종료 완료",
        description: "대화기록이 저장되고 의료법 검토가 완료되었습니다.",
      });

      // 3. 진료 종료 콜백 실행
      setTimeout(() => {
        console.log('진료 종료 - 최종 메시지 수:', messages.length);
        onEndRecording([...messages]);
      }, 1000);

    } catch (error) {
      console.error('Failed to end session:', error);
      toast({
        title: "진료 종료 오류",
        description: error instanceof Error ? error.message : '진료 종료 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsEndingSession(false);
    }
  };

  // 스크롤 자동 이동
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 환자 정보 헤더 */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-medical-light">
                <User className="w-5 h-5 text-medical-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">환자: {patientInfo.name}</CardTitle>
                <p className="text-sm text-muted-foreground">나이: {patientInfo.age}세</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isRecording ? "default" : "secondary"} className={isRecording ? "bg-medical-success text-white" : "bg-muted text-muted-foreground"}>
                {isRecording ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
                {isRecording ? "녹음 중" : "대기 중"}
              </Badge>
              {isProcessing && (
                <Badge variant="default" className="bg-medical-warning text-white">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  처리 중
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 대화 시작 전 또는 실시간 대화 기록 */}
      {!conversationStarted ? (
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="p-4 rounded-full bg-medical-primary/10">
                <Mic className="w-8 h-8 text-medical-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">실시간 AI 대화 준비</h3>
                <p className="text-muted-foreground mb-6">
                  AI와 실시간으로 음성 대화를 시작하세요. 자연스럽게 말하면 AI가 즉시 응답합니다.
                </p>
                <Button
                  onClick={handleStartConversation}
                  disabled={isProcessing}
                  className="bg-medical-success hover:bg-medical-success/90 text-white px-8 py-3"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  실시간 대화 시작
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-medical-primary" />
              <span>실시간 AI 대화 기록</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-background" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>실시간 음성 대화 내용이 여기에 표시됩니다...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="p-3 rounded-lg bg-medical-light/50 border">
                      <p className="text-sm mb-2">{message.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-center space-x-4 mt-6">
              {!isRecording ? (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleStartConversation}
                    disabled={isProcessing}
                    className="bg-medical-success hover:bg-medical-success/90 text-white px-6 py-3"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    대화 재개
                  </Button>
                  <Button
                    onClick={handleEndSession}
                    disabled={isEndingSession}
                    className="bg-medical-warning hover:bg-medical-warning/90 text-white px-6 py-3"
                  >
                    {isEndingSession ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 mr-2" />
                    )}
                    {isEndingSession ? "진료 종료 중..." : "진료 종료"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  variant="outline"
                  className="border-medical-warning text-medical-warning hover:bg-medical-warning/10 px-6 py-3"
                >
                  <Square className="w-4 h-4 mr-2" />
                  대화기록종료
                </Button>
              )}
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                음성 처리 중...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
