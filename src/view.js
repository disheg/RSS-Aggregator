export default (storage, elements, i18next) => {
  const {
    feedsElement,
    postsElement,
    titleModal,
    descriptionModal,
    link,
  } = elements;

  const renderFeeds = (data) => data.map(({ title, description }) => (`
      <li class="list-group-item">
        <h3>${title}</h3>
        <p>${description}</p>
      </li>`));
  const renderPosts = (data) => data.map(({ title, id, href }) => (`
    <li class="list-group-item d-flex justify-content-between align-items-start">
      <a href="${href}" data-id="${id}" class="font-weight-bold" target="_blank" rel="noopener noreferrer">
        ${title}
      </a>
      <button id="btn-modal" type="button" class="btn btn-primary" data-id="${id}" data-toggle="modal" data-target="#rssModal">
        ${i18next.t('btnWatch')}
      </button>
    </li>`));

  feedsElement.innerHTML = `<h2>Feeds</h2>
    <ul class="list-group mb-5">
      ${renderFeeds(storage.feeds).join('')}
    </ul>`;
  postsElement.innerHTML = `<h2>Posts</h2>
    <ul class="list-group">
      ${renderPosts(storage.posts).join('')}
    </ul>`;

  const btns = document.querySelectorAll('#btn-modal');
  btns.forEach((btn) => btn.addEventListener('click', (e) => {
    const { id } = e.target.dataset;
    const a = document.querySelector(`a[data-id="${id}"]`);
    a.classList.remove('font-weight-bold');
    const data = storage.posts.find((post) => post.id === id);
    const { title, description, url } = data;
    titleModal.textContent = title;
    descriptionModal.textContent = description;
    link.href = url;
  }));
};
