/**
 * ============================================================================
 * ECHO TOOLKIT — Main Application JavaScript
 * ============================================================================
 * Modular, reusable utility functions for all 61 tools.
 * No external dependencies. Pure vanilla JS.
 * ============================================================================
 */

'use strict';

const EchoApp = (() => {

    /* ========================================================================
       1. SEARCH / FILTER SYSTEM
       ======================================================================== */

    /**
     * Initialize the tool search filter on the dashboard.
     * Filters cards by matching input against name, description, and category.
     */
    function initSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;

        let debounceTimer;

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => filterTools(input.value.trim()), 150);
        });

        // Keyboard shortcut: press "/" to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== input) {
                e.preventDefault();
                input.focus();
            }
            if (e.key === 'Escape' && document.activeElement === input) {
                input.value = '';
                input.blur();
                filterTools('');
            }
        });
    }

    /**
     * Filter tool cards based on the query string.
     * Matches against data-name, data-desc, and data-category attributes.
     * Hides empty category sections.
     *
     * @param {string} query — The search query (case-insensitive).
     */
    function filterTools(query) {
        const cards = document.querySelectorAll('.tool-card');
        const sections = document.querySelectorAll('.category-section');
        const noResults = document.getElementById('noResults');
        const normalized = query.toLowerCase();
        let totalVisible = 0;

        cards.forEach((card) => {
            const name = (card.getAttribute('data-name') || '').toLowerCase();
            const desc = (card.getAttribute('data-desc') || '').toLowerCase();
            const category = (card.getAttribute('data-category') || '').toLowerCase();

            const match = !normalized || name.includes(normalized) || desc.includes(normalized) || category.includes(normalized);

            if (match) {
                card.classList.remove('hidden');
                totalVisible++;
            } else {
                card.classList.add('hidden');
            }
        });

        // Hide/show category sections that have no visible cards
        sections.forEach((section) => {
            const visibleCards = section.querySelectorAll('.tool-card:not(.hidden)');
            section.style.display = visibleCards.length === 0 ? 'none' : '';
        });

        // Show / hide "no results" message
        if (noResults) {
            noResults.style.display = (normalized && totalVisible === 0) ? 'block' : 'none';
        }
    }

    /**
     * Clear the search input and reset filters.
     */
    function clearSearch() {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = '';
            filterTools('');
        }
    }

    /* ========================================================================
       2. SIDEBAR TOGGLE (Mobile)
       ======================================================================== */

    /**
     * Toggle the sidebar open/closed on mobile viewports.
     */
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;

        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            closeSidebar();
        } else {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close the sidebar (mobile).
     */
    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ========================================================================
       3. COLLAPSIBLE SIDEBAR SECTIONS
       ======================================================================== */

    /**
     * Toggle a sidebar nav section open/closed.
     * @param {HTMLElement} headerEl — The .nav-section-header element.
     */
    function toggleNavSection(headerEl) {
        const section = headerEl.closest('.nav-section');
        if (section) section.classList.toggle('collapsed');
    }

    /**
     * Expand all sidebar sections.
     */
    function expandAll() {
        document.querySelectorAll('.nav-section').forEach((s) => s.classList.remove('collapsed'));
        document.querySelectorAll('.category-section').forEach((s) => { s.style.display = ''; });
        clearSearch();
    }

    /**
     * Collapse all sidebar sections (keep the active one open).
     */
    function collapseAll() {
        document.querySelectorAll('.nav-section').forEach((s) => s.classList.add('collapsed'));
    }

    /* ========================================================================
       4. BACK TO TOP BUTTON
       ======================================================================== */

    function initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });
    }

    /* ========================================================================
       5. API HELPER — echoAPI()
       ======================================================================== */

    /**
     * Generic API fetch helper for tool endpoints.
     * Handles loading states, error handling, and result display.
     *
     * @param {string} toolPath   — The API endpoint (e.g., '/api/json-formatter')
     * @param {object} [data={}]  — Request body data (will be JSON-stringified for POST/PUT).
     * @param {string} [method='POST'] — HTTP method.
     * @param {object} [options={}]
     * @param {string} [options.containerId]  — DOM id where results render.
     * @param {string} [options.format='json'] — Result format: 'json', 'html', 'text', 'image'.
     * @param {Function} [options.onSuccess]   — Callback on success (receives parsed response).
     * @param {Function} [options.onError]     — Callback on error (receives Error).
     * @param {Function} [options.onFinally]    — Callback after request completes.
     * @returns {Promise<any>} — Resolves with parsed JSON response.
     */
    async function echoAPI(toolPath, data = {}, method = 'POST', options = {}) {
        const {
            containerId = null,
            format = 'json',
            onSuccess = null,
            onError = null,
            onFinally = null,
        } = options;

        // Show loading state
        if (containerId) showLoading(containerId);

        const url = toolPath.startsWith('/') ? toolPath : `/api/${toolPath}`;
        const fetchOptions = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error ${response.status}: ${response.statusText} — ${errorBody}`);
            }

            const contentType = response.headers.get('content-type') || '';

            // Handle image / blob responses
            if (contentType.includes('image') || contentType.includes('octet-stream')) {
                const blob = await response.blob();
                if (containerId && format === 'image') {
                    const container = document.getElementById(containerId);
                    if (container) {
                        const objectURL = URL.createObjectURL(blob);
                        container.innerHTML = `<img src="${objectURL}" alt="Generated output" style="max-width:100%;border-radius:8px;">`;
                    }
                }
                if (onSuccess) onSuccess(blob);
                return blob;
            }

            // Handle JSON
            const json = await response.json();

            if (containerId) {
                showResult(containerId, json, format);
            }

            if (onSuccess) onSuccess(json);
            return json;

        } catch (error) {
            if (containerId) hideLoading(containerId);
            showToast(error.message, 'error');
            if (onError) onError(error);
            throw error;
        } finally {
            if (containerId) hideLoading(containerId);
            if (onFinally) onFinally();
        }
    }

    /* ========================================================================
       6. TOAST NOTIFICATIONS
       ======================================================================== */

    /**
     * Create and display a toast notification.
     *
     * @param {string} message  — Notification text.
     * @param {string} [type='info'] — 'success' | 'error' | 'warning' | 'info'.
     * @param {number} [duration=3500] — Auto-dismiss time in ms (0 = no auto-dismiss).
     */
    function showToast(message, type = 'info', duration = 3500) {
        const container = getOrCreateToastContainer();

        const toast = document.createElement('div');
        toast.className = `echo-toast echo-toast--${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };

        toast.innerHTML = `
            <span class="echo-toast__icon">${icons[type] || icons.info}</span>
            <span class="echo-toast__message">${escapeHtml(message)}</span>
            <button class="echo-toast__close" aria-label="Dismiss">&times;</button>
        `;

        // Inject styles once
        injectToastStyles();

        container.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => toast.classList.add('echo-toast--visible'));

        // Dismiss handlers
        const dismiss = () => {
            toast.classList.remove('echo-toast--visible');
            toast.classList.add('echo-toast--exit');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
            // Fallback removal
            setTimeout(() => toast.remove(), 400);
        };

        toast.querySelector('.echo-toast__close').addEventListener('click', dismiss);

        if (duration > 0) {
            setTimeout(dismiss, duration);
        }

        return dismiss;
    }

    /**
     * Get or create the toast container element.
     */
    function getOrCreateToastContainer() {
        let container = document.getElementById('echo-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'echo-toast-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;max-width:400px;pointer-events:none;';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Inject toast CSS once into the document.
     */
    let _toastStylesInjected = false;
    function injectToastStyles() {
        if (_toastStylesInjected) return;
        _toastStylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .echo-toast {
                pointer-events: auto;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: #1a2236;
                border: 1px solid #334155;
                border-radius: 8px;
                color: #f1f5f9;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
                box-shadow: 0 8px 24px rgba(0,0,0,.4);
                transform: translateX(120%);
                opacity: 0;
                transition: all .3s cubic-bezier(.4,0,.2,1);
            }
            .echo-toast--visible { transform: translateX(0); opacity: 1; }
            .echo-toast--exit { transform: translateX(120%); opacity: 0; }
            .echo-toast--success { border-left: 3px solid #10b981; }
            .echo-toast--success .echo-toast__icon { color: #10b981; font-weight:700; }
            .echo-toast--error   { border-left: 3px solid #ef4444; }
            .echo-toast--error   .echo-toast__icon { color: #ef4444; font-weight:700; }
            .echo-toast--warning { border-left: 3px solid #f59e0b; }
            .echo-toast--warning .echo-toast__icon { color: #f59e0b; font-weight:700; }
            .echo-toast--info    { border-left: 3px solid #06b6d4; }
            .echo-toast--info    .echo-toast__icon { color: #06b6d4; font-weight:700; }
            .echo-toast__icon { font-size: 16px; flex-shrink:0; }
            .echo-toast__message { flex: 1; line-height: 1.4; }
            .echo-toast__close {
                background: none; border: none; color: #64748b; cursor: pointer;
                font-size: 18px; padding: 0 2px; line-height: 1;
            }
            .echo-toast__close:hover { color: #f1f5f9; }

            @media (max-width: 480px) {
                #echo-toast-container { right:12px; left:12px; max-width:none; }
            }
        `;
        document.head.appendChild(style);
    }

    /* ========================================================================
       7. COPY TO CLIPBOARD
       ======================================================================== */

    /**
     * Copy text to the clipboard and show a success toast.
     *
     * @param {string} text — The text to copy.
     * @returns {Promise<boolean>} — True if copy succeeded.
     */
    async function copyToClipboard(text) {
        if (!text && text !== '') {
            showToast('Nothing to copy.', 'warning');
            return false;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers / non-HTTPS
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
                document.body.appendChild(textarea);
                textarea.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(textarea);
                if (!ok) throw new Error('execCommand failed');
            }
            showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            showToast('Failed to copy — try manually.', 'error');
            return false;
        }
    }

    /* ========================================================================
       8. RESULT DISPLAY — showResult()
       ======================================================================== */

    /**
     * Render a result into a container with appropriate formatting.
     *
     * @param {string} containerId — The DOM id of the result container.
     * @param {*} data — The data to display.
     * @param {string} [format='json'] — 'json' | 'html' | 'text' | 'image'.
     */
    function showResult(containerId, data, format = 'json') {
        const container = document.getElementById(containerId);
        if (!container) return;

        hideLoading(containerId);

        switch (format) {
            case 'json':
                container.innerHTML = `<pre class="echo-result echo-result--json"><code>${highlightJSON(data)}</code></pre>`;
                break;

            case 'html':
                container.innerHTML = `<div class="echo-result echo-result--html">${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</div>`;
                break;

            case 'text':
                container.innerHTML = `<pre class="echo-result echo-result--text">${escapeHtml(typeof data === 'string' ? data : JSON.stringify(data, null, 2))}</pre>`;
                break;

            case 'image':
                if (typeof data === 'string') {
                    container.innerHTML = `<img src="${escapeHtml(data)}" alt="Result" class="echo-result echo-result--image" style="max-width:100%;border-radius:8px;">`;
                }
                break;

            case 'table':
                renderTable(container, data);
                break;

            default:
                container.innerHTML = `<pre class="echo-result">${escapeHtml(typeof data === 'string' ? data : JSON.stringify(data, null, 2))}</pre>`;
        }

        // Add copy button to result containers
        addCopyButtonToResult(container, data);
    }

    /**
     * Render an array of objects as an HTML table.
     * @param {HTMLElement} container
     * @param {Array|Object} data
     */
    function renderTable(container, data) {
        if (!Array.isArray(data)) data = [data];
        if (data.length === 0) {
            container.innerHTML = '<div class="echo-result echo-result--text" style="padding:12px;color:#94a3b8;">No data to display.</div>';
            return;
        }

        const keys = Object.keys(data[0]);
        let html = '<div class="echo-result echo-result--table" style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';
        html += '<thead><tr>';
        keys.forEach((k) => {
            html += `<th style="text-align:left;padding:8px 12px;border-bottom:2px solid #334155;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(k)}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach((row, i) => {
            html += `<tr style="background:${i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)'};">`;
            keys.forEach((k) => {
                html += `<td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#cbd5e1;">${escapeHtml(String(row[k] ?? ''))}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /**
     * Add a floating copy button inside a result container.
     * @param {HTMLElement} container
     * @param {*} data
     */
    function addCopyButtonToResult(container, data) {
        const btn = document.createElement('button');
        btn.className = 'echo-copy-btn';
        btn.textContent = 'Copy';
        btn.title = 'Copy result to clipboard';
        btn.addEventListener('click', () => {
            const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            copyToClipboard(text);
        });
        btn.style.cssText = `
            position:absolute; top:8px; right:8px; padding:4px 10px; font-size:11px;
            background:rgba(6,182,212,.15); color:#06b6d4; border:1px solid rgba(6,182,212,.3);
            border-radius:4px; cursor:pointer; font-family:inherit; transition:all .2s; z-index:1;
        `;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(6,182,212,.25)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(6,182,212,.15)'; });

        container.style.position = 'relative';
        container.appendChild(btn);
    }

    /* ========================================================================
       9. LOADING STATE
       ======================================================================== */

    /**
     * Show a loading spinner inside the given container.
     * @param {string} containerId — DOM id.
     */
    function showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!container.querySelector('.echo-loading')) {
            const loader = document.createElement('div');
            loader.className = 'echo-loading';
            loader.innerHTML = `
                <div class="echo-loading__spinner"></div>
                <span class="echo-loading__text">Processing...</span>
            `;
            container.prepend(loader);
        }

        injectLoadingStyles();
    }

    /**
     * Hide and remove the loading spinner from the given container.
     * @param {string} containerId — DOM id.
     */
    function hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const loader = container.querySelector('.echo-loading');
        if (loader) loader.remove();
    }

    let _loadingStylesInjected = false;
    function injectLoadingStyles() {
        if (_loadingStylesInjected) return;
        _loadingStylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .echo-loading {
                display: flex; align-items: center; justify-content: center; gap: 10px;
                padding: 32px; color: #64748b; font-size: 13px; font-family: 'Inter', sans-serif;
            }
            .echo-loading__spinner {
                width: 20px; height: 20px; border: 2px solid #1e293b;
                border-top-color: #06b6d4; border-radius: 50%;
                animation: echo-spin .6s linear infinite;
            }
            @keyframes echo-spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }

    /* ========================================================================
       10. FORM HELPERS
       ======================================================================== */

    /**
     * Initialize auto-submit on change/blur for form inputs.
     * Listens for `input` and `change` events on elements with [data-autosubmit].
     */
    function initAutoSubmit() {
        document.querySelectorAll('[data-autosubmit]').forEach((el) => {
            const formId = el.getAttribute('data-autosubmit');
            const form = document.getElementById(formId);
            if (!form) return;

            const submit = () => {
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            };

            let debounce;
            const handler = () => {
                clearTimeout(debounce);
                debounce = setTimeout(submit, 300);
            };

            el.addEventListener('input', handler);
            el.addEventListener('change', submit);
        });
    }

    /**
     * Initialize file upload preview for inputs with [data-preview].
     * Shows a preview image inside the target element.
     */
    function initFilePreview() {
        document.querySelectorAll('input[type="file"][data-preview]').forEach((input) => {
            input.addEventListener('change', () => {
                const previewId = input.getAttribute('data-preview');
                const previewEl = document.getElementById(previewId);
                if (!previewEl) return;

                const file = input.files[0];
                if (!file) {
                    previewEl.innerHTML = '';
                    return;
                }

                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #1e293b;">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    previewEl.innerHTML = `<div style="padding:12px;color:#94a3b8;font-size:13px;">File: ${escapeHtml(file.name)} (${formatFileSize(file.size)})</div>`;
                }
            });
        });
    }

    /**
     * Basic form validation. Returns true if valid, shows errors otherwise.
     * Reads validation rules from [data-required], [data-min], [data-max], [data-pattern].
     *
     * @param {HTMLFormElement} form
     * @returns {boolean}
     */
    function validateForm(form) {
        let valid = true;
        const errors = [];

        form.querySelectorAll('input, textarea, select').forEach((field) => {
            // Clear previous error
            field.classList.remove('echo-field-error');
            const errEl = field.parentElement.querySelector('.echo-field-error-msg');
            if (errEl) errEl.remove();

            const value = field.value.trim();
            const label = field.getAttribute('data-label') || field.name || 'Field';

            // Required
            if (field.hasAttribute('data-required') && !value) {
                errors.push(`${label} is required.`);
                valid = false;
            }

            // Min length
            const min = field.getAttribute('data-min');
            if (min && value.length > 0 && value.length < parseInt(min, 10)) {
                errors.push(`${label} must be at least ${min} characters.`);
                valid = false;
            }

            // Max length
            const max = field.getAttribute('data-max');
            if (max && value.length > parseInt(max, 10)) {
                errors.push(`${label} must be no more than ${max} characters.`);
                valid = false;
            }

            // Pattern
            const pattern = field.getAttribute('data-pattern');
            if (pattern && value && !new RegExp(pattern).test(value)) {
                errors.push(`${label} format is invalid.`);
                valid = false;
            }

            if (!valid) {
                field.classList.add('echo-field-error');
            }
        });

        if (errors.length > 0) {
            showToast(errors[0], 'warning');
        }

        return valid;
    }

    /* ========================================================================
       11. TAB SWITCHING
       ======================================================================== */

    /**
     * Initialize tab panels. Works with:
     *   - [data-tab-group] on the container
     *   - [data-tab-target="tabId"] on tab buttons
     *   - [data-tab-panel="tabId"] on panel elements
     */
    function initTabs() {
        document.querySelectorAll('[data-tab-group]').forEach((group) => {
            const buttons = group.querySelectorAll('[data-tab-target]');

            buttons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const targetId = btn.getAttribute('data-tab-target');

                    // Deactivate all buttons and panels in this group
                    buttons.forEach((b) => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    group.querySelectorAll('[data-tab-panel]').forEach((panel) => {
                        panel.classList.remove('active');
                        panel.hidden = true;
                    });

                    // Activate clicked
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');

                    const targetPanel = group.querySelector(`[data-tab-panel="${targetId}"]`);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                        targetPanel.hidden = false;
                    }
                });
            });
        });

        // Inject tab styles
        injectTabStyles();
    }

    let _tabStylesInjected = false;
    function injectTabStyles() {
        if (_tabStylesInjected) return;
        _tabStylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            [data-tab-target] {
                padding: 8px 16px; font-size: 13px; font-family: 'Inter', sans-serif;
                background: transparent; border: 1px solid #1e293b; border-bottom: none;
                border-radius: 6px 6px 0 0; color: #94a3b8; cursor: pointer;
                transition: all .2s; margin-right: 2px;
            }
            [data-tab-target]:hover { color: #f1f5f9; background: rgba(255,255,255,.03); }
            [data-tab-target].active {
                color: #06b6d4; background: #1a2236; border-color: #334155;
                border-bottom: 1px solid #1a2236; position: relative; z-index: 1;
            }
            [data-tab-panel] { display: none; padding: 16px; }
            [data-tab-panel].active { display: block; }
        `;
        document.head.appendChild(style);
    }

    /* ========================================================================
       12. DIFF RENDERER
       ======================================================================== */

    /**
     * Render a side-by-side diff view inside the given container.
     *
     * @param {string} containerId — DOM id.
     * @param {object} diffData — { left: string, right: string } or { hunks: Array }.
     */
    function renderDiff(containerId, diffData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // If raw left/right strings are provided, compute a simple line diff
        const leftLines = (diffData.left || '').split('\n');
        const rightLines = (diffData.right || '').split('\n');

        let html = `<div class="echo-diff"><div class="echo-diff__columns">`;
        html += `<div class="echo-diff__pane"><div class="echo-diff__header">Before</div><pre class="echo-diff__code">`;
        html += renderDiffLines(leftLines, rightLines, 'left');
        html += `</pre></div>`;
        html += `<div class="echo-diff__pane"><div class="echo-diff__header">After</div><pre class="echo-diff__code">`;
        html += renderDiffLines(leftLines, rightLines, 'right');
        html += `</pre></div>`;
        html += `</div></div>`;

        container.innerHTML = html;
        injectDiffStyles();
    }

    /**
     * Render individual diff lines with color coding.
     */
    function renderDiffLines(left, right, side) {
        // Simple LCS-based diff for demonstration
        const maxLen = Math.max(left.length, right.length);
        let html = '';
        const added = [];
        const removed = [];

        // Mark differences
        for (let i = 0; i < maxLen; i++) {
            if (i >= left.length) added.push(i);
            else if (i >= right.length) removed.push(i);
            else if (left[i] !== right[i]) { removed.push(i); added.push(i); }
        }

        const lines = side === 'left' ? left : right;
        const diffSet = side === 'left' ? removed : added;

        lines.forEach((line, i) => {
            let cls = 'echo-diff__line';
            if (diffSet.includes(i)) {
                cls += side === 'left' ? ' echo-diff__line--removed' : ' echo-diff__line--added';
            }
            html += `<div class="${cls}"><span class="echo-diff__num">${i + 1}</span>${escapeHtml(line)}</div>`;
        });

        return html;
    }

    let _diffStylesInjected = false;
    function injectDiffStyles() {
        if (_diffStylesInjected) return;
        _diffStylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .echo-diff { border: 1px solid #1e293b; border-radius: 8px; overflow: hidden; }
            .echo-diff__columns { display: grid; grid-template-columns: 1fr 1fr; }
            .echo-diff__pane { border-right: 1px solid #1e293b; }
            .echo-diff__pane:last-child { border-right: none; }
            .echo-diff__header {
                padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
                font-weight: 600; color: #94a3b8; background: #111827; border-bottom: 1px solid #1e293b;
            }
            .echo-diff__code {
                margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px;
                line-height: 1.6; overflow: auto; max-height: 500px; background: #0a0e17;
            }
            .echo-diff__line {
                display: flex; padding: 0 12px; min-height: 24px; border-bottom: 1px solid rgba(255,255,255,.02);
            }
            .echo-diff__line--added { background: rgba(16,185,129,.1); color: #10b981; }
            .echo-diff__line--removed { background: rgba(239,68,68,.1); color: #ef4444; }
            .echo-diff__num {
                display: inline-block; width: 40px; text-align: right; padding-right: 12px;
                color: #475569; user-select: none; flex-shrink: 0;
            }
            @media (max-width: 768px) { .echo-diff__columns { grid-template-columns: 1fr; } .echo-diff__pane { border-right: none; border-bottom: 1px solid #1e293b; } }
        `;
        document.head.appendChild(style);
    }

    /* ========================================================================
       13. CODE HIGHLIGHTING
       ======================================================================== */

    /**
     * Basic syntax highlighting for JSON output.
     * @param {*} data
     * @returns {string} HTML string with syntax-colored spans.
     */
    function highlightJSON(data) {
        const json = JSON.stringify(data, null, 2);
        return escapeHtml(json)
            .replace(/("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
                let cls = 'echo-hl-string';
                if (match.endsWith(':')) cls = 'echo-hl-key';
                return `<span class="${cls}">${match}</span>`;
            })
            .replace(/\b(true|false|null)\b/g, '<span class="echo-hl-bool">$1</span>')
            .replace(/\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, '<span class="echo-hl-num">$1</span>');
    }

    /**
     * Basic syntax highlighting for displayed code (generic).
     * Detects keywords in common languages.
     *
     * @param {string} code — Raw code string.
     * @param {string} [lang='text'] — Language hint.
     * @returns {string} HTML with highlighted spans.
     */
    function highlightCode(code, lang = 'text') {
        const escaped = escapeHtml(code);

        const keywords = {
            javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|switch|case|break|default|typeof|instanceof|in|of|do|continue|yield)\b/g,
            python: /\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|async|await|lambda|yield|pass|raise|and|or|not|is|in|True|False|None)\b/g,
            html: /(&lt;\/?[\w-]+)/g,
            css: /([\w-]+)\s*:/g,
            sql: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|DISTINCT|UNION|VALUES|INTO|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CONSTRAINT|UNIQUE|CHECK)\b/gi,
        };

        let highlighted = escaped;

        if (keywords[lang]) {
            highlighted = highlighted.replace(keywords[lang], '<span class="echo-hl-keyword">$1</span>');
        }

        // Strings (generic)
        highlighted = highlighted.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="echo-hl-string">$1</span>');
        highlighted = highlighted.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="echo-hl-string">$1</span>');

        // Comments
        highlighted = highlighted.replace(/(\/\/[^\n]*)/g, '<span class="echo-hl-comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="echo-hl-comment">$1</span>');
        highlighted = highlighted.replace(/(#[^\n]*)/g, '<span class="echo-hl-comment">$1</span>');

        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="echo-hl-num">$1</span>');

        return highlighted;
    }

    let _hlStylesInjected = false;
    function injectHighlightStyles() {
        if (_hlStylesInjected) return;
        _hlStylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .echo-hl-key    { color: #06b6d4; }
            .echo-hl-string { color: #a855f7; }
            .echo-hl-bool   { color: #f59e0b; }
            .echo-hl-num    { color: #10b981; }
            .echo-hl-comment { color: #475569; font-style: italic; }
            .echo-hl-keyword { color: #ec4899; font-weight: 500; }
        `;
        document.head.appendChild(style);
    }

    /* ========================================================================
       14. DOWNLOAD HELPER
       ======================================================================== */

    /**
     * Trigger a file download in the browser.
     *
     * @param {string} filename — The name of the file to download (e.g., 'output.json').
     * @param {string} content — The file content.
     * @param {string} [type='text/plain'] — MIME type.
     */
    function downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        showToast(`Downloaded ${filename}`, 'success');
    }

    /* ========================================================================
       15. UTILITY HELPERS
       ======================================================================== */

    /**
     * Escape HTML entities in a string to prevent XSS.
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, (c) => map[c]);
    }

    /**
     * Format a byte count into a human-readable size string.
     * @param {number} bytes
     * @returns {string}
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
    }

    /**
     * Debounce a function call.
     * @param {Function} fn
     * @param {number} delay
     * @returns {Function}
     */
    function debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    /**
     * Generate a unique ID string.
     * @returns {string}
     */
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /* ========================================================================
       16. INITIALIZATION
       ======================================================================== */

    /**
     * Initialize all dashboard features when the DOM is ready.
     * Call this once on page load.
     */
    function init() {
        initSearch();
        initBackToTop();
        initAutoSubmit();
        initFilePreview();
        initTabs();
        injectHighlightStyles();

        // Active nav link tracking on scroll
        initScrollSpy();
    }

    /**
     * Highlight the active sidebar nav link based on scroll position.
     */
    function initScrollSpy() {
        const sections = document.querySelectorAll('.category-section[id], #hero');
        const navLinks = document.querySelectorAll('.nav-link');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach((link) => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0,
        });

        sections.forEach((section) => observer.observe(section));
    }

    /* ========================================================================
       PUBLIC API
       ======================================================================== */

    return {
        init,
        // Search
        filterTools,
        clearSearch,
        // Sidebar
        toggleSidebar,
        closeSidebar,
        toggleNavSection,
        expandAll,
        collapseAll,
        // API
        echoAPI,
        // UI
        showToast,
        copyToClipboard,
        showResult,
        showLoading,
        hideLoading,
        // Display
        renderDiff,
        highlightJSON,
        highlightCode,
        renderTable,
        // File
        downloadFile,
        // Forms
        initAutoSubmit,
        initFilePreview,
        validateForm,
        // Tabs
        initTabs,
        // Utilities
        escapeHtml,
        formatFileSize,
        debounce,
        uid,
    };

})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', EchoApp.init);
} else {
    EchoApp.init();
}
