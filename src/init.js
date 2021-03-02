import i18next from 'i18next';
import app from './app';

export default () => {
  i18next
    .init({
      lng: 'ru', // Текущий язык
      debug: true,
      resources: {
        ru: { // Тексты конкретного языка
          translation: { // Так называемый namespace по умолчанию
            key: 'Привет мир!',
            urlRequired: 'Необходимо заполнить URL',
            wrongUrl: 'Неправильный URL',
            hasAlready: 'RSS уже существует',
            rssLoaded: 'RSS успешно загружен',
          },
        },
      },
    })
    .then(() => app());
};
