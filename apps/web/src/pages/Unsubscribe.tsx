import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type UnsubscribeState = 'loading' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('common');
  const [state, setState] = useState<UnsubscribeState>('loading');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    const unsubscribe = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8088';
        const response = await fetch(
          `${API_URL}/email-preferences/unsubscribe/${token}`,
          {
            method: 'POST',
          },
        );

        if (response.ok) {
          setState('success');
        } else {
          setState('error');
        }
      } catch (error) {
        console.error('[Unsubscribe] Failed to unsubscribe:', error);
        setState('error');
      }
    };

    unsubscribe();
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">{t('unsubscribe.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <h1 className="text-2xl font-bold">
                {t('unsubscribe.success.title')}
              </h1>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              {t('unsubscribe.success.message')}
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link to="/">{t('unsubscribe.success.backLink')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">
              {t('unsubscribe.error.title')}
            </h1>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {t('unsubscribe.error.message')}
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/profile">{t('unsubscribe.error.profileLink')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
