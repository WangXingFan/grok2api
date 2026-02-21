(() => {
  const modelSelect = document.getElementById('modelSelect');
  const reasoningSelect = document.getElementById('reasoningSelect');
  const tempRange = document.getElementById('tempRange');
  const tempValue = document.getElementById('tempValue');
  const topPRange = document.getElementById('topPRange');
  const topPValue = document.getElementById('topPValue');
  const systemInput = document.getElementById('systemInput');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const chatLog = document.getElementById('chatLog');
  const emptyState = document.getElementById('emptyState');
  const statusText = document.getElementById('statusText');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const fileBadge = document.getElementById('fileBadge');
  const fileName = document.getElementById('fileName');
  const fileRemoveBtn = document.getElementById('fileRemoveBtn');

  let messageHistory = [];
  let isSending = false;
  let abortController = null;
  let attachment = null;
  const feedbackUrl = 'https://github.com/chenyme/grok2api/issues/new';

  function toast(message, type) {
    if (typeof showToast === 'function') {
      showToast(message, type);
    }
  }

  function setStatus(state, text) {
    if (!statusText) return;
    statusText.textContent = text || '就绪';
    statusText.classList.remove('connected', 'connecting', 'error');
    if (state) statusText.classList.add(state);
  }

  function setSendingState(sending) {
    isSending = sending;
    if (sendBtn) sendBtn.disabled = sending;
  }

  function updateRangeValues() {
    if (tempValue && tempRange) {
      tempValue.textContent = Number(tempRange.value).toFixed(2);
    }
    if (topPValue && topPRange) {
      topPValue.textContent = Number(topPRange.value).toFixed(2);
    }
  }

  function scrollToBottom() {
    const body = document.scrollingElement || document.documentElement;
    if (!body) return;
    const hasOwnScroll = chatLog && chatLog.scrollHeight > chatLog.clientHeight + 1;
    if (hasOwnScroll) {
      chatLog.scrollTop = chatLog.scrollHeight;
      return;
    }
    body.scrollTop = body.scrollHeight;
  }

  function hideEmptyState() {
    if (emptyState) emptyState.classList.add('hidden');
  }

  function showEmptyState() {
    if (emptyState) emptyState.classList.remove('hidden');
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderBasicMarkdown(rawText) {
    const text = (rawText || '').replace(/\\n/g, '\n');
    const escaped = escapeHtml(text);
    const codeBlocks = [];
    const fenced = escaped.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const safeLang = lang ? escapeHtml(lang) : '';
      const html = `<pre class="code-block"><code${safeLang ? ` class="language-${safeLang}"` : ''}>${code}</code></pre>`;
      const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(html);
      return token;
    });

    const renderInline = (value) => {
      let output = value
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');

      output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        const safeAlt = escapeHtml(alt || 'image');
        const safeUrl = escapeHtml(url || '');
        return `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy">`;
      });

      output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
        const safeLabel = escapeHtml(label || '');
        const safeUrl = escapeHtml(url || '');
        return `<a href="${safeUrl}" target="_blank" rel="noopener">${safeLabel}</a>`;
      });

      output = output.replace(/(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/g, (match, uri) => {
        const safeUrl = escapeHtml(uri || '');
        return `<img src="${safeUrl}" alt="image" loading="lazy">`;
      });

      return output;
    };

    const lines = fenced.split(/\r?\n/);
    const htmlParts = [];
    let inUl = false;
    let inOl = false;
    let inTable = false;
    let paragraphLines = [];

    const closeLists = () => {
      if (inUl) {
        htmlParts.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
    };

    const closeTable = () => {
      if (inTable) {
        htmlParts.push('</tbody></table>');
        inTable = false;
      }
    };

    const flushParagraph = () => {
      if (!paragraphLines.length) return;
      const joined = paragraphLines.join('<br>');
      htmlParts.push(`<p>${renderInline(joined)}</p>`);
      paragraphLines = [];
    };

    const isTableSeparator = (line) => /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/.test(line);
    const splitTableRow = (line) => {
      const trimmed = line.trim();
      const row = trimmed.replace(/^\|/, '').replace(/\|$/, '');
      return row.split('|').map(cell => cell.trim());
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        closeLists();
        closeTable();
        continue;
      }

      const codeTokenMatch = trimmed.match(/^@@CODEBLOCK_(\d+)@@$/);
      if (codeTokenMatch) {
        flushParagraph();
        closeLists();
        closeTable();
        htmlParts.push(trimmed);
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        closeLists();
        closeTable();
        const level = headingMatch[1].length;
        htmlParts.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
        continue;
      }

      if (trimmed.includes('|')) {
        const nextLine = lines[i + 1] || '';
        if (!inTable && isTableSeparator(nextLine.trim())) {
          flushParagraph();
          closeLists();
          const headers = splitTableRow(trimmed);
          htmlParts.push('<div class="table-wrap"><table><thead><tr>');
          headers.forEach(cell => htmlParts.push(`<th>${renderInline(cell)}</th>`));
          htmlParts.push('</tr></thead><tbody>');
          inTable = true;
          i += 1;
          continue;
        }
        if (inTable && !isTableSeparator(trimmed)) {
          const cells = splitTableRow(trimmed);
          htmlParts.push('<tr>');
          cells.forEach(cell => htmlParts.push(`<td>${renderInline(cell)}</td>`));
          htmlParts.push('</tr>');
          continue;
        }
      }

      const ulMatch = trimmed.match(/^[-*+•·]\s+(.*)$/);
      if (ulMatch) {
        flushParagraph();
        if (!inUl) {
          closeLists();
          closeTable();
          htmlParts.push('<ul>');
          inUl = true;
        }
        htmlParts.push(`<li>${renderInline(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = trimmed.match(/^\d+[.)、]\s+(.*)$/);
      if (olMatch) {
        flushParagraph();
        if (!inOl) {
          closeLists();
          closeTable();
          htmlParts.push('<ol>');
          inOl = true;
        }
        htmlParts.push(`<li>${renderInline(olMatch[1])}</li>`);
        continue;
      }

      paragraphLines.push(trimmed);
    }

    flushParagraph();
    closeLists();
    closeTable();

    let output = htmlParts.join('');
    codeBlocks.forEach((html, index) => {
      output = output.replace(`@@CODEBLOCK_${index}@@`, html);
    });
    return output;
  }

  function parseThinkSections(raw) {
    const parts = [];
    let cursor = 0;
    while (cursor < raw.length) {
      const start = raw.indexOf('<think>', cursor);
      if (start === -1) {
        parts.push({ type: 'text', value: raw.slice(cursor) });
        break;
      }
      if (start > cursor) {
        parts.push({ type: 'text', value: raw.slice(cursor, start) });
      }
      const thinkStart = start + 7;
      const end = raw.indexOf('</think>', thinkStart);
      if (end === -1) {
        parts.push({ type: 'think', value: raw.slice(thinkStart), open: true });
        cursor = raw.length;
      } else {
        parts.push({ type: 'think', value: raw.slice(thinkStart, end), open: false });
        cursor = end + 8;
      }
    }
    return parts;
  }

  function parseRolloutBlocks(text) {
    const lines = (text || '').split(/\r?\n/);
    const blocks = [];
    let current = null;
    for (const line of lines) {
      const match = line.match(/^\s*\[([^\]]+)\]\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        if (current) blocks.push(current);
        current = { id: match[1], type: match[2], lines: [] };
        if (match[3]) current.lines.push(match[3]);
        continue;
      }
      if (current) {
        current.lines.push(line);
      }
    }
    if (current) blocks.push(current);
    return blocks;
  }

  function parseAgentSections(text) {
    const lines = (text || '').split(/\r?\n/);
    const sections = [];
    let current = { title: null, lines: [] };
    let hasAgentHeading = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        current.lines.push(line);
        continue;
      }
      const agentMatch = trimmed.match(/^(Grok\\s+Leader|Agent\\s*\\d+|Grok\\s+Agent\\s*\\d+)$/i);
      if (agentMatch) {
        hasAgentHeading = true;
        if (current.lines.length) {
          sections.push(current);
        }
        current = { title: agentMatch[1], lines: [] };
        continue;
      }
      current.lines.push(line);
    }
    if (current.lines.length) {
      sections.push(current);
    }
    if (!hasAgentHeading) {
      return [{ title: null, lines }];
    }
    return sections;
  }

  function renderThinkContent(text, openAll) {
    const sections = parseAgentSections(text);
    if (!sections.length) {
      return renderBasicMarkdown(text);
    }
    const renderGroups = (blocks, openAllGroups) => {
      const groups = [];
      const map = new Map();
      for (const block of blocks) {
        const key = block.id;
        let group = map.get(key);
        if (!group) {
          group = { id: key, items: [] };
          map.set(key, group);
          groups.push(group);
        }
        group.items.push(block);
      }
      return groups.map((group) => {
        const items = group.items.map((item) => {
          const body = renderBasicMarkdown(item.lines.join('\n').trim());
          const typeText = escapeHtml(item.type);
          const typeKey = String(item.type || '').trim().toLowerCase().replace(/\s+/g, '');
          const typeAttr = escapeHtml(typeKey);
          return `<div class="think-item-row"><div class="think-item-type" data-type="${typeAttr}">${typeText}</div><div class="think-item-body">${body || '<em>（空）</em>'}</div></div>`;
        }).join('');
        const title = escapeHtml(group.id);
        const openAttr = openAllGroups ? ' open' : '';
        return `<details class="think-rollout-group"${openAttr}><summary><span class="think-rollout-title">${title}</span></summary><div class="think-rollout-body">${items}</div></details>`;
      }).join('');
    };

    const agentBlocks = sections.map((section, idx) => {
      const blocks = parseRolloutBlocks(section.lines.join('\n'));
      const inner = blocks.length
        ? renderGroups(blocks, openAll)
        : `<div class="think-rollout-body">${renderBasicMarkdown(section.lines.join('\\n').trim())}</div>`;
      if (!section.title) {
        return `<div class="think-agent-items">${inner}</div>`;
      }
      const title = escapeHtml(section.title);
      const openAttr = openAll ? ' open' : (idx === 0 ? ' open' : '');
      return `<details class="think-agent"${openAttr}><summary>${title}</summary><div class="think-agent-items">${inner}</div></details>`;
    });
    return `<div class="think-agents">${agentBlocks.join('')}</div>`;
  }

  function renderMarkdown(text) {
    const raw = text || '';
    const parts = parseThinkSections(raw);
    return parts.map((part) => {
      if (part.type === 'think') {
        const body = renderThinkContent(part.value.trim(), part.open);
        const openAttr = part.open ? ' open' : '';
        return `<details class="think-block" data-think="true"${openAttr}><summary class="think-summary">思考</summary><div class="think-content">${body || '<em>（空）</em>'}</div></details>`;
      }
      return renderBasicMarkdown(part.value);
    }).join('');
  }

  function createMessage(role, content) {
    if (!chatLog) return null;
    hideEmptyState();
    const row = document.createElement('div');
    row.className = `message-row ${role === 'user' ? 'user' : 'assistant'}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    const contentNode = document.createElement('div');
    contentNode.className = 'message-content';
    contentNode.textContent = content || '';
    bubble.appendChild(contentNode);
    row.appendChild(bubble);

    chatLog.appendChild(row);
    scrollToBottom();
    const entry = {
      row,
      contentNode,
      role,
      raw: content || '',
      committed: false,
      startedAt: Date.now(),
      firstTokenAt: null,
      hasThink: false,
      thinkElapsed: null
    };
    return entry;
  }

  function applyImageGrid(root) {
    if (!root) return;
    const isIgnorable = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return !node.textContent.trim();
      }
      return node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR';
    };

    const isImageLink = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'A') return false;
      const children = Array.from(node.childNodes);
      if (!children.length) return false;
      return children.every((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          return !child.textContent.trim();
        }
        return child.nodeType === Node.ELEMENT_NODE && child.tagName === 'IMG';
      });
    };

    const extractImageItems = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
      if (node.classList && node.classList.contains('img-grid')) return null;
      if (node.tagName === 'IMG') {
        return { items: [node], removeNode: null };
      }
      if (isImageLink(node)) {
        return { items: [node], removeNode: null };
      }
      if (node.tagName === 'P') {
        const items = [];
        const children = Array.from(node.childNodes);
        if (!children.length) return null;
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE) {
            if (!child.textContent.trim()) continue;
            return null;
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            if (child.tagName === 'IMG' || isImageLink(child)) {
              items.push(child);
              continue;
            }
            if (child.tagName === 'BR') continue;
            return null;
          }
          return null;
        }
        if (!items.length) return null;
        return { items, removeNode: node };
      }
      return null;
    };

    const wrapImagesInContainer = (container) => {
      const children = Array.from(container.childNodes);
      let group = [];
      let groupStart = null;
      let removeNodes = [];

      const flush = () => {
        if (group.length < 2) {
          group = [];
          groupStart = null;
          removeNodes = [];
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'img-grid';
        const cols = Math.min(4, group.length);
        wrapper.style.setProperty('--cols', String(cols));
        if (groupStart) {
          container.insertBefore(wrapper, groupStart);
        } else {
          container.appendChild(wrapper);
        }
        group.forEach((img) => wrapper.appendChild(img));
        removeNodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
        group = [];
        groupStart = null;
        removeNodes = [];
      };

      children.forEach((node) => {
        if (group.length && isIgnorable(node)) {
          removeNodes.push(node);
          return;
        }
        const extracted = extractImageItems(node);
        if (extracted && extracted.items.length) {
          if (!groupStart) groupStart = node;
          group.push(...extracted.items);
          if (extracted.removeNode) {
            removeNodes.push(extracted.removeNode);
          }
          return;
        }
        flush();
      });
      flush();
    };

    const containers = [root, ...root.querySelectorAll('.think-content, .think-item-body, .think-rollout-body, .think-agent-items')];
    containers.forEach((container) => {
      if (!container || container.closest('.img-grid')) return;
      if (!container.querySelector || !container.querySelector('img')) return;
      wrapImagesInContainer(container);
    });
  }

  function updateMessage(entry, content, finalize = false) {
    if (!entry) return;
    entry.raw = content || '';
    if (!entry.contentNode) return;
    if (!entry.hasThink && entry.raw.includes('<think>')) {
      entry.hasThink = true;
    }
    if (finalize) {
      entry.contentNode.classList.add('rendered');
      entry.contentNode.innerHTML = renderMarkdown(entry.raw);
    } else {
      if (entry.role === 'assistant') {
        entry.contentNode.innerHTML = renderMarkdown(entry.raw);
      } else {
        entry.contentNode.textContent = entry.raw;
      }
    }
    if (entry.hasThink) {
      updateThinkSummary(entry, entry.thinkElapsed);
    }
    if (entry.role === 'assistant') {
      applyImageGrid(entry.contentNode);
      const thinkNodes = entry.contentNode.querySelectorAll('.think-content');
      thinkNodes.forEach((node) => {
        node.scrollTop = node.scrollHeight;
      });
      enhanceBrokenImages(entry.contentNode);
      if (finalize && entry.row && !entry.row.querySelector('.message-actions')) {
        attachAssistantActions(entry);
      }
    }
    scrollToBottom();
  }

  function enhanceBrokenImages(root) {
    if (!root) return;
    const images = root.querySelectorAll('img');
    images.forEach((img) => {
      if (img.dataset.retryBound) return;
      img.dataset.retryBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.failed) return;
        img.dataset.failed = '1';
        const wrapper = document.createElement('button');
        wrapper.type = 'button';
        wrapper.className = 'img-retry';
        wrapper.textContent = '点击重试';
        wrapper.addEventListener('click', () => {
          wrapper.classList.add('loading');
          const original = img.getAttribute('src') || '';
          const cacheBust = original.includes('?') ? '&' : '?';
          img.dataset.failed = '';
          img.src = `${original}${cacheBust}t=${Date.now()}`;
        });
        img.replaceWith(wrapper);
      });
      img.addEventListener('load', () => {
        if (img.dataset.failed) {
          img.dataset.failed = '';
        }
      });
    });
  }

  function updateThinkSummary(entry, elapsedSec) {
    if (!entry || !entry.contentNode) return;
    const summaries = entry.contentNode.querySelectorAll('.think-summary');
    if (!summaries.length) return;
    const text = typeof elapsedSec === 'number' ? `思考 ${elapsedSec} 秒` : '思考中';
    summaries.forEach((node) => {
      node.textContent = text;
      const block = node.closest('.think-block');
      if (!block) return;
      if (typeof elapsedSec === 'number') {
        block.removeAttribute('data-thinking');
      } else {
        block.setAttribute('data-thinking', 'true');
      }
    });
  }

  function clearChat() {
    messageHistory = [];
    if (chatLog) {
      chatLog.innerHTML = '';
    }
    showEmptyState();
  }

  function buildMessages() {
    return buildMessagesFrom(messageHistory);
  }

  function buildMessagesFrom(history) {
    const payload = [];
    const systemPrompt = systemInput ? systemInput.value.trim() : '';
    if (systemPrompt) {
      payload.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of history) {
      payload.push({ role: msg.role, content: msg.content });
    }
    return payload;
  }

  function buildPayload() {
    const payload = {
      model: (modelSelect && modelSelect.value) || 'grok-3',
      messages: buildMessages(),
      stream: true,
      temperature: Number(tempRange ? tempRange.value : 0.8),
      top_p: Number(topPRange ? topPRange.value : 0.95)
    };
    const reasoning = reasoningSelect ? reasoningSelect.value : '';
    if (reasoning) {
      payload.reasoning_effort = reasoning;
    }
    return payload;
  }

  function buildPayloadFrom(history) {
    const payload = {
      model: (modelSelect && modelSelect.value) || 'grok-3',
      messages: buildMessagesFrom(history),
      stream: true,
      temperature: Number(tempRange ? tempRange.value : 0.8),
      top_p: Number(topPRange ? topPRange.value : 0.95)
    };
    const reasoning = reasoningSelect ? reasoningSelect.value : '';
    if (reasoning) {
      payload.reasoning_effort = reasoning;
    }
    return payload;
  }

  async function loadModels() {
    if (!modelSelect) return;
    modelSelect.innerHTML = '';
    const fallback = ['grok-4.1-fast', 'grok-4', 'grok-3', 'grok-3-mini', 'grok-3-thinking', 'grok-4.20-beta'];
    const preferred = 'grok-4.20-beta';
    try {
      const res = await fetch('/v1/models', { cache: 'no-store' });
      if (!res.ok) throw new Error('models fetch failed');
      const data = await res.json();
      const items = Array.isArray(data && data.data) ? data.data : [];
      const ids = items
        .map(item => item && item.id)
        .filter(Boolean)
        .filter(id => !String(id).startsWith('grok-imagine'))
        .filter(id => !String(id).includes('video'));
      const list = ids.length ? ids : fallback;
      list.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        modelSelect.appendChild(option);
      });
      if (list.includes(preferred)) {
        modelSelect.value = preferred;
      } else {
        modelSelect.value = list[list.length - 1] || preferred;
      }
    } catch (e) {
      fallback.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        modelSelect.appendChild(option);
      });
      modelSelect.value = preferred;
    }
  }

  function showAttachmentBadge() {
    if (!fileBadge || !fileName) return;
    if (attachment) {
      fileName.textContent = attachment.name;
      fileBadge.classList.remove('hidden');
    } else {
      fileBadge.classList.add('hidden');
      fileName.textContent = '';
    }
  }

  function clearAttachment() {
    attachment = null;
    if (fileInput) fileInput.value = '';
    showAttachmentBadge();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileSelect(file) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      attachment = {
        name: file.name || 'file',
        data: dataUrl
      };
      showAttachmentBadge();
    } catch (e) {
      toast('文件读取失败', 'error');
    }
  }

  function createActionButton(label, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.type = 'button';
    btn.textContent = label;
    if (title) btn.title = title;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function attachAssistantActions(entry) {
    if (!entry || !entry.row) return;
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const retryBtn = createActionButton('重试', '重试上一条回答', () => retryLast());
    const copyBtn = createActionButton('复制', '复制回答内容', () => copyToClipboard(entry.raw || ''));
    const feedbackBtn = createActionButton('反馈', '反馈到 Grok2API', () => {
      window.open(feedbackUrl, '_blank', 'noopener');
    });

    actions.appendChild(retryBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(feedbackBtn);
    entry.row.appendChild(actions);
  }

  async function copyToClipboard(text) {
    if (!text) {
      toast('暂无内容可复制', 'error');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      toast('已复制', 'success');
    } catch (e) {
      toast('复制失败', 'error');
    }
  }

  async function retryLast() {
    if (isSending) return;
    if (!messageHistory.length) return;
    let lastUserIndex = -1;
    for (let i = messageHistory.length - 1; i >= 0; i -= 1) {
      if (messageHistory[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) {
      toast('没有可重试的对话', 'error');
      return;
    }
    const historySlice = messageHistory.slice(0, lastUserIndex + 1);
    const assistantEntry = createMessage('assistant', '');
    setSendingState(true);
    setStatus('connecting', '发送中');

    abortController = new AbortController();
    const payload = buildPayloadFrom(historySlice);

    let headers = { 'Content-Type': 'application/json' };
    try {
      const authHeader = await ensurePublicKey();
      headers = { ...headers, ...buildAuthHeaders(authHeader) };
    } catch (e) {
      // ignore auth helper failures
    }

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`);
      }

      await handleStream(res, assistantEntry);
      setStatus('connected', '完成');
    } catch (e) {
      updateMessage(assistantEntry, `请求失败: ${e.message || e}`, true);
      setStatus('error', '失败');
      toast('请求失败，请检查服务状态', 'error');
    } finally {
      setSendingState(false);
      abortController = null;
      scrollToBottom();
    }
  }

  async function sendMessage() {
    if (isSending) return;
    const prompt = promptInput ? promptInput.value.trim() : '';
    if (!prompt && !attachment) {
      toast('请输入内容', 'error');
      return;
    }

    let displayText = prompt || '';
    if (attachment) {
      const label = `[文件] ${attachment.name}`;
      displayText = displayText ? `${displayText}\n${label}` : label;
    }

    createMessage('user', displayText);

    let content = prompt;
    if (attachment) {
      const blocks = [];
      if (prompt) {
        blocks.push({ type: 'text', text: prompt });
      }
      blocks.push({ type: 'file', file: { file_data: attachment.data } });
      content = blocks;
    }

    messageHistory.push({ role: 'user', content });
    if (promptInput) promptInput.value = '';
    clearAttachment();

    const assistantEntry = createMessage('assistant', '');
    setSendingState(true);
    setStatus('connecting', '发送中');

    abortController = new AbortController();
    const payload = buildPayload();

    let headers = { 'Content-Type': 'application/json' };
    try {
      const authHeader = await ensurePublicKey();
      headers = { ...headers, ...buildAuthHeaders(authHeader) };
    } catch (e) {
      // ignore auth helper failures
    }

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortController.signal
      });

      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`);
      }

      await handleStream(res, assistantEntry);
      setStatus('connected', '完成');
    } catch (e) {
      if (e && e.name === 'AbortError') {
        updateMessage(assistantEntry, assistantEntry.raw || '已停止', true);
        if (assistantEntry.hasThink) {
          const elapsed = assistantEntry.thinkElapsed || Math.max(1, Math.round((Date.now() - assistantEntry.startedAt) / 1000));
          updateThinkSummary(assistantEntry, elapsed);
        }
        setStatus('error', '已停止');
        if (!assistantEntry.committed) {
          messageHistory.push({ role: 'assistant', content: assistantEntry.raw || '' });
          assistantEntry.committed = true;
        }
      } else {
        updateMessage(assistantEntry, `请求失败: ${e.message || e}`, true);
        setStatus('error', '失败');
        toast('请求失败，请检查服务状态', 'error');
      }
    } finally {
      setSendingState(false);
      abortController = null;
      scrollToBottom();
    }
  }

  async function handleStream(res, assistantEntry) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let assistantText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const lines = part.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            updateMessage(assistantEntry, assistantText, true);
            if (assistantEntry.hasThink) {
              const elapsed = assistantEntry.thinkElapsed || Math.max(1, Math.round((Date.now() - assistantEntry.startedAt) / 1000));
              updateThinkSummary(assistantEntry, elapsed);
            }
            messageHistory.push({ role: 'assistant', content: assistantText });
            assistantEntry.committed = true;
            return;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json && json.choices && json.choices[0] && json.choices[0].delta
              ? json.choices[0].delta.content
              : '';
            if (delta) {
              assistantText += delta;
              if (!assistantEntry.firstTokenAt) {
                assistantEntry.firstTokenAt = Date.now();
              }
              if (!assistantEntry.hasThink && assistantText.includes('<think>')) {
                assistantEntry.hasThink = true;
                assistantEntry.thinkElapsed = null;
                updateThinkSummary(assistantEntry, null);
              }
              updateMessage(assistantEntry, assistantText, false);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
    updateMessage(assistantEntry, assistantText, true);
    if (assistantEntry.hasThink) {
      const elapsed = assistantEntry.thinkElapsed || Math.max(1, Math.round((Date.now() - assistantEntry.startedAt) / 1000));
      updateThinkSummary(assistantEntry, elapsed);
    }
    messageHistory.push({ role: 'assistant', content: assistantText });
    assistantEntry.committed = true;
  }

  function toggleSettings(show) {
    if (!settingsPanel) return;
    if (typeof show === 'boolean') {
      settingsPanel.classList.toggle('hidden', !show);
      return;
    }
    settingsPanel.classList.toggle('hidden');
  }

  function bindEvents() {
    if (tempRange) tempRange.addEventListener('input', updateRangeValues);
    if (topPRange) topPRange.addEventListener('input', updateRangeValues);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (settingsToggle) {
      settingsToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSettings();
      });
    }
    document.addEventListener('click', (event) => {
      if (!settingsPanel || settingsPanel.classList.contains('hidden')) return;
      if (settingsPanel.contains(event.target) || (settingsToggle && settingsToggle.contains(event.target))) {
        return;
      }
      toggleSettings(false);
    });
    if (promptInput) {
      let composing = false;
      promptInput.addEventListener('compositionstart', () => {
        composing = true;
      });
      promptInput.addEventListener('compositionend', () => {
        composing = false;
      });
      promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          if (composing || event.isComposing) return;
          event.preventDefault();
          sendMessage();
        }
      });
    }
    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          handleFileSelect(fileInput.files[0]);
        }
      });
    }
    if (fileRemoveBtn) {
      fileRemoveBtn.addEventListener('click', clearAttachment);
    }
  }

  updateRangeValues();
  loadModels();
  bindEvents();
})();
