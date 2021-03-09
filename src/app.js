import _ from 'lodash';
import axios from 'axios';
import i18n from 'i18next';
import * as yup from 'yup';
import onChange from 'on-change';
import render from './view';

const validate = (data, localStorage, i18next) => {
  const schema = yup.object().shape({
    url: yup.string()
      .required(i18next.t('errors.required'))
      .url(i18next.t('errors.wrongUrl'))
      .test('hasAlready', i18next.t('errors.hasAlready'), (value, textContent) => {
        const { path, createError } = textContent;
        if (_.includes(localStorage.urls, value)) {
          return createError({ path, message: i18next.t('errors.hasAlready') });
        }
        return true;
      }),
  });

  return schema.validate({ url: data });
};

const parseSite = (url, proxy) => axios.get(proxy + url, { params: { disableCache: true } });

const parseData = (data, i18next) => {
  const parser = new DOMParser();
  const parsedData = parser.parseFromString(data, 'text/xml');
  const errorElement = parsedData.querySelector('parsererror');
  if (errorElement) {
    throw new Error(i18next.t('errors.parseError'));
  }
  return parsedData;
};

const getFeedAndPosts = (data) => {
  const titleFeed = data.querySelector('title').textContent;
  const descriptionFeed = data.querySelector('description').textContent;
  const items = data.querySelectorAll('item');
  const posts = [...items].map((post) => {
    const title = post.querySelector('title').textContent;
    const description = post.querySelector('description').textContent;
    const href = post.querySelector('link').textContent;
    return {
      id: _.uniqueId(),
      title,
      description,
      href,
    };
  });
  return {
    feed: { id: _.uniqueId(), title: titleFeed, description: descriptionFeed },
    posts,
  };
};

export default () => {
  const i18next = i18n.createInstance();
  i18next
    .init({
      lng: 'ru',
      debug: true,
      resources: {
        ru: {
          translation: {
            errors: {
              urlRequired: 'Необходимо заполнить URL',
              wrongUrl: 'Ссылка должна быть валидным URL',
              hasAlready: 'RSS уже существует',
              parseError: 'Ресурс не содержит валидный RSS',
              networkError: 'Ошибка сети',
            },
            rssLoaded: 'RSS успешно загружен',
            key: 'Привет мир!',
            btnWatch: 'Просмотр',
          },
        },
      },
    });

  const form = document.querySelector('#form-rss');
  const feedsElement = document.querySelector('.feeds');
  const postsElement = document.querySelector('.posts');
  const input = form.elements.host;
  const feedback = form.querySelector('.feedback');
  const titleModal = document.querySelector('#modalLabel');
  const descriptionModal = document.querySelector('#modalDescription');
  const link = document.querySelector('a[role="button"]');

  const elements = {
    feedsElement,
    postsElement,
    titleModal,
    descriptionModal,
    link,
  };

  const localStorage = {
    data: null,
    urls: [],
    feeds: [],
    posts: [],
  };
  const state = {
    formProcess: {
      url: '',
      error: '',
      state: '',
      valid: true,
    },
  };

  const submitButton = form.querySelector('[type="submit"]');

  const handleError = () => {
    feedback.textContent = state.formProcess.error;
  };

  const processStateHandler = (processState, watchedState, storage) => {
    switch (processState) {
      case 'sending':
        input.toggleAttribute('readonly');
        submitButton.disabled = true;
        break;
      case 'failed':
        input.removeAttribute('readonly');
        submitButton.disabled = false;
        handleError();
        state.formProcess.state = '';
        break;
      case 'finished':
        localStorage.urls.push(watchedState.formProcess.url);
        input.value = '';
        input.toggleAttribute('readonly');
        submitButton.disabled = false;
        feedback.textContent = i18next.t('rssLoaded');
        render(storage, elements, i18next);
        break;
      default:
        return null;
    }
    return null;
  };

  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'formProcess.state':
        processStateHandler(value, watchedState, localStorage);
        break;
      default:
        return null;
    }
    return null;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const hostName = formData.get('host');
    state.formProcess.url = hostName;
    const proxy = 'https://hexlet-allorigins.herokuapp.com/get?url=';

    validate(hostName, localStorage, i18next)
      .then(() => {
        watchedState.formProcess.state = 'sending';
        return parseSite(hostName, proxy);
      })
      .then((response) => parseData(response.data.contents, i18next))
      .then((data) => getFeedAndPosts(data))
      .then(({ feed, posts }) => {
        localStorage.feeds.push(feed);
        localStorage.posts = [...localStorage.posts, ...posts];
        watchedState.formProcess.state = 'finished';
      })
      .catch((error) => {
        if (!!error.isAxiosError && !error.response) {
          state.formProcess.error = i18next.t('errors.networkError');
        } else {
          state.formProcess.error = error.errors || error.message;
        }
        watchedState.formProcess.state = 'failed';
      });
  });
};
