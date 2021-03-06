import _ from 'lodash';
import axios from 'axios';
import i18n from 'i18next';
import * as yup from 'yup';
import onChange from 'on-change';

const validate = (data, localStorage, i18next) => {
  const schema = yup.object().shape({
    url: yup.string()
      .required(i18next.t('required'))
      .url(i18next.t('wrongUrl'))
      .test('test-name', i18next.t('hasAlready'), function isInclude(value) {
        const { path, createError } = this;
        if (_.includes(localStorage.urls, value)) {
          return createError({ path, message: i18next.t('hasAlready') });
        }
        return true;
      }),
  });

  return schema.validate({ url: data });
};

const parseData = (data, i18next) => {
  console.log('i18', i18next.t('parseError'))
  const parser = new DOMParser();
  const parsedData = parser.parseFromString(data, 'text/xml');
  const errorElement = parsedData.querySelector('parsererror');
  if (errorElement) {
    throw new Error(i18next.t('parseError'));
  }
  return parsedData;
};

const getFeedAndPosts = (data) => {
  const title = data.querySelector('title').textContent;
  const description = data.querySelector('description').textContent;
  const items = data.querySelectorAll('item');
  const posts = [...items].map((el) => ({
    id: _.uniqueId(),
    title: el.children[0].textContent,
    description: el.children[1].textContent,
    url: el.children[2].textContent,
  }));
  return {
    feed: { id: _.uniqueId(), title, description },
    posts,
  };
};

const parseSite = (url) => {
  console.log('ParseSite');
  
  return fetch(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}`);
};

const render = (storage) => {
  const renderFeeds = (data) => data.map(({ title, description }) => (`
      <li class="list-group-item">
        <h3>${title}</h3>
        <p>${description}</p>
      </li>`));
  const renderPosts = (data) => data.map(({ title, url }) => (`
    <li class="list-group-item d-flex justify-content-between align-items-start">
      <a href="${url}" class="font-weight-bold" target="_blank" rel="noopener noreferrer">
        ${title}
      </a>
      <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#modal">Просмотр</button>
    </li>`));

  const feeds = document.querySelector('.feeds');
  const posts = document.querySelector('.posts');

  feeds.innerHTML = `<h2>Feeds</h2>
    <ul class="list-group mb-5">
      ${renderFeeds(storage.feeds).join('')}
    </ul>`;
  posts.innerHTML = `<h2>Posts</h2>
    <ul class="list-group">
      ${renderPosts(storage.posts).join('')}
    </ul>`;
};

export default () => {
  const i18next = i18n.createInstance();
  i18next
    .init({
      lng: 'ru', // Текущий язык
      debug: true,
      resources: {
        ru: { // Тексты конкретного языка
          translation: { // Так называемый namespace по умолчанию
            key: 'Привет мир!',
            urlRequired: 'Необходимо заполнить URL',
            wrongUrl: 'Ссылка должна быть валидным URL',
            hasAlready: 'RSS уже существует',
            rssLoaded: 'RSS успешно загружен',
            parseError: 'Ресурс не содержит валидный RSS',
            networkError: 'Ошибка сети',
          },
        },
      },
    });
  console.log('It work');
  const form = document.querySelector('#form-rss');
  const input = form.elements.host;
  const feedback = form.querySelector('.feedback');

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

  const updateData = (data, storage) => {
    const newStorage = { ...storage };
    const { feed, posts } = data;
    newStorage.feeds.push(feed);
    newStorage.posts = [...newStorage.posts, ...posts];
    render(newStorage);
    input.value = '';
  };

  const handleError = () => {
    console.log('handleError', state.formProcess.error)
    feedback.textContent = state.formProcess.error;
    console.log('feedback', feedback.textContent);
  };

  const processStateHandler = (processState, watchedState, storage) => {
    switch (processState) {
      case 'sending':
        console.log('processSending');
        submitButton.disabled = true;
        axios.get(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(state.formProcess.url)}`)
          .then((response) => {
            console.log('response', response);
            console.log('Response Ok');
            return response.data;
          })
          .then((data) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, 'text/xml');
            return doc;
          })
          .then((data) => {
            console.log('Finished');
            localStorage.data = data;
            localStorage.urls.push(state.formProcess.url);
            watchedState.formProcess.state = 'finished';
          })
          .catch((error) => {
            state.formProcess.errors.push(error);
            watchedState.formProcess.state = 'failed';
          });
        console.log('After Promise')
        feedback.textContent = i18next.t('rssLoaded');
        break;
      case 'failed':
        console.log('Обработка ошибок');
        handleError();
        state.formProcess.state = '';
        break;
      case 'finished':
        localStorage.urls.push(watchedState.formProcess.url);
        input.value = '';
        feedback.textContent = i18next.t('rssLoaded');
        //submitButton.disabled = false;
        //updateData(parseData(storage.data), storage);
        break;
      default:
        return null;
    }
    return null;
  };

  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'formProcess.valid':
        input.classList.add('is-invalid');
        feedback.innerHTML = state.formProcess.error.errors[0];
        break;
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
      .then(() => axios.get(proxy + state.formProcess.url, { params: { disableCache: true } }))
      .then((response) => {
        console.log('ss')
        watchedState.formProcess.state = 'finished';
        return parseData(response.data.contents, i18next);
      })
      .then((data) => getFeedAndPosts(data))
      .then(({ feed, posts }) => {
        localStorage.feeds.push(feed);
        localStorage.posts = [...localStorage.posts, ...posts];
        console.log('update');
      })
      .catch((error) => {
        console.log('Error', error)
        console.log(localStorage)
        if (error.message === 'Network Error') {
          state.formProcess.error = i18next.t('networkError');
        } else {
          state.formProcess.error = error.errors || error.message;
        }
        watchedState.formProcess.state = 'failed';
        console.log('1234', feedback.textContent)
        console.log(feedback)
        console.log(state.formProcess)
      })
  });

  console.log('ending', feedback.textContent);
};
