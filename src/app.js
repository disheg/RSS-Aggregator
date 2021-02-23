import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import * as yup from 'yup';

const validate = (data) => {
  const schema = yup.object().shape({
    url: yup.string().required().url(),
  });
  return schema.validate({ url: data });
};

const parseData = (data) => {
  const title = data.querySelector('title').textContent;
  const description = data.querySelector('description').textContent;
  const items = data.querySelectorAll('item');
  const posts = [...items].map((el) => ({
    title: el.children[0].textContent,
    description: el.children[1].textContent,
    url: el.children[2].textContent,
  }));
  return {
    feed: { title, description },
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
  const localStorage = {
    urls: [],
    feeds: [],
    posts: [],
  };
  const form = document.querySelector('#form-rss');
  const input = form.elements.host;
  const feedback = form.querySelector('.feedback');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const hostName = formData.get('host');
    validate(hostName, localStorage)
      .then(() => {
        if (_.includes(localStorage.urls, hostName)) {
          input.classList.add('is-invalid');
          throw new Error('RSS уже существует');
        }
        input.classList.remove('is-invalid');
        parseSite(hostName)
          .then((data) => {
            localStorage.urls.push(hostName);
            const { feed, posts } = parseData(data);
            localStorage.feeds = [...localStorage.feeds, feed];
            localStorage.posts = [...localStorage.posts, ...posts];
            render(localStorage);
          })
          .then(() => {
            input.value = '';
            feedback.innerHTML = 'RSS успешно загружен';
          });
      })
      .catch((error) => {
        input.classList.add('is-invalid');
        feedback.innerHTML = error.errors || error;
      });
  });
};
