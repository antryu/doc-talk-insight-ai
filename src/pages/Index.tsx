import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientRegistration from "@/components/PatientRegistration";
import ConversationRecorder from "@/components/ConversationRecorder";
import DiagnosisAnalysis from "@/components/DiagnosisAnalysis";
import PatientHistory from "@/components/PatientHistory";
import { Stethoscope, Users, Brain, History } from "lucide-react";

interface Message {
  id: string;
  speaker: 'doctor' | 'patient';
  content: string;
  timestamp: Date;
}

interface Diagnosis {
  disease: string;
  probability: number;
  symptoms: string[];
  recommendation: string;
}

interface PatientInfo {
  name: string;
  age: string;
  consent: boolean;
}

type AppState = 'registration' | 'recording' | 'analysis' | 'history';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('registration');
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState("new-patient");

  const handleStartRecording = (info: PatientInfo) => {
    setPatientInfo(info);
    setCurrentState('recording');
  };

  const handleEndRecording = (messages: Message[]) => {
    setConversationMessages(messages);
    setCurrentState('analysis');
  };

  const handleSaveDiagnosis = (diagnoses: Diagnosis[]) => {
    // 여기서 실제로는 데이터베이스에 저장
    console.log('Saving diagnosis:', diagnoses);
    // 진료 완료 후 초기 상태로 돌아가기
    setCurrentState('registration');
    setPatientInfo(null);
    setConversationMessages([]);
  };

  const handleNewPatient = () => {
    setCurrentState('registration');
    setPatientInfo(null);
    setConversationMessages([]);
    setActiveTab("new-patient");
  };

  const renderCurrentView = () => {
    switch (currentState) {
      case 'registration':
        return <PatientRegistration onStartRecording={handleStartRecording} />;
      case 'recording':
        return patientInfo ? (
          <ConversationRecorder 
            patientInfo={patientInfo} 
            onEndRecording={handleEndRecording} 
          />
        ) : null;
      case 'analysis':
        return patientInfo ? (
          <DiagnosisAnalysis
            messages={conversationMessages}
            patientInfo={patientInfo}
            onSaveDiagnosis={handleSaveDiagnosis}
          />
        ) : null;
      default:
        return <PatientRegistration onStartRecording={handleStartRecording} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* 헤더 */}
      <header className="bg-card shadow-[var(--shadow-card)] border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gradient-medical">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">MediTalk Pro</h1>
                <p className="text-sm text-muted-foreground">환자 대화 기록 및 진료 관리 시스템</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2">
              <div className="px-3 py-1 bg-medical-light rounded-full">
                <span className="text-xs font-medium text-medical-primary">AI 진단 보조</span>
              </div>
              <div className="px-3 py-1 bg-success/10 rounded-full">
                <span className="text-xs font-medium text-success">실시간 음성 인식</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="new-patient" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>새 환자</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>방문 기록</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-patient" className="space-y-6">
            {/* 진료 프로세스 안내 */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2 text-xl">
                  <Brain className="w-6 h-6 text-medical-primary" />
                  <span>진료 프로세스 안내</span>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* 프로세스 단계 표시 */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
                  currentState === 'registration' 
                    ? 'bg-medical-primary text-white border-medical-primary' 
                    : 'bg-card border-border text-muted-foreground'
                }`}>
                  <span className="text-sm font-medium">1. 환자 정보 입력</span>
                </div>
                <div className="w-8 h-px bg-border"></div>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
                  currentState === 'recording' 
                    ? 'bg-medical-primary text-white border-medical-primary' 
                    : 'bg-card border-border text-muted-foreground'
                }`}>
                  <span className="text-sm font-medium">2. 대화 기록</span>
                </div>
                <div className="w-8 h-px bg-border"></div>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
                  currentState === 'analysis' 
                    ? 'bg-medical-primary text-white border-medical-primary' 
                    : 'bg-card border-border text-muted-foreground'
                }`}>
                  <span className="text-sm font-medium">3. AI 진단</span>
                </div>
              </div>
            </div>

            {/* 현재 단계 컨텐츠 */}
            {renderCurrentView()}
          </TabsContent>

          <TabsContent value="history">
            <PatientHistory onNewPatient={handleNewPatient} />
          </TabsContent>
        </Tabs>
      </main>

      {/* 푸터 */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            MediTalk Pro - 의료진을 위한 스마트 진료 솔루션 | AI 기반 진단 보조 시스템
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
