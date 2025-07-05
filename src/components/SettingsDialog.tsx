import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Key, Download, Upload, User } from 'lucide-react';
import { useAuth } from '@/contexts/LocalAuthContext';
import { db, type Settings as SettingsType } from '@/lib/indexedDB';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  children: React.ReactNode;
}

export default function SettingsDialog({ children }: SettingsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadSettings();
    }
  }, [isOpen, user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const userSettings = await db.getSettings(user.id);
      if (userSettings) {
        setSettings(userSettings);
        setOpenaiKey(userSettings.openai_api_key || '');
        setElevenlabsKey(userSettings.elevenlabs_api_key || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      const newSettings = await db.saveSettings(user.id, {
        openai_api_key: openaiKey,
        elevenlabs_api_key: elevenlabsKey,
        theme: settings?.theme || 'light'
      });
      
      setSettings(newSettings);
      toast({
        title: '설정 저장 완료',
        description: 'API 키가 성공적으로 저장되었습니다.',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: '오류',
        description: '설정 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      const data = await db.exportData(user.id);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meditalk-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '데이터 내보내기 완료',
        description: '진료 기록이 성공적으로 내보내기되었습니다.',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: '오류',
        description: '데이터 내보내기 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;

    try {
      const file = event.target.files[0];
      const text = await file.text();
      await db.importData(user.id, text);
      
      toast({
        title: '데이터 가져오기 완료',
        description: '진료 기록이 성공적으로 가져와졌습니다.',
      });
    } catch (error) {
      console.error('Failed to import data:', error);
      toast({
        title: '오류',
        description: '데이터 가져오기 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            설정
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys">API 키</TabsTrigger>
            <TabsTrigger value="data">데이터 관리</TabsTrigger>
            <TabsTrigger value="profile">프로필</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  OpenAI API 키
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  음성 인식 기능을 사용하기 위해 필요합니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="elevenlabs-key" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  ElevenLabs API 키
                </Label>
                <Input
                  id="elevenlabs-key"
                  type="password"
                  placeholder="your-elevenlabs-api-key"
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  음성 합성 기능을 사용하기 위해 필요합니다.
                </p>
              </div>

              <Button onClick={saveSettings} className="w-full">
                설정 저장
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">데이터 백업</h3>
                <p className="text-sm text-muted-foreground">
                  진료 기록과 설정을 JSON 파일로 내보내거나 가져올 수 있습니다.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={exportData} variant="outline" className="justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  데이터 내보내기
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    데이터 가져오기
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-medical-light">
                  <User className="w-6 h-6 text-medical-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{user?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>가입일: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}