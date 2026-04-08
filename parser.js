function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
}

export function parseMarkdown(md) {
    const codeBlocks = [];
    let html = md.replace(/```(\w*)?\n([\s\S]*?)```/gm, (match, lang, code) => {
        const idx = codeBlocks.length;
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
        const escapedCode = escapeHtml(code.trim());
        codeBlocks.push(`<pre><code${cls}>${escapedCode}</code></pre>`);
        return `__CODE_BLOCK_${idx}__`;
    });

    html = html.replace(/^---$/gm, '<hr>');

    html = html.replace(/^### (.+)$/gm, (m, content) => {
        const id = content.toLowerCase().replace(/[^\w\u0400-\u04FF]+/g, '-');
        return `<h3 id="${id}">${content}</h3>`;
    });
    html = html.replace(/^## (.+)$/gm, (m, content) => {
        const id = content.toLowerCase().replace(/[^\w\u0400-\u04FF]+/g, '-');
        return `<h2 id="${id}">${content}</h2>`;
    });
    html = html.replace(/^# (.+)$/gm, (m, content) => {
        const id = content.toLowerCase().replace(/[^\w\u0400-\u04FF]+/g, '-');
        return `<h1 id="${id}">${content}</h1>`;
    });

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const lines = html.split('\n');
    let inList = false;
    let listItems = [];
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isListItem = /^(\s*[-*]\s+)(.+)$/.test(line);
        
        if (isListItem) {
            const content = line.replace(/^(\s*[-*]\s+)/, '');
            listItems.push(`<li>${content}</li>`);
            if (!inList) {
                inList = true;
            }
        } else {
            if (inList) {
                result.push('<ul>' + listItems.join('') + '</ul>');
                listItems = [];
                inList = false;
            }
            result.push(line);
        }
    }
    if (inList) {
        result.push('<ul>' + listItems.join('') + '</ul>');
    }
    html = result.join('\n');

    const paragraphLines = html.split('\n');
    const finalLines = [];
    for (let line of paragraphLines) {
        const trimmed = line.trim();
        if (trimmed === '') {
            finalLines.push('');
            continue;
        }
        if (/^<(\/?(?:ul|li|h[1-6]|pre|code|hr|p|div|a|strong|em|table|blockquote))/i.test(trimmed)) {
            finalLines.push(line);
        } else {
            finalLines.push(`<p>${line}</p>`);
        }
    }
    html = finalLines.join('\n');

    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[parseInt(idx)]);
    return html;
}