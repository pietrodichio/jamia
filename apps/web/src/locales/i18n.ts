import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { format as formatDate } from 'date-fns';
import { it } from 'date-fns/locale/it';

import common from './it/common.json';
import events from './it/events.json';
import forms from './it/forms.json';
import dashboard from './it/dashboard.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    debug: false,
    resources: {
      it: {
        common,
        events,
        forms,
        dashboard,
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes values
      format: (value, format, lng) => {
        if (value instanceof Date) {
          return formatDate(value, format || 'dd/MM/yyyy', { locale: it });
        }
        return value;
      },
    },
    defaultNS: 'common',
    ns: ['common', 'events', 'forms', 'dashboard'],
  });

export default i18n;
