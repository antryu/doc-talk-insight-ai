import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Calendar, FileText, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";

type PatientRecord = Tables<'patient_records'>;

interface PatientPastRecordsProps {
  patientName: string;
  currentRecordId?: string;
}

export default function PatientPastRecords({ patientName, currentRecordId }: PatientPastRecordsProps) {
  const [pastRecords, setPastRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientHistory();
  }, [patientName]);

  const loadPatientHistory = async () => {
    setLoading(true);
    try {
      const { data: records, error } = await supabase
        .from('patient_records')
        .select('*')
        .eq('patient_name', patientName)
        .neq('id', currentRecordId || '') // 현재 진료 기록 제외
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPastRecords(records || []);
    } catch (error) {
      console.error('Failed to load patient history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-medical-primary" />
            <span>{patientName} 환자의 과거 기록</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-medical-primary border-t-transparent rounded-full"></div>
            <span className="ml-2 text-muted-foreground">기록을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5 text-medical-primary" />
          <span>{patientName} 환자의 과거 기록</span>
          <Badge variant="secondary" className="ml-auto">
            {pastRecords.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pastRecords.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">과거 기록이 없습니다</h3>
            <p className="text-muted-foreground">
              {patientName} 환자는 신규 환자로 과거 진료 기록이 존재하지 않습니다.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {pastRecords.map((record, index) => (
                <div key={record.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-medical-primary" />
                        <span className="text-sm font-medium">
                          {new Date(record.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{pastRecords.length - index}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(record.created_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>
                            {record.conversation_data && Array.isArray(record.conversation_data) 
                              ? `${record.conversation_data.length}개 음성기록`
                              : '음성기록 없음'
                            }
                          </span>
                        </div>
                      </div>

                      {/* 의료법 검토 상태 */}
                      <div className="flex items-center space-x-2 mb-2">
                        {record.medical_law_review ? (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                            의료법 검토 완료
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            의료법 검토 미완료
                          </Badge>
                        )}
                      </div>

                      {/* 대화 내용 미리보기 */}
                      {record.conversation_data && Array.isArray(record.conversation_data) && record.conversation_data.length > 0 && (
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                          <p className="line-clamp-2">
                            {(() => {
                              const firstMessage = record.conversation_data[0] as any;
                              const content = firstMessage?.content || '내용 없음';
                              return content.length > 100 ? `${content.substring(0, 100)}...` : content;
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Link to={`/patient-record/${record.id}`}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}