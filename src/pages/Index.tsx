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
import {
  Stethoscope, 
  Settings, 
  Menu, 
  Users, 
  History, 
  LogOut, 
  FileText, 
  Brain, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import PatientRegistration from "@/components/PatientRegistration";
import ConversationRecorder from "@/components/ConversationRecorder";
import DiagnosisAnalysis from "@/components/DiagnosisAnalysis";
import SettingsDialog from "@/components/SettingsDialog";
import PatientPastRecords from "@/components/PatientPastRecords";

type PatientRecord = Tables<'patient_records'>;

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

// 중복 기록 제거 함수 (10분 이내에 생성된 유사한 기록들 중 가장 최근 것만 유지)
function removeDuplicateRecords(records: PatientRecord[]): PatientRecord[] {
  const grouped = new Map<string, PatientRecord[]>();
  
  // 10분 단위로 그룹화
  records.forEach(record => {
    const date = new Date(record.created_at);
    const tenMinuteInterval = Math.floor(date.getTime() / (10 * 60 * 1000)); // 10분 단위
    const key = `${record.patient_name}-${tenMinuteInterval}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  });
  
  // 각 그룹에서 가장 최근 기록만 선택
  const uniqueRecords: PatientRecord[] = [];
  grouped.forEach(group => {
    // 가장 최근 기록 선택
    const latest = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    uniqueRecords.push(latest);
  });
  
  // 날짜순으로 정렬
  return uniqueRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function Index() {
  const [currentStep, setCurrentStep] = useState<'registration' | 'recording' | 'analysis' | 'diagnosis'>('registration');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [medicalLawReview, setMedicalLawReview] = useState<any>(null);
  const [isReviewingLaw, setIsReviewingLaw] = useState(false);
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
    
    setCurrentRecordId(null);
    setConversation(messages);
    setCurrentStep('analysis');
    
    // 의료법 검토 시작
    if (messages.length > 0) {
      performMedicalLawReview(messages, patientInfo);
    }
    
    toast({
      title: "대화 기록 완료",
      description: "진료 대화가 성공적으로 저장되었습니다. 의료법 검토를 진행중입니다.",
    });
  };

  const handleStartNewConsultation = () => {
    setCurrentStep('registration');
    setPatientInfo(null);
    setConversation([]);
    setCurrentRecordId(null);
    setMedicalLawReview(null);
    setIsReviewingLaw(false);
    loadPatientRecords(); // 새 진료 시작 시 기록 새로고침
  };

  const loadPatientRecords = async () => {
    if (!user) return;
    
    try {
      const { data: records, error } = await supabase
        .from('patient_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (records) {
        // 중복 제거 후 최근 5개만 표시
        const uniqueRecords = removeDuplicateRecords(records);
        setRecentRecords(uniqueRecords.slice(0, 5));
        setTotalCount(records.length);
        
        // 오늘 진료 수 계산
        const today = new Date();
        const todayRecords = records.filter(record => {
          const recordDate = new Date(record.created_at);
          return recordDate.toDateString() === today.toDateString();
        });
        setTodayCount(todayRecords.length);
      }
    } catch (error) {
      console.error('Failed to load patient records:', error);
    }
  };

  const handleDiagnosisAnalysis = () => {
    setCurrentStep('diagnosis');
  };

  const handleSaveDiagnosis = async (diagnoses: any[]) => {
    // 진단 결과는 데이터베이스에 이미 저장되어 있음
    toast({
      title: "진단 결과 저장",
      description: "AI 진단 분석 결과가 저장되었습니다.",
    });
    loadPatientRecords(); // 기록 새로고침
  };

  // 의료법 검토 수행
  const performMedicalLawReview = async (messages: Message[], patient: PatientInfo) => {
    if (!user) return;
    
    setIsReviewingLaw(true);
    try {
      // 환자 기록 데이터 준비
      const conversationData = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      let recordId = currentRecordId;

      // 현재 기록 ID가 없으면 새로 저장
      if (!recordId) {
        console.log('=== 새로운 환자 기록 저장 ===');
        const { data: savedRecord, error: saveError } = await supabase
          .from('patient_records')
          .insert({
            user_id: user.id,
            patient_name: patient.name,
            patient_age: patient.age,
            conversation_data: conversationData
          })
          .select()
          .single();

        if (saveError) {
          console.error('Failed to save patient record:', saveError);
          throw new Error('환자 기록 저장에 실패했습니다');
        }

        recordId = savedRecord.id;
        setCurrentRecordId(recordId);
        console.log('환자 기록 저장 완료:', recordId);
      } else {
        console.log('=== 기존 환자 기록 업데이트 ===');
        // 기존 기록이 있으면 대화 데이터만 업데이트
        const { error: updateError } = await supabase
          .from('patient_records')
          .update({ conversation_data: conversationData })
          .eq('id', recordId);

        if (updateError) {
          console.error('Failed to update conversation data:', updateError);
        }
        console.log('대화 데이터 업데이트 완료:', recordId);
      }

      // 의료법 검토 요청
      const { data, error } = await supabase.functions.invoke('medical-law-review', {
        body: {
          recordId: recordId,
          conversationData: conversationData,
          patientInfo: {
            name: patient.name,
            age: patient.age,
            consent: patient.consent
          }
        }
      });

      if (error) throw error;
      
      // 검토 결과를 데이터베이스에 업데이트
      const { error: updateError } = await supabase
        .from('patient_records')
        .update({ medical_law_review: data })
        .eq('id', recordId);

      if (updateError) {
        console.error('Failed to update medical law review:', updateError);
      }
      
      setMedicalLawReview(data);
      toast({
        title: "의료법 검토 완료",
        description: "의료법 검토가 완료되었습니다.",
      });
    } catch (error) {
      console.error('Medical law review failed:', error);
      toast({
        title: "의료법 검토 실패",
        description: "의료법 검토 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsReviewingLaw(false);
    }
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
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
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
                    {user?.user_metadata?.full_name || user?.email}
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
              <div className="space-y-6">
                <ConversationRecorder 
                  patientInfo={patientInfo}
                  onEndRecording={handleEndRecording}
                />
                
                {/* 환자 과거 기록 표시 */}
                <PatientPastRecords 
                  patientName={patientInfo.name} 
                  currentRecordId={currentRecordId || undefined}
                />
              </div>
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
                  
                  {/* 의료법 검토 결과 */}
                  <div className="bg-background border rounded-lg p-4 mb-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      의료법 검토 결과
                    </h4>
                    {isReviewingLaw ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-medical-primary border-t-transparent rounded-full mr-3"></div>
                        <p className="text-muted-foreground">의료법 검토 중...</p>
                      </div>
                    ) : medicalLawReview ? (
                      <MedicalLawReviewDisplay data={medicalLawReview} />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">의료법 검토 결과가 없습니다.</p>
                    )}
                  </div>
                  
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
                            <span>대화 {Array.isArray(record.conversation_data) ? record.conversation_data.length : 0}개</span>
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

// 의료법 검토 결과 표시 컴포넌트
interface MedicalLawReviewDisplayProps {
  data: any;
}

function MedicalLawReviewDisplay({ data }: MedicalLawReviewDisplayProps) {
  let reviewData;
  try {
    reviewData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    reviewData = data;
  }

  // 실제 분석 내용 추출
  let analysisData = null;
  
  // Edge Function에서 이미 파싱된 데이터가 있는지 확인
  if (reviewData && reviewData.medicalActs && reviewData.compliance) {
    // 이미 파싱된 구조화된 데이터 사용
    analysisData = reviewData;
  } else if (reviewData?.rawAnalysis) {
    // 백업: rawAnalysis 필드가 있으면 파싱 시도
    try {
      const cleanJson = reviewData.rawAnalysis.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      analysisData = JSON.parse(cleanJson);
    } catch (error) {
      console.error('Failed to parse rawAnalysis:', error);
    }
  }

  const getComplianceStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
      case '준수':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '준수' };
      case 'warning':
      case '주의':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', label: '주의' };
      case 'violation':
      case '위반':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '위반' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-50', label: '미확인' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 검토 기본 정보 */}
      {reviewData?.reviewDate && (
        <div className="bg-medical-light/20 border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">검토 정보</h3>
          <div className="text-sm text-muted-foreground">
            <p>검토 일시: {new Date(reviewData.reviewDate).toLocaleString()}</p>
            {reviewData.conversationSummary && (
              <p>대화 요약: {reviewData.conversationSummary.messageCount}개 메시지, {reviewData.conversationSummary.textLength}자</p>
            )}
          </div>
        </div>
      )}

      {analysisData ? (
        <>
          {/* 법적 준수 상태 */}
          {analysisData.compliance && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">법적 준수 상태</h3>
              <div className="flex items-start gap-3">
                {(() => {
                  const compliance = getComplianceStatus(analysisData.compliance.status);
                  const Icon = compliance.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-full ${compliance.bg} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${compliance.color}`} />
                      </div>
                       <div className="flex-1">
                         <p className="font-medium text-foreground">{compliance.label}</p>
                         {analysisData.compliance.details && (
                           <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                             {analysisData.compliance.details}
                           </p>
                         )}
                         {analysisData.compliance.relatedArticles && Array.isArray(analysisData.compliance.relatedArticles) && analysisData.compliance.relatedArticles.length > 0 && (
                           <div className="mt-2">
                             <p className="text-xs text-muted-foreground font-medium">관련 조항:</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                               {analysisData.compliance.relatedArticles.map((article: string, i: number) => (
                                 <Badge key={i} variant="outline" className="text-xs">
                                   {article}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 확인된 의료 행위 */}
          {analysisData.medicalActs && Array.isArray(analysisData.medicalActs) && analysisData.medicalActs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">확인된 의료 행위</h3>
               <div className="space-y-2">
                 {analysisData.medicalActs.map((item: any, index: number) => (
                   <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                     <p className="text-sm text-green-700 leading-relaxed font-medium">
                       {typeof item === 'string' ? item : item.act}
                     </p>
                     {item.relatedArticles && Array.isArray(item.relatedArticles) && item.relatedArticles.length > 0 && (
                       <div className="mt-2">
                         <p className="text-xs text-green-600 font-medium">관련 조항:</p>
                         <div className="flex flex-wrap gap-1 mt-1">
                           {item.relatedArticles.map((article: string, i: number) => (
                             <Badge key={i} variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                               {article}
                             </Badge>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* 위험 요소 */}
          {analysisData.risks && Array.isArray(analysisData.risks) && analysisData.risks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">위험 요소</h3>
               <div className="space-y-2">
                 {analysisData.risks.map((item: any, index: number) => (
                   <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                     <div className="flex items-start gap-2">
                       <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                       <div className="flex-1">
                         <p className="text-sm text-red-700 leading-relaxed font-medium">
                           {typeof item === 'string' ? item : item.risk}
                         </p>
                         {item.relatedArticles && Array.isArray(item.relatedArticles) && item.relatedArticles.length > 0 && (
                           <div className="mt-2">
                             <p className="text-xs text-red-600 font-medium">관련 조항:</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                               {item.relatedArticles.map((article: string, i: number) => (
                                 <Badge key={i} variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                                   {article}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* 권장 사항 */}
          {analysisData.recommendations && Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">권장 사항</h3>
               <div className="space-y-2">
                 {analysisData.recommendations.map((item: any, index: number) => (
                   <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                     <div className="flex items-start gap-2">
                       <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                       <div className="flex-1">
                         <p className="text-sm text-blue-700 leading-relaxed font-medium">
                           {typeof item === 'string' ? item : item.recommendation}
                         </p>
                         {item.relatedArticles && Array.isArray(item.relatedArticles) && item.relatedArticles.length > 0 && (
                           <div className="mt-2">
                             <p className="text-xs text-blue-600 font-medium">관련 조항:</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                               {item.relatedArticles.map((article: string, i: number) => (
                                 <Badge key={i} variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                   {article}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* 기록 관련 주의사항 */}
          {analysisData.recordingNotes && Array.isArray(analysisData.recordingNotes) && analysisData.recordingNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">기록 관련 주의사항</h3>
               <div className="space-y-2">
                 {analysisData.recordingNotes.map((item: any, index: number) => (
                   <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                     <div className="flex items-start gap-2">
                       <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                       <div className="flex-1">
                         <p className="text-sm text-yellow-700 leading-relaxed font-medium">
                           {typeof item === 'string' ? item : item.note}
                         </p>
                         {item.relatedArticles && Array.isArray(item.relatedArticles) && item.relatedArticles.length > 0 && (
                           <div className="mt-2">
                             <p className="text-xs text-yellow-600 font-medium">관련 조항:</p>
                             <div className="flex flex-wrap gap-1 mt-1">
                               {item.relatedArticles.map((article: string, i: number) => (
                                 <Badge key={i} variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                   {article}
                                 </Badge>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-background border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">원본 검토 데이터</h3>
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(reviewData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}