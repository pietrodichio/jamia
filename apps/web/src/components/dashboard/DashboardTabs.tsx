import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Calendar } from 'lucide-react';

type DashboardSection = 'participate' | 'manage';

interface DashboardTabsProps {
  children: {
    participateContent: React.ReactNode;
    manageContent: React.ReactNode;
  };
}

/**
 * Dashboard tabs with URL-synchronized state
 * Section state persisted in URL via ?section= parameter
 * Default section is 'participate'
 */
export function DashboardTabs({ children }: DashboardTabsProps) {
  const { t } = useTranslation('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();

  // Read section from URL, default to participate
  const activeSection = (searchParams.get('section') || 'participate') as DashboardSection;

  // Set section in URL
  const setSection = (newSection: string) => {
    setSearchParams(
      (params) => {
        const newParams = new URLSearchParams(params);
        if (newSection === 'participate') {
          // Remove param for default value (cleaner URLs)
          newParams.delete('section');
        } else {
          newParams.set('section', newSection);
        }
        return newParams;
      },
      { replace: true }
    );
  };

  return (
    <Tabs value={activeSection} onValueChange={setSection}>
      <TabsList className="w-full mb-6" aria-label="Sezioni della dashboard">
        <TabsTrigger value="participate" className="flex-1">
          <Users className="mr-2 h-4 w-4" />
          {t('tabs.participate')}
        </TabsTrigger>
        <TabsTrigger value="manage" className="flex-1">
          <Calendar className="mr-2 h-4 w-4" />
          {t('tabs.manage')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="participate">
        {children.participateContent}
      </TabsContent>
      <TabsContent value="manage">
        {children.manageContent}
      </TabsContent>
    </Tabs>
  );
}
