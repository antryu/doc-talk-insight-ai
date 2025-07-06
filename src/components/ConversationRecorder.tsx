
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Square, User, Loader2 } from "lucide-react";
import { useLocalVoiceRecorder } from "@/hooks/useLocalVoiceRecorder";
import { useToast } from "@/hooks/use-toast";

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
  const [messagesAtEndRequest, setMessagesAtEndRequest] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTranscription = (text: string) => {
    addMessage(text);
  };

  const handleError = (error: string) => {
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
    stopRecording,
  } = useLocalVoiceRecorder({
    onTranscription: handleTranscription,
    onError: handleError,
  });

  const handleStartRecording = async () => {
    try {
      setConversationStarted(true);
      await startRecording();
      toast({
        title: "대화 시작",
        description: "음성 인식이 시작되었습니다.",
      });
    } catch (error) {
      setConversationStarted(false);
      handleError('녹음을 시작할 수 없습니다.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({
      title: "녹음 일시정지",
      description: "음성 인식이 일시정지되었습니다.",
    });
  };

  const handleEndSession = () => {
    console.log('=== 진료종료 요청 ===');
    console.log('현재 메시지 수:', messages.length);
    console.log('녹음 중:', isRecording);
    console.log('처리 중:', isProcessing);
    
    if (isRecording || isProcessing) {
      // 녹음 중이거나 처리 중이면 종료 대기 상태로 설정
      setIsEndingSession(true);
      setMessagesAtEndRequest(messages.length);
      
      if (isRecording) {
        console.log('녹음 중지 중...');
        stopRecording();
      }
      
      console.log('음성 인식 완료 대기 중...');
      
    } else {
      // 녹음도 처리도 안 하고 있으면 바로 종료
      console.log('바로 진료 종료');
      onEndRecording([...messages]);
    }
  };

  // 진료 종료 대기 중 처리 완료 감지
  useEffect(() => {
    if (isEndingSession) {
      console.log('진료 종료 대기 중 - 현재 메시지 수:', messages.length, '요청 시:', messagesAtEndRequest, 'isProcessing:', isProcessing, 'isRecording:', isRecording);
      
      // 새로운 메시지가 추가되었으면 즉시 종료
      if (messages.length > messagesAtEndRequest) {
        console.log('=== 새 메시지 감지됨! 진료 종료 실행 ===');
        console.log('최종 메시지들:', messages);
        
        setIsEndingSession(false);
        onEndRecording([...messages]);
      } 
      // 처리가 완료되었지만 새 메시지가 없으면 3초 더 대기
      else if (!isRecording && !isProcessing) {
        console.log('=== 음성 처리 완료, 3초 더 대기 중... ===');
        
        const timeoutId = setTimeout(() => {
          if (isEndingSession) { // 아직 대기 중이면 종료
            console.log('=== 대기 시간 완료, 진료 종료 실행 ===');
            console.log('최종 메시지들:', messages);
            setIsEndingSession(false);
            onEndRecording([...messages]);
          }
        }, 3000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, isEndingSession, messagesAtEndRequest, isProcessing, isRecording, onEndRecording]);

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
              <Badge variant={isRecording ? "default" : "secondary"} className="bg-medical-success text-white">
                {isRecording ? "🔴 녹음 중" : isProcessing ? "🔄 처리 중" : "대기 중"}
              </Badge>
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
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
                <h3 className="text-xl font-semibold mb-2">대화 준비</h3>
                <p className="text-muted-foreground mb-6">
                  대화 시작 버튼을 눌러 음성 인식을 시작하세요
                </p>
                <Button
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="bg-medical-success hover:bg-medical-success/90 text-white px-8 py-3"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  대화 시작
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
              <span>실시간 대화 기록</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full border rounded-lg p-4 bg-background" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>음성 인식 결과가 여기에 표시됩니다...</p>
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
                <Button
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  className="bg-medical-success hover:bg-medical-success/90 text-white px-6 py-3"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  녹음 재개
                </Button>
              ) : (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleStopRecording}
                    variant="outline"
                    disabled={isProcessing}
                    className="border-medical-warning text-medical-warning hover:bg-medical-warning/10"
                  >
                    <MicOff className="w-4 h-4 mr-2" />
                    일시 정지
                  </Button>
                  <Button
                    onClick={handleEndSession}
                    className="bg-medical-warning hover:bg-medical-warning/90 text-white"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    진료 종료
                  </Button>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                음성을 텍스트로 변환 중...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
