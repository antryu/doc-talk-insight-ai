
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PatientRegistration from "@/components/PatientRegistration";
import ConversationRecorder from "@/components/ConversationRecorder";
import { 
  Stethoscope, 
  Users, 
  FileText, 
  Activity, 
  LogOut, 
  User,
  Menu
} from "lucide-react";

interface PatientInfo {
  name: string;
  age: string;
  consent: boolean;
}

interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

export default function Index() {
  const [currentStep, setCurrentStep] = useState<'registration' | 'recording' | 'analysis'>('registration');
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleStartRecording = (info: PatientInfo) => {
    setPatientInfo(info);
    setCurrentStep('recording');
    toast({
      title: "진료 시작",
      description: `${info.name} 환자의 진료를 시작합니다.`,
    });
  };

  const handleEndRecording = (messages: Message[]) => {
    setConversation(messages);
    setCurrentStep('analysis');
    toast({
      title: "대화 기록 완료",
      description: "진료 대화가 성공적으로 저장되었습니다.",
    });
  };

  const handleStartNewConsultation = () => {
    setCurrentStep('registration');
    setPatientInfo(null);
    setConversation([]);
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "로그아웃",
      description: "성공적으로 로그아웃되었습니다.",
    });
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-medical-primary/10">
              <Stethoscope className="w-6 h-6 text-medical-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MediTalk Pro</h1>
              <p className="text-sm text-muted-foreground">환자 대화 기록 및 진료 관리</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user?.full_name || user?.email}</span>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    사용자 메뉴
                  </SheetTitle>
                  <SheetDescription>
                    {user?.full_name || user?.email}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleStartNewConsultation}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    새 진료 시작
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workflow */}
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 'registration' && (
              <PatientRegistration onStartRecording={handleStartRecording} />
            )}
            
            {currentStep === 'recording' && patientInfo && (
              <ConversationRecorder 
                patientInfo={patientInfo}
                onEndRecording={handleEndRecording}
              />
            )}
            
            {currentStep === 'analysis' && patientInfo && (
              <div className="space-y-6">
                <div className="p-6 bg-card rounded-lg border border-border">
                  <h3 className="text-lg font-semibold mb-4">진료 완료</h3>
                  <p className="text-muted-foreground mb-4">환자: {patientInfo.name} ({patientInfo.age}세)</p>
                  <p className="text-muted-foreground mb-6">대화 기록: {conversation.length}개 메시지</p>
                  
                  {conversation.length > 0 ? (
                    <div className="bg-background border rounded-lg p-4 mb-6">
                      <h4 className="font-medium mb-3">대화 기록</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {conversation.map((message) => (
                          <div key={message.id} className="p-3 rounded-lg bg-medical-light/50 border">
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-background border rounded-lg p-4 mb-6">
                      <p className="text-muted-foreground text-center">대화 기록이 없습니다.</p>
                    </div>
                  )}
                  
                  <Button onClick={handleStartNewConsultation} className="bg-medical-primary hover:bg-medical-primary/90">
                    새 진료 시작
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-medical-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">오늘 진료</p>
                    <p className="text-xl font-semibold text-foreground">0</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-medical-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">총 기록</p>
                    <p className="text-xl font-semibold text-foreground">0</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient History */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <h3 className="text-lg font-semibold mb-4">최근 환자 기록</h3>
              <p className="text-muted-foreground text-sm">아직 진료 기록이 없습니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
