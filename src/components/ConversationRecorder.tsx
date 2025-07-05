
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Square, User, UserRound, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  speaker: 'doctor' | 'patient';
  content: string;
  timestamp: Date;
}

interface ConversationRecorderProps {
  patientInfo: { name: string; age: string; consent: boolean };
  onEndRecording: (messages: Message[]) => void;
}

export default function ConversationRecorder({ patientInfo, onEndRecording }: ConversationRecorderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<'doctor' | 'patient'>('doctor');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (speaker: 'doctor' | 'patient', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      speaker,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleTranscription = (text: string, speaker: 'doctor' | 'patient') => {
    addMessage(speaker, text);
    toast({
      title: "음성 인식 완료",
      description: `${speaker === 'doctor' ? '의사' : '환자'}: ${text.substring(0, 50)}...`,
    });
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
  } = useVoiceRecorder({
    onTranscription: handleTranscription,
    onError: handleError,
    currentSpeaker: currentSpeaker,
  });

  const handleStartRecording = async () => {
    try {
      await startRecording();
      toast({
        title: "녹음 시작",
        description: "음성 인식이 시작되었습니다.",
      });
    } catch (error) {
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
    if (isRecording) {
      stopRecording();
    }
    onEndRecording(messages);
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
              <Badge variant={isRecording ? "default" : "secondary"} className="bg-medical-success text-white">
                {isRecording ? "🔴 녹음 중" : isProcessing ? "🔄 처리 중" : "대기 중"}
              </Badge>
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 화자 선택 */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">현재 화자 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={currentSpeaker === 'doctor' ? 'default' : 'outline'}
              onClick={() => setCurrentSpeaker('doctor')}
              className="flex items-center space-x-2"
            >
              <UserRound className="w-4 h-4" />
              <span>의사</span>
            </Button>
            <Button
              variant={currentSpeaker === 'patient' ? 'default' : 'outline'}
              onClick={() => setCurrentSpeaker('patient')}
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>환자</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 대화 내용 */}
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
                <p>대화를 시작하려면 녹음 버튼을 눌러주세요</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.speaker === 'doctor' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {message.speaker === 'doctor' && (
                      <div className="p-2 rounded-full bg-medical-primary/10">
                        <UserRound className="w-4 h-4 text-medical-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.speaker === 'doctor'
                          ? 'bg-medical-light text-foreground'
                          : 'bg-medical-primary text-white'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {message.speaker === 'doctor' ? '의사' : '환자'}
                      </p>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.speaker === 'patient' && (
                      <div className="p-2 rounded-full bg-medical-success/10">
                        <User className="w-4 h-4 text-medical-success" />
                      </div>
                    )}
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
                대화 저장 시작
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
    </div>
  );
}
