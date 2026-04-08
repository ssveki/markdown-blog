const routes = {};

export function addRoute(pattern, handler) {
    routes[pattern] = handler;
}

export function navigate(hash) {
    window.location.hash = hash;
}

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash || '#/';
    const app = document.getElementById('app');

    if (routes[hash]) {
        routes[hash](app);
        updateActiveNav(hash);
        return;
    }

    for (const pattern in routes) {
        const regex = new RegExp('^' + pattern.replace(/:([\w]+)/g, '([^/]+)') + '$');
        const match = hash.match(regex);
        if (match) {
            routes[pattern](app, match[1]);
            updateActiveNav(hash);
            return;
        }
    }

    app.innerHTML = '<h2>404 - Страница не найдена</h2><p>Проверьте адрес или вернитесь на <a href="#/">главную</a>.</p>';
    updateActiveNav(hash);
}

function updateActiveNav(hash) {
    document.querySelectorAll('[data-nav]').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === hash);
    });
}