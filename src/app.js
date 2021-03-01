import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import i18next from 'i18next';
import * as yup from 'yup';
import onChange from 'on-change';

const validate = (data, localStorage) => {
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

const parseData = (data) => {
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

const parseSite = (url) => fetch(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(url)}`)
  .then((response) => {
    if (response.ok) return response.json();
    throw new Error('Network response was not ok.');
  })
  .then((data) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/xml');
    return doc;
  });

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
    feedback.innerHTML = 'RSS успешно загружен';
  };

  const processStateHandler = (processState, storage) => {
    switch (processState) {
      case 'sending':
        submitButton.disabled = true;
        break;
      case 'failed':
        feedback.innerHTML = state.formProcess.error;
        break;
      case 'finished':
        submitButton.disabled = false;
        updateData(parseData(storage.data), storage);
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
        feedback.innerHTML = state.formProcess.error.errors;
        break;
      case 'formProcess.state':
        processStateHandler(value, localStorage);
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
    validate(hostName, localStorage)
      .then(() => {
        watchedState.formProcess.state = 'sending';
        watchedState.formProcess.valid = true;
        input.classList.remove('is-invalid');
        parseSite(hostName)
          .then((data) => {
            localStorage.data = data;
            localStorage.urls.push(hostName);
            watchedState.formProcess.state = 'finished';
          })
          .catch((error) => {
            state.formProcess.error = error;
            watchedState.formProcess.state = 'failed';
          });
      })
      .catch((error) => {
        state.formProcess.error = error;
        watchedState.formProcess.valid = false;
      });
  });
};
