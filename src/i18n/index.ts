import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import vi from './locales/vi.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import fil from './locales/fil.json';
import id from './locales/id.json';
import hi from './locales/hi.json';
import my from './locales/my.json';
import ru from './locales/ru.json';
import ko from './locales/ko.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      fr: { translation: fr },
      vi: { translation: vi },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      fil: { translation: fil },
      id: { translation: id },
      hi: { translation: hi },
      my: { translation: my },
      ru: { translation: ru },
      ko: { translation: ko },
    },
    lng: localStorage.getItem('lang') ?? 'en', // persiste escolha do usuário
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;