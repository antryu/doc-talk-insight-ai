
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/LocalAuthContext";
import { useToast } from "@/hooks/use-toast";
import { db, type PatientRecord } from "@/lib/indexedDB";
import PatientRegistration from "@/components/PatientRegistration";
import ConversationRecorder from "@/components/ConversationRecorder";
import DiagnosisAnalysis from "@/components/DiagnosisAnalysis";
import SettingsDialog from "@/components/SettingsDialog";
import { 
  Stethoscope, 
  Users, 
  FileText, 
  Activity, 
  LogOut, 
  User,
  Menu,
  Settings,
  Brain,
  History
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
  const [currentStep, setCurrentStep] = useState<'registration' | 'recording' | 'analysis' | 'diagnosis'>('registration');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [recentRecords, setRecentRecords] = useState<PatientRecord[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
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

  const handleEndRecording = async (messages: Message[]) => {
    if (!patientInfo || !user) return;
    
    try {
      // IndexedDB에 진료 기록 저장
      const record = await db.createPatientRecord(
        user.id,
        patientInfo.name,
        patientInfo.age,
        messages
      );
      
      setCurrentRecordId(record.id); // 현재 기록 ID 저장
      setConversation(messages);
      setCurrentStep('analysis');
      toast({
        title: "대화 기록 완료",
        description: "진료 대화가 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      console.error('Failed to save patient record:', error);
      toast({
        title: "오류",
        description: "진료 기록 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleStartNewConsultation = () => {
    setCurrentStep('registration');
    setPatientInfo(null);
    setConversation([]);
    setCurrentRecordId(null); // 현재 기록 ID 초기화
    loadPatientRecords(); // 새 진료 시작 시 기록 새로고침
  };

  const loadPatientRecords = async () => {
    if (!user) return;
    
    try {
      const records = await db.getPatientRecords(user.id);
      setRecentRecords(records.slice(0, 5)); // 최근 5개만 표시
      setTotalCount(records.length);
      
      // 오늘 진료 수 계산
      const today = new Date();
      const todayRecords = records.filter(record => {
        const recordDate = new Date(record.created_at);
        return recordDate.toDateString() === today.toDateString();
      });
      setTodayCount(todayRecords.length);
    } catch (error) {
      console.error('Failed to load patient records:', error);
    }
  };

  const handleDiagnosisAnalysis = () => {
    setCurrentStep('diagnosis');
  };

  const handleSaveDiagnosis = async (diagnoses: any[]) => {
    if (currentRecordId) {
      try {
        await db.updatePatientRecordWithDiagnoses(currentRecordId, diagnoses);
        toast({
          title: "진단 결과 저장",
          description: "AI 진단 분석 결과가 저장되었습니다.",
        });
      } catch (error) {
        console.error('Failed to save diagnosis:', error);
        toast({
          title: "오류", 
          description: "진단 결과 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
    loadPatientRecords(); // 기록 새로고침
  };

  // 컴포넌트 마운트 시 환자 기록 로드
  useEffect(() => {
    if (user) {
      loadPatientRecords();
    }
  }, [user]);

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
              <h1 className="text-xl font-bold text-foreground">MedinaLab Pro</h1>
              <p className="text-sm text-muted-foreground">환자 대화 기록 및 진료 관리</p>
            </div>
          </div>
          
            <div className="flex items-center space-x-4">
              <SettingsDialog>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </SettingsDialog>
              
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
                  <Link to="/patient-history" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <History className="w-4 h-4 mr-2" />
                      환자 기록 관리
                    </Button>
                  </Link>
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
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        음성인식 대화기록
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {conversation.map((message, index) => (
                          <div key={message.id} className="p-3 rounded-lg bg-medical-light/50 border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-medical-primary">
                                #{index + 1} 음성인식 결과
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
                        총 {conversation.length}개의 음성인식 결과가 기록되었습니다.
                      </div>
                    </div>
                  ) : (
                    <div className="bg-background border rounded-lg p-4 mb-6">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        음성인식 대화기록
                      </h4>
                      <p className="text-muted-foreground text-center py-8">음성인식 결과가 없습니다.</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleDiagnosisAnalysis} 
                      className="bg-medical-primary hover:bg-medical-primary/90 text-white"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      예상 병명 분석
                    </Button>
                    <Button 
                      onClick={handleStartNewConsultation} 
                      variant="outline"
                    >
                      새 진료 시작
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 'diagnosis' && patientInfo && conversation.length > 0 && (
              <DiagnosisAnalysis 
                messages={conversation.map(msg => ({
                  id: msg.id,
                  speaker: 'patient' as const,
                  content: msg.content,
                  timestamp: msg.timestamp
                }))}
                patientInfo={patientInfo}
                onSaveDiagnosis={handleSaveDiagnosis}
                onBackToHome={handleStartNewConsultation}
              />
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
                    <p className="text-xl font-semibold text-foreground">{todayCount}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-medical-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">총 기록</p>
                    <p className="text-xl font-semibold text-foreground">{totalCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient History */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">최근 환자 기록</h3>
                <Link to="/patient-history">
                  <Button variant="outline" size="sm">
                    전체 보기
                  </Button>
                </Link>
              </div>
              {recentRecords.length > 0 ? (
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <Link 
                      key={record.id} 
                      to={`/patient-record/${record.id}`}
                      className="block hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="bg-background border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{record.patient_name}</h4>
                          <span className="text-xs text-muted-foreground">
                            {record.patient_age}세
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <span>대화 {record.conversation.length}개</span>
                            {record.diagnoses && record.diagnoses.length > 0 && (
                              <Badge className="bg-medical-success text-white text-xs px-1 py-0">
                                진단완료
                              </Badge>
                            )}
                          </div>
                          <span>{new Date(record.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">아직 진료 기록이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
