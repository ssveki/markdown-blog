import { addRoute, initRouter, navigate } from './router.js';
import { parseMarkdown } from './parser.js';

let posts = [];
let postCache = new Map();

function getFavorites() {
    const fav = localStorage.getItem('favorites');
    return fav ? JSON.parse(fav) : [];
}

function saveFavorites(favIds) {
    localStorage.setItem('favorites', JSON.stringify(favIds));
}

function isFavorite(id) {
    return getFavorites().includes(id);
}

function addFavorite(id) {
    const favs = getFavorites();
    if (!favs.includes(id)) {
        favs.push(id);
        saveFavorites(favs);
    }
}

function removeFavorite(id) {
    let favs = getFavorites();
    favs = favs.filter(fid => fid !== id);
    saveFavorites(favs);
}

function toggleFavorite(id) {
    if (isFavorite(id)) {
        removeFavorite(id);
    } else {
        addFavorite(id);
    }
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
        favBtn.textContent = isFavorite(id) ? 'В избранном' : 'В избранное';
        favBtn.classList.toggle('active', isFavorite(id));
    }
}

function countWords(md) {
    let text = md.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/[*_#`]/g, '');
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    return Math.max(1, Math.ceil(words / 200));
}

function generateTOC(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const headings = tempDiv.querySelectorAll('h2');
    if (headings.length === 0) return '';
    let tocItems = '';
    headings.forEach(h2 => {
        const id = h2.id;
        const title = h2.textContent;
        tocItems += `<li><a href="#${id}">${title}</a></li>`;
    });
    return `<div class="toc"><p>Содержание</p><ul>${tocItems}</ul></div>`;
}

async function loadMeta() {
    const res = await fetch('posts/meta.json');
    posts = await res.json();
}

function renderHome(app) {
    app.innerHTML = `
        <div class="posts-grid">
            ${posts.map(post => `
                <article class="card">
                    <h2><a href="#/post/${post.id}">${escapeHtml(post.title)}</a></h2>
                    <time datetime="${post.date}">${formatDate(post.date)}</time>
                    <p>${escapeHtml(post.description)}</p>
                    <a href="#/post/${post.id}" class="btn">Читать →</a>
                </article>
            `).join('')}
        </div>
    `;
}

function renderAbout(app) {
    app.innerHTML = `
        <div class="post">
            <h1>О блоге</h1>
            <p>Этот блог создан в рамках учебного проекта. Все статьи написаны в формате <strong>Markdown</strong> и парсятся на лету.</p>
            <p>Технологии: чистый JavaScript, fetch, History API (hash), собственный парсер Markdown.</p>
            <p>Фишки: кэширование статей, избранное в localStorage, время чтения, оглавление.</p>
        </div>
    `;
}

async function renderFavorites(app) {
    const favIds = getFavorites();
    if (favIds.length === 0) {
        app.innerHTML = '<div class="post"><p>У вас пока нет избранных статей. Добавьте их на странице статьи.</p></div>';
        return;
    }
    const favPosts = posts.filter(p => favIds.includes(p.id));
    app.innerHTML = `
        <h1>Избранные статьи</h1>
        <div class="posts-grid">
            ${favPosts.map(post => `
                <article class="card">
                    <h2><a href="#/post/${post.id}">${escapeHtml(post.title)}</a></h2>
                    <time>${formatDate(post.date)}</time>
                    <p>${escapeHtml(post.description)}</p>
                    <a href="#/post/${post.id}" class="btn">Читать →</a>
                </article>
            `).join('')}
        </div>
    `;
}

async function renderPost(app, id) {
    const postId = Number(id);
    const post = posts.find(p => p.id === postId);
    if (!post) {
        app.innerHTML = '<p>Статья не найдена.</p>';
        return;
    }

    app.innerHTML = '<div class="loading">Загрузка статьи...</div>';

    let cached = postCache.get(postId);
    if (!cached) {
        const res = await fetch(post.file);
        const md = await res.text();
        const wordCount = countWords(md);
        const htmlContent = parseMarkdown(md);
        cached = { md, html: htmlContent, wordCount };
        postCache.set(postId, cached);
    }

    const { html: articleHtml, wordCount } = cached;
    const tocHtml = generateTOC(articleHtml);
    const fullHtml = tocHtml + articleHtml;
    const minutes = wordCount;

    app.innerHTML = `
        <div class="post">
            <button class="back-btn" id="backHomeBtn">← На главную</button>
            <div class="post-header">
                <h1>${escapeHtml(post.title)}</h1>
                <div class="post-meta">
                    <time datetime="${post.date}">${formatDate(post.date)}</time>
                    <span class="read-time">${minutes} мин чтения</span>
                    <button id="favoriteBtn" class="fav-btn ${isFavorite(postId) ? 'active' : ''}">
                        ${isFavorite(postId) ? 'В избранном' : 'В избранное'}
                    </button>
                </div>
            </div>
            <div class="post-content">${fullHtml}</div>
        </div>
    `;

    document.getElementById('backHomeBtn').addEventListener('click', () => navigate('#/'));
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            toggleFavorite(postId);
        });
    }
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function init() {
    await loadMeta();
    addRoute('#/', renderHome);
    addRoute('#/about', renderAbout);
    addRoute('#/favorites', renderFavorites);
    addRoute('#/post/:id', renderPost);
    initRouter();
    window.navigate = navigate;
}

init();