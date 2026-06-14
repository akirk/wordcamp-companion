(function (WCC) {
    const state = WCC.state;
    const nodes = WCC.nodes;
    function __() { return WCC.__.apply(WCC, arguments); }
    function _n() { return WCC._n.apply(WCC, arguments); }
    function sprintf() { return WCC.sprintf.apply(WCC, arguments); }
    function element() { return WCC.element.apply(WCC, arguments); }
    function savedSessionPostToSession() { return WCC.savedSessionPostToSession.apply(WCC, arguments); }
    function compareSessions() { return WCC.compareSessions.apply(WCC, arguments); }
    function getNoteEvents() { return WCC.getNoteEvents.apply(WCC, arguments); }
    function getSelectedPlan() { return WCC.getSelectedPlan.apply(WCC, arguments); }
    function getSelectedEvent() { return WCC.getSelectedEvent.apply(WCC, arguments); }
    function getSelectedTimezone() { return WCC.getSelectedTimezone.apply(WCC, arguments); }
    function getSessionNotes() { return WCC.getSessionNotes.apply(WCC, arguments); }
    function getEventSlug() { return WCC.getEventSlug.apply(WCC, arguments); }
    function getEventTitle() { return WCC.getEventTitle.apply(WCC, arguments); }
    function formatEventRange() { return WCC.formatEventRange.apply(WCC, arguments); }
    function formatSessionTime() { return WCC.formatSessionTime.apply(WCC, arguments); }
    function getPrimaryTrack() { return WCC.getPrimaryTrack.apply(WCC, arguments); }
    function groupSessionsByDay() { return WCC.groupSessionsByDay.apply(WCC, arguments); }
    function render() { return WCC.render.apply(WCC, arguments); }
    function renderCompanionFallback() { return WCC.renderCompanionFallback.apply(WCC, arguments); }
    function renderNoteSession() { return WCC.renderNoteSession.apply(WCC, arguments); }
    function renderNotesExport(sessions) {
        const markdown = buildNotesMarkdown(sessions);
        const notedCount = sessions.filter(function (session) {
            return getExportSessionNotes(session) !== '';
        }).length;
        const section = element('details', { className: 'wcc-notes-export' });
        const summary = element('summary', { className: 'wcc-notes-export-header' });
        const title = element('div', { className: 'wcc-notes-export-title' });
        const actions = element('div', { className: 'wcc-notes-export-actions' });
        const preview = element('div', {
            className: 'wcc-notes-rendered-preview',
            'data-notes-export-rendered': 'true',
            'aria-label': 'Rendered preview of your exported notes',
        });
        const previewWrap = element('div', { className: 'wcc-notes-preview-wrap' });
        const copyButton = element('button', {
            className: 'wcc-notes-copy-button',
            type: 'button',
            title: state.notesExportCopiedType === 'formatted' ? 'Copied' : 'Copy formatted notes',
            'aria-label': state.notesExportCopiedType === 'formatted' ? 'Copied formatted notes' : 'Copy formatted notes',
        });
        copyButton.append(createNotesExportCopyIcon(state.notesExportCopiedType === 'formatted'));
        const markdownGroup = createNotesExportActionGroup('Markdown', 'markdown');
        const markdownCopyButton = markdownGroup.copyButton;
        const markdownButton = markdownGroup.downloadButton;
        const htmlGroup = createNotesExportActionGroup('HTML', 'html');
        const htmlCopyButton = htmlGroup.copyButton;
        const htmlButton = htmlGroup.downloadButton;
        updateNotesExportActionGroup(markdownGroup, markdown);
        updateNotesExportActionGroup(htmlGroup, markdown);

        title.append(
            element('strong', { text: 'Notes export' }),
            element('span', {
                'data-notes-export-count': 'true',
                text: getNotesExportCountText(notedCount, sessions.length),
            })
        );
        renderMarkdownPreview(markdown, preview);

        copyButton.addEventListener('click', function () {
            copyFormattedNotes(buildNotesMarkdown(getCurrentNoteSessions()));
        });
        markdownCopyButton.addEventListener('click', function () {
            copyNotesExportText('markdown', buildNotesMarkdown(getCurrentNoteSessions()));
        });
        markdownButton.addEventListener('click', function () {
            shareOrDownloadNotesExport('markdown', buildNotesMarkdown(getCurrentNoteSessions()));
        });
        htmlCopyButton.addEventListener('click', function () {
            copyNotesExportText('html', buildNotesMarkdown(getCurrentNoteSessions()));
        });
        htmlButton.addEventListener('click', function () {
            shareOrDownloadNotesExport('html', buildNotesMarkdown(getCurrentNoteSessions()));
        });
        section.addEventListener('toggle', function () {
            state.notesExportOpen = section.open;
        });

        section.open = Boolean(state.notesExportOpen);
        actions.append(markdownGroup.node, htmlGroup.node);
        summary.append(title);
        previewWrap.append(copyButton, preview);
        section.append(
            summary,
            actions,
            element('p', {
                className: 'wcc-notes-export-help',
                text: 'This preview is built from the individual session notes below. Edit a session note to update the export automatically.',
            }),
            previewWrap
        );

        return section;
    }

    function createNotesExportCopyIcon(copied) {
        if (copied) {
            return element('span', {
                className: 'dashicons dashicons-yes',
                'aria-hidden': 'true',
            });
        }

        const icon = element('span', {
            className: 'wcc-copy-icon',
            'aria-hidden': 'true',
        });
        icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fill="currentColor" d="M768 832a128 128 0 0 1-128 128H192A128 128 0 0 1 64 832V384a128 128 0 0 1 128-128v64a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64h64z"></path><path fill="currentColor" d="M384 128a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64V192a64 64 0 0 0-64-64H384zm0-64h448a128 128 0 0 1 128 128v448a128 128 0 0 1-128 128H384a128 128 0 0 1-128-128V192A128 128 0 0 1 384 64z"></path></svg>';

        return icon;
    }

    function createNotesExportActionGroup(label, type) {
        const node = element('span', { className: 'wcc-notes-export-action-group' });
        const labelNode = element('span', {
            className: 'wcc-notes-export-action-label',
            text: label,
        });
        const copyButton = createNotesExportCopyButton(type, label);
        const downloadButtonOptions = {
            className: 'wcc-notes-export-action-button',
            type: 'button',
        };
        downloadButtonOptions['data-notes-export-' + type + '-button'] = 'true';
        const downloadButton = element('button', downloadButtonOptions);

        node.append(labelNode, copyButton, downloadButton);

        return {
            copyButton: copyButton,
            downloadButton: downloadButton,
            node: node,
            type: type,
        };
    }

    function updateNotesExportActionGroup(group, markdown) {
        if (!group || !group.downloadButton) {
            return;
        }

        const label = getNotesExportFileActionText(group.type, markdown);
        group.downloadButton.title = label;
        group.downloadButton.setAttribute('aria-label', label);
        group.downloadButton.replaceChildren(createNotesExportDownloadIcon());
    }

    function createNotesExportCopyButton(type, label) {
        const copied = state.notesExportCopiedType === type;
        const button = element('button', {
            className: 'wcc-notes-export-action-button is-icon',
            type: 'button',
            title: copied ? 'Copied' : 'Copy ' + label,
            'aria-label': copied ? 'Copied ' + label : 'Copy ' + label,
        });

        button.append(createNotesExportCopyIcon(copied));

        return button;
    }

    function createNotesExportDownloadIcon() {
        const icon = element('span', {
            className: 'wcc-download-icon',
            'aria-hidden': 'true',
        });
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M12 3v11"></path><path d="m7 9 5 5 5-5"></path><path d="M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3"></path></svg>';

        return icon;
    }

    function getCurrentNoteSessions() {
        const selectedPlan = getSelectedPlan();
        const savedPosts = selectedPlan && Array.isArray(selectedPlan.saved_sessions) ? selectedPlan.saved_sessions : [];

        return savedPosts.map(savedSessionPostToSession).filter(function (session) {
            return session.id && session.start;
        }).sort(compareSessions);
    }

    function getNotesExportCountText(notedCount, sessionCount) {
        return 'Generated from ' + notedCount + ' noted / ' + sessionCount + ' saved sessions';
    }

    function refreshNotesExportPreview() {
        const count = document.querySelector('[data-notes-export-count="true"]');
        const rendered = document.querySelector('[data-notes-export-rendered="true"]');
        const markdownButton = document.querySelector('[data-notes-export-markdown-button="true"]');
        const htmlButton = document.querySelector('[data-notes-export-html-button="true"]');

        if (!count && !rendered && !markdownButton && !htmlButton) {
            return;
        }

        const sessions = getCurrentNoteSessions();
        const notedCount = sessions.filter(function (session) {
            return getExportSessionNotes(session) !== '';
        }).length;
        const markdown = buildNotesMarkdown(sessions);

        if (rendered) {
            renderMarkdownPreview(markdown, rendered);
        }

        if (count) {
            count.textContent = getNotesExportCountText(notedCount, sessions.length);
        }

        if (markdownButton) {
            markdownButton.textContent = getNotesExportFileActionText('markdown', markdown);
        }

        if (htmlButton) {
            htmlButton.textContent = getNotesExportFileActionText('html', markdown);
        }
    }

    function renderMarkdownPreview(markdown, container) {
        const fragment = document.createDocumentFragment();
        const lines = String(markdown || '').split('\n');
        let list = null;
        let paragraph = [];

        function flushParagraph() {
            if (!paragraph.length) {
                return;
            }

            const node = element('p');
            appendInlineMarkdown(node, paragraph.join(' '));
            fragment.append(node);
            paragraph = [];
        }

        function flushList() {
            if (list) {
                fragment.append(list);
                list = null;
            }
        }

        lines.forEach(function (line) {
            const value = line.trim();
            const heading = value.match(/^(#{1,3})\s+(.+)$/);
            const listItem = value.match(/^[-*]\s+(.+)$/);

            if (!value) {
                flushParagraph();
                flushList();
                return;
            }

            if (heading) {
                flushParagraph();
                flushList();
                const level = Math.min(heading[1].length, 3);
                const node = element('h' + level);
                appendInlineMarkdown(node, heading[2]);
                fragment.append(node);
                return;
            }

            if (listItem) {
                flushParagraph();
                if (!list) {
                    list = element('ul');
                }
                const item = element('li');
                appendInlineMarkdown(item, listItem[1]);
                list.append(item);
                return;
            }

            flushList();
            paragraph.push(value);
        });

        flushParagraph();
        flushList();
        container.replaceChildren(fragment);
    }

    function appendInlineMarkdown(container, text) {
        const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                container.append(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const token = match[0];
            const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

            if (token.indexOf('**') === 0) {
                container.append(element('strong', { text: token.slice(2, -2) }));
            } else if (token.indexOf('_') === 0) {
                container.append(element('em', { text: token.slice(1, -1) }));
            } else if (link) {
                container.append(element('a', {
                    href: getSafeMarkdownUrl(link[2]),
                    rel: 'noopener noreferrer',
                    target: '_blank',
                    text: link[1],
                }));
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            container.append(document.createTextNode(text.slice(lastIndex)));
        }
    }

    function getSafeMarkdownUrl(url) {
        const value = String(url || '').trim();

        if (/^(https?:|mailto:)/i.test(value)) {
            return value;
        }

        return '#';
    }

    function getExportMarkdownUrl(url) {
        const value = String(url || '').trim();

        if (!/^(https?:|mailto:)/i.test(value)) {
            return '';
        }

        return value.replace(/\)/g, '%29');
    }

    function escapeMarkdownLinkText(text) {
        return String(text || '').replace(/([\\\]])/g, '\\$1');
    }

    function formatExportMarkdownLink(text, url) {
        const safeUrl = getExportMarkdownUrl(url);

        if (!safeUrl) {
            return text;
        }

        return '[' + escapeMarkdownLinkText(text) + '](' + safeUrl + ')';
    }

    function formatExportSessionSpeakers(session) {
        const names = Array.isArray(session && session.speaker_names) ? session.speaker_names : [];
        const urls = Array.isArray(session && session.speaker_urls) ? session.speaker_urls : [];

        return names.map(function (name, index) {
            return formatExportMarkdownLink(name, urls[index] || '');
        }).join(', ');
    }

    function renderNotesPage() {
        const events = getNoteEvents();
        if (!events.length) {
            nodes.schedule.append(renderCompanionFallback(
                'No saved sessions',
                'Save sessions from a WordCamp before adding notes.'
            ));
            return;
        }

        if (!state.selectedEventUrl || !getSelectedPlan()) {
            state.selectedEventUrl = events[0].event_url;
        }

        const sessions = getCurrentNoteSessions();

        if (!sessions.length) {
            nodes.schedule.append(element('div', {
                className: 'wcc-empty',
                text: 'No saved sessions for this WordCamp yet.',
            }));
            return;
        }

        nodes.schedule.append(renderNotesExport(sessions));

        groupSessionsByDay(sessions, getSelectedTimezone()).forEach(function (group) {
            const section = element('section', { className: 'wcc-day' });
            const header = element('div', { className: 'wcc-day-header' });
            header.append(
                element('h2', { text: group.label }),
                element('span', {
                    className: 'wcc-day-count',
                    text: sprintf(_n('%d session', '%d sessions', group.sessions.length), group.sessions.length),
                })
            );

            const list = element('div', { className: 'wcc-session-list' });
            group.sessions.forEach(function (session) {
                list.append(renderNoteSession(session));
            });

            section.append(header, list);
            nodes.schedule.append(section);
        });
    }

    async function copyFormattedNotes(markdown) {
        try {
            let copied = false;

            if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'text/html': new Blob([getNotesHtmlDocument(markdown)], { type: 'text/html' }),
                            'text/plain': new Blob([markdown], { type: 'text/plain' }),
                        }),
                    ]);
                    copied = true;
                } catch (error) {
                    copied = false;
                }
            }

            if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(markdown);
                copied = true;
            }

            if (!copied) {
                copyTextFallback(markdown);
            }

            markNotesExportCopied('formatted');
        } catch (error) {
            state.alert = { type: 'error', message: 'Could not copy notes.' };
            render();
        }
    }

    async function copyNotesMarkdown(markdown) {
        return copyFormattedNotes(markdown);
    }

    async function copyNotesExportText(type, markdown) {
        try {
            const descriptor = getNotesExportFileDescriptor(type, markdown);

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(descriptor.contents);
            } else {
                copyTextFallback(descriptor.contents);
            }

            markNotesExportCopied(type);
        } catch (error) {
            state.alert = { type: 'error', message: 'Could not copy notes.' };
            render();
        }
    }

    function markNotesExportCopied(type) {
        state.notesExportCopied = true;
        state.notesExportCopiedType = type;
        render();
        window.setTimeout(function () {
            if (state.notesExportCopiedType !== type) {
                return;
            }

            state.notesExportCopied = false;
            state.notesExportCopiedType = '';
            render();
        }, 1600);
    }

    function copyTextFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.append(textarea);
        textarea.select();

        const copied = document.execCommand('copy');
        textarea.remove();

        if (!copied) {
            throw new Error('Copy failed.');
        }
    }

    function getNotesExportBaseFilename() {
        const event = getSelectedEvent();

        return (getEventSlug(event) || 'wordcamp-notes') + '-notes';
    }

    function getNotesExportFileDescriptor(type, markdown) {
        if (type === 'html') {
            return {
                contents: getNotesHtmlDocument(markdown),
                extension: '.html',
                filename: getNotesExportBaseFilename() + '.html',
                mime: 'text/html',
            };
        }

        return {
            contents: markdown,
            extension: '.md',
            filename: getNotesExportBaseFilename() + '.md',
            mime: 'text/markdown',
        };
    }

    function createNotesExportFile(type, markdown) {
        const descriptor = getNotesExportFileDescriptor(type, markdown);

        return new File([descriptor.contents], descriptor.filename, { type: descriptor.mime });
    }

    function canShareNotesExport(type, markdown) {
        if (!navigator.share || !navigator.canShare || typeof File === 'undefined') {
            return false;
        }

        try {
            return navigator.canShare({
                files: [createNotesExportFile(type, markdown)],
            });
        } catch (error) {
            return false;
        }
    }

    function getNotesExportFileActionText(type, markdown) {
        const descriptor = getNotesExportFileDescriptor(type, markdown);

        return 'Download ' + descriptor.extension;
    }

    async function shareOrDownloadNotesExport(type, markdown) {
        if (canShareNotesExport(type, markdown)) {
            try {
                const file = createNotesExportFile(type, markdown);
                await navigator.share({
                    files: [file],
                    title: file.name,
                    text: getEventTitle(getSelectedEvent()) + ' notes',
                });
                return;
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return;
                }
            }
        }

        downloadNotesExport(type, markdown);
    }

    function downloadNotesExport(type, markdown) {
        const descriptor = getNotesExportFileDescriptor(type, markdown);
        const blob = new Blob([descriptor.contents], { type: descriptor.mime + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = element('a', {
            href: url,
            download: descriptor.filename,
        });

        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);
    }

    function shareOrDownloadNotesMarkdown(markdown) {
        return shareOrDownloadNotesExport('markdown', markdown);
    }

    function downloadNotesMarkdown(markdown) {
        return downloadNotesExport('markdown', markdown);
    }

    function getNotesHtmlDocument(markdown) {
        const title = getEventTitle(getSelectedEvent()) + ' notes';

        return '<!doctype html>\n'
            + '<html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>'
            + '<style>'
            + 'body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5;color:#111827;}'
            + 'a{color:#0f766e;}h1{font-size:1.6rem;}h2{font-size:1.25rem;margin-top:1.6rem;}'
            + 'h3{font-size:1.05rem;margin-top:1.1rem;}ul{padding-left:1.35rem;}'
            + '</style></head><body>\n'
            + markdownToHtml(markdown)
            + '\n</body></html>\n';
    }

    function markdownToHtml(markdown) {
        const html = [];
        const paragraph = [];
        let listOpen = false;
        let previousBlank = false;

        function flushParagraph() {
            if (!paragraph.length) {
                return;
            }

            html.push('<p>' + inlineMarkdownToHtml(paragraph.join(' ')) + '</p>');
            paragraph.length = 0;
        }

        function closeList() {
            if (listOpen) {
                html.push('</ul>');
                listOpen = false;
            }
        }

        String(markdown || '').split('\n').forEach(function (line) {
            const value = line.trim();
            const heading = value.match(/^(#{1,3})\s+(.+)$/);
            const listItem = value.match(/^[-*]\s+(.+)$/);

            if (!value) {
                const hadOpenBlock = paragraph.length || listOpen;
                flushParagraph();
                closeList();
                if (!hadOpenBlock && previousBlank && html.length) {
                    html.push('<p style="margin:0 0 1em 0;">&nbsp;</p>');
                    previousBlank = false;
                    return;
                }
                previousBlank = true;
                return;
            }

            previousBlank = false;

            if (heading) {
                flushParagraph();
                closeList();
                const level = Math.min(heading[1].length, 3);
                html.push('<h' + level + '>' + inlineMarkdownToHtml(heading[2]) + '</h' + level + '>');
                return;
            }

            if (listItem) {
                flushParagraph();
                if (!listOpen) {
                    html.push('<ul>');
                    listOpen = true;
                }
                html.push('<li>' + inlineMarkdownToHtml(listItem[1]) + '</li>');
                return;
            }

            closeList();
            paragraph.push(value);
        });

        flushParagraph();
        closeList();

        return html.join('\n');
    }

    function inlineMarkdownToHtml(text) {
        const pattern = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
        let html = '';
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                html += escapeHtml(text.slice(lastIndex, match.index));
            }

            const token = match[0];
            const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

            if (token.indexOf('**') === 0) {
                html += '<strong>' + escapeHtml(token.slice(2, -2)) + '</strong>';
            } else if (token.indexOf('_') === 0) {
                html += '<em>' + escapeHtml(token.slice(1, -1)) + '</em>';
            } else if (link) {
                html += '<a href="' + escapeHtml(getSafeMarkdownUrl(link[2])) + '">' + escapeHtml(link[1]) + '</a>';
            }

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            html += escapeHtml(text.slice(lastIndex));
        }

        return html;
    }

    function escapeHtml(text) {
        return String(text || '').replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            }[character];
        });
    }

    function buildNotesMarkdown(sessions) {
        const event = getSelectedEvent();
        const timeZone = getSelectedTimezone();
        const notedSessions = sessions.filter(function (session) {
            return getExportSessionNotes(session) !== '';
        });
        const unnotedSessions = sessions.filter(function (session) {
            return getExportSessionNotes(session) === '';
        });
        const lines = [
            '# ' + getEventTitle(event) + ' notes',
            '',
        ];

        if (event) {
            const meta = [event.location, formatEventRange(event)].filter(Boolean).join(' - ');
            if (meta) {
                lines.push(meta, '');
            }
        }

        if (!notedSessions.length) {
            lines.push('No session notes yet.', '');
        } else {
            groupSessionsByDay(notedSessions, timeZone).forEach(function (group) {
                lines.push('## ' + group.label, '');
                group.sessions.forEach(function (session) {
                    const title = session.title || 'Untitled session';
                    const notes = getExportSessionNotes(session);
                    const meta = [
                        formatSessionTime(session, timeZone),
                        getPrimaryTrack(session),
                        formatExportSessionSpeakers(session),
                    ].filter(Boolean);

                    lines.push('### ' + formatExportMarkdownLink(title, session.url || ''));
                    if (meta.length) {
                        lines.push(meta.join(' / '));
                    }
                    lines.push('', notes, '', '');
                });
            });
        }

        appendUnnotedSessionsMarkdown(lines, unnotedSessions, timeZone);

        return lines.join('\n').trim() + '\n';
    }

    function getExportSessionNotes(session) {
        const lines = getSessionNotes(session).trim().split('\n');

        while (lines.length && /^\s*[-*]\s*$/.test(lines[lines.length - 1])) {
            lines.pop();
        }

        return lines.join('\n').trim();
    }

    function appendUnnotedSessionsMarkdown(lines, sessions, timeZone) {
        if (!sessions.length) {
            return;
        }

        lines.push('## Other sessions attended', '');

        groupSessionsByDay(sessions, timeZone).forEach(function (group) {
            lines.push('### ' + group.label);
            group.sessions.forEach(function (session) {
                const title = session.title || 'Untitled session';
                const meta = [
                    formatSessionTime(session, timeZone),
                    getPrimaryTrack(session),
                    formatExportSessionSpeakers(session),
                ].filter(Boolean);
                const label = formatExportMarkdownLink(title, session.url || '');

                lines.push('- ' + label + (meta.length ? ' - ' + meta.join(' / ') : ''));
            });
            lines.push('');
        });
    }


    Object.assign(WCC, {
        renderNotesExport: renderNotesExport,
        renderNotesPage: renderNotesPage,
        copyNotesMarkdown: copyNotesMarkdown,
        copyTextFallback: copyTextFallback,
        shareOrDownloadNotesMarkdown: shareOrDownloadNotesMarkdown,
        downloadNotesMarkdown: downloadNotesMarkdown,
        buildNotesMarkdown: buildNotesMarkdown,
        refreshNotesExportPreview: refreshNotesExportPreview
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
