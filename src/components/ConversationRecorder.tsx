
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Square, User, Loader2, Wifi, WifiOff } from "lucide-react";
import { useRealtimeVoiceChat } from "@/hooks/useRealtimeVoiceChat";
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
    isConnected,
    isRecording,
    connectWebSocket,
    startRecording,
    stopRecording,
    disconnect
  } = useRealtimeVoiceChat({
    onTranscription: handleTranscription,
    onError: handleError,
  });

  const handleStartConversation = async () => {
    try {
      if (!isConnected) {
        console.log('Connecting to realtime voice chat...');
        await connectWebSocket();
        // 연결 대기
        setTimeout(async () => {
          await startRecording();
          setConversationStarted(true);
          toast({
            title: "실시간 대화 시작",
            description: "AI와 실시간 음성 대화가 시작되었습니다.",
          });
        }, 2000);
      } else {
        await startRecording();
        setConversationStarted(true);
        toast({
          title: "실시간 대화 시작", 
          description: "AI와 실시간 음성 대화가 시작되었습니다.",
        });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      handleError('대화를 시작할 수 없습니다.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({
      title: "음성 일시정지",
      description: "음성 인식이 일시정지되었습니다.",
    });
  };

  const handleEndSession = () => {
    console.log('=== 진료종료 요청 ===');
    console.log('현재 메시지 수:', messages.length);
    console.log('연결 상태:', isConnected);
    console.log('녹음 중:', isRecording);
    
    if (isRecording) {
      stopRecording();
    }
    
    disconnect();
    
    // 3초 후 진료 종료 (실시간 전송 완료 대기)
    setTimeout(() => {
      console.log('진료 종료 - 최종 메시지 수:', messages.length);
      onEndRecording([...messages]);
    }, 3000);
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
              <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-medical-success text-white" : "bg-muted text-muted-foreground"}>
                {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {isConnected ? "연결됨" : "연결 안됨"}
              </Badge>
              <Badge variant={isRecording ? "default" : "secondary"} className="bg-medical-primary text-white">
                {isRecording ? "🔴 실시간 대화 중" : "대기 중"}
              </Badge>
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
                  disabled={!isConnected && conversationStarted}
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
                <Button
                  onClick={handleStartConversation}
                  disabled={!isConnected}
                  className="bg-medical-success hover:bg-medical-success/90 text-white px-6 py-3"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  대화 재개
                </Button>
              ) : (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleStopRecording}
                    variant="outline"
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

            {!isConnected && conversationStarted && (
              <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                실시간 음성 연결 중...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
