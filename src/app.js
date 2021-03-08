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

const parseSite = (url, proxy) => axios.get(proxy + url, { params: { disableCache: true } });

const parseData = (data, i18next) => {
  const parser = new DOMParser();
  const parsedData = parser.parseFromString(data, 'text/xml');
  const errorElement = parsedData.querySelector('parsererror');
  if (errorElement) {
    throw new Error(i18next.t('parseError'));
  }
  return parsedData;
};

const getFeedAndPosts = (data) => {
  console.log(data)
  const title = data.querySelector('title').textContent;
  const description = data.querySelector('description').textContent;
  const items = data.querySelectorAll('item');
  //console.log(items[1].childNodes.keys().forEach((el) => console.log(el)))
  console.log(items[2].children.item('description'))
  const posts = [...items].map((post) => {
    const title = post.querySelector('title').textContent;
    const description = post.querySelector('description').textContent;
    const link = post.querySelector('link').textContent;
    return {
      id: _.uniqueId(),
      title,
      description,
      link,
    };
  });
  return {
    feed: { id: _.uniqueId(), title, description },
    posts,
  };
};

const render = (storage, elements, i18next) => {
  const { feeds, posts } = elements;
  const renderFeeds = (data) => data.map(({ title, description }) => (`
      <li class="list-group-item">
        <h3>${title}</h3>
        <p>${description}</p>
      </li>`));
  const renderPosts = (data) => data.map(({ title, id, link }) => (`
    <li class="list-group-item d-flex justify-content-between align-items-start">
      <a href="${link}" class="font-weight-bold" target="_blank" rel="noopener noreferrer">
        ${title}
      </a>
      <button id="btn-modal" type="button" class="btn btn-primary" data-id="${id}" data-toggle="modal" data-target="#rssModal">
        ${i18next.t('btnWatch')}
      </button>
    </li>`));

  feeds.innerHTML = `<h2>Feeds</h2>
    <ul class="list-group mb-5">
      ${renderFeeds(storage.feeds).join('')}
    </ul>`;
  posts.innerHTML = `<h2>Posts</h2>
    <ul class="list-group">
      ${renderPosts(storage.posts).join('')}
    </ul>`;

  const btns = document.querySelectorAll('#btn-modal');
  btns.forEach((btn) => btn.addEventListener('click', (e) => {
    const { id } = e.target.dataset;
    const data = storage.posts.find((post) => post.id === id);
    const { title, description, url } = data;
    console.log(data)
    elements.titleModal.textContent = title;
    elements.descriptionModal.textContent = description;
    elements.link.href = url;
  }))
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
            btnWatch: 'Просмотр',
          },
        },
      },
    });
  const form = document.querySelector('#form-rss');
  const feeds = document.querySelector('.feeds');
  const posts = document.querySelector('.posts');
  const input = form.elements.host;
  const feedback = form.querySelector('.feedback');
  const titleModal = document.querySelector('#modalLabel');
  const descriptionModal = document.querySelector('#modalDescription');
  const link = document.querySelector('a[role="button"]');

  const elements = { feeds, posts, titleModal, descriptionModal, link };

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
    feedback.textContent = state.formProcess.error;
  };

  const processStateHandler = (processState, watchedState, storage) => {
    switch (processState) {
      case 'sending':
        input.toggleAttribute('readonly');
        submitButton.disabled = true;
        break;
      case 'failed':
        input.toggleAttribute('readonly');
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
      .then(() => {
        watchedState.formProcess.state = 'sending';
        return parseSite(hostName, proxy);
      })
      .then((response) => parseData(response.data.contents, i18next))
      .then((data) => getFeedAndPosts(data))
      .then(({ feed, posts }) => {
        localStorage.feeds.push(feed);
        localStorage.posts = [...localStorage.posts, ...posts];
        console.log(localStorage)
        watchedState.formProcess.state = 'finished';
      })
      .catch((error) => {
        console.log(localStorage)
        if (!!error.isAxiosError && !error.response) {
          state.formProcess.error = i18next.t('networkError');
        } else {
          state.formProcess.error = error.errors || error.message;
        }
        watchedState.formProcess.state = 'failed';
      });
  });
};
