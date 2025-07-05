import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { History, Search, Calendar, FileText, Brain } from "lucide-react";

interface PatientRecord {
  id: string;
  date: Date;
  messages: Array<{
    id: string;
    speaker: 'doctor' | 'patient';
    content: string;
    timestamp: Date;
  }>;
  diagnoses: Array<{
    disease: string;
    probability: number;
    symptoms: string[];
    recommendation: string;
  }>;
}

interface PatientHistoryProps {
  onNewPatient: () => void;
}

export default function PatientHistory({ onNewPatient }: PatientHistoryProps) {
  const [searchName, setSearchName] = useState("");
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // 시뮬레이션 데이터
  const mockRecords: PatientRecord[] = [
    {
      id: "1",
      date: new Date("2024-01-15"),
      messages: [
        {
          id: "1",
          speaker: "doctor",
          content: "안녕하세요. 어떤 증상으로 오셨나요?",
          timestamp: new Date("2024-01-15T09:00:00")
        },
        {
          id: "2",
          speaker: "patient",
          content: "목이 아프고 기침이 나요. 열도 있는 것 같아요.",
          timestamp: new Date("2024-01-15T09:01:00")
        }
      ],
      diagnoses: [
        {
          disease: "급성 인두염",
          probability: 85,
          symptoms: ["인후통", "기침", "미열"],
          recommendation: "충분한 휴식과 수분 섭취"
        }
      ]
    },
    {
      id: "2",
      date: new Date("2024-01-20"),
      messages: [
        {
          id: "3",
          speaker: "doctor",
          content: "지난번 처방받은 약은 어떠셨나요?",
          timestamp: new Date("2024-01-20T14:00:00")
        },
        {
          id: "4",
          speaker: "patient",
          content: "많이 나아졌어요. 기침은 거의 사라졌고 목도 덜 아파요.",
          timestamp: new Date("2024-01-20T14:01:00")
        }
      ],
      diagnoses: [
        {
          disease: "회복 단계",
          probability: 90,
          symptoms: ["증상 완화"],
          recommendation: "경과 관찰 지속"
        }
      ]
    }
  ];

  const handleSearch = () => {
    if (!searchName.trim()) return;
    
    setIsSearching(true);
    
    // 시뮬레이션: 실제로는 데이터베이스에서 검색
    setTimeout(() => {
      if (searchName.toLowerCase().includes('김')) {
        setPatientRecords(mockRecords);
      } else {
        setPatientRecords([]);
      }
      setIsSearching(false);
    }, 1000);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return "bg-medical-success";
    if (probability >= 60) return "bg-medical-warning";
    return "bg-muted";
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 검색 헤더 */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-medical-primary" />
            <span>환자 방문 기록 조회</span>
          </CardTitle>
          <CardDescription>
            환자 이름으로 과거 진료 기록을 검색할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search-name" className="text-sm font-medium">환자 이름</Label>
              <Input
                id="search-name"
                placeholder="환자 이름을 입력하세요 (예: 김철수)"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={!searchName.trim() || isSearching}
                className="bg-medical-primary hover:bg-medical-primary/90 text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? "검색 중..." : "검색"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 검색 결과 목록 */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">진료 기록 목록</CardTitle>
            <CardDescription>
              {patientRecords.length > 0 
                ? `${patientRecords.length}건의 진료 기록이 발견되었습니다`
                : "검색된 기록이 없습니다"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patientRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>환자 이름을 입력하고 검색해주세요</p>
                <p className="text-sm mt-2">예시: 김철수, 이영희</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {patientRecords.map((record) => (
                    <Card 
                      key={record.id}
                      className={`cursor-pointer transition-colors border ${
                        selectedRecord?.id === record.id 
                          ? 'border-medical-primary bg-medical-light' 
                          : 'border-border hover:border-medical-primary/50'
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-medical-primary" />
                            <span className="text-sm font-medium">
                              {formatDate(record.date)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {record.messages.length}개 대화
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          주요 진단: {record.diagnoses[0]?.disease || "분석 중"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* 선택된 기록 상세 보기 */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">진료 기록 상세</CardTitle>
            <CardDescription>
              선택한 진료의 대화 내용과 진단 결과를 확인할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedRecord ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>좌측에서 진료 기록을 선택해주세요</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {/* 대화 기록 */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>대화 기록</span>
                    </h4>
                    <div className="space-y-2 bg-background p-3 rounded border">
                      {selectedRecord.messages.map((message) => (
                        <div key={message.id} className="text-sm">
                          <span className={`font-medium ${
                            message.speaker === 'doctor' ? 'text-medical-primary' : 'text-medical-success'
                          }`}>
                            {message.speaker === 'doctor' ? '의사' : '환자'}:
                          </span>
                          <span className="ml-2 text-foreground">{message.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 진단 결과 */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3 flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>진단 결과</span>
                    </h4>
                    <div className="space-y-2">
                      {selectedRecord.diagnoses.map((diagnosis, index) => (
                        <div key={index} className="p-3 bg-background rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{diagnosis.disease}</span>
                            <Badge className={`${getProbabilityColor(diagnosis.probability)} text-white text-xs`}>
                              {diagnosis.probability}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{diagnosis.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 새 진료 시작 */}
      <div className="text-center">
        <Button
          onClick={onNewPatient}
          className="bg-medical-success hover:bg-medical-success/90 text-white px-8 py-3"
        >
          새 환자 진료 시작
        </Button>
      </div>
    </div>
  );
}