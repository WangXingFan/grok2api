(() => {
  const generateBtn = document.getElementById('generateBtn');
  const stopBtn = document.getElementById('stopBtn');
  const promptInput = document.getElementById('promptInput');
  const ratioSelect = document.getElementById('ratioSelect');
  const lengthSelect = document.getElementById('lengthSelect');
  const resolutionSelect = document.getElementById('resolutionSelect');
  const presetSelect = document.getElementById('presetSelect');
  const streamToggle = document.getElementById('streamToggle');
  const statusText = document.getElementById('statusText');
  const statusRatio = document.getElementById('statusRatio');
  const statusLength = document.getElementById('statusLength');
  const statusResolution = document.getElementById('statusResolution');
  const statusPreset = document.getElementById('statusPreset');
  const videoEmpty = document.getElementById('videoEmpty');
  const videoProgress = document.getElementById('videoProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const videoPlayer = document.getElementById('videoPlayer');
  const videoElement = document.getElementById('videoElement');
  const videoHtmlContainer = document.getElementById('videoHtmlContainer');
  const videoMeta = document.getElementById('videoMeta');
  const metaPrompt = document.getElementById('metaPrompt');
  const metaElapsed = document.getElementById('metaElapsed');
  const historyEmpty = document.getElementById('historyEmpty');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // === DOM: Image Upload ===
  const imageUploadArea = document.getElementById('imageUploadArea');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageUploadPlaceholder = document.getElementById('imageUploadPlaceholder');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const imageRemoveBtn = document.getElementById('imageRemoveBtn');

  // === DOM: Mode Toggle ===
  const videoGrid = document.getElementById('videoGrid');
  const singleSettings = document.getElementById('singleSettings');
  const singlePreview = document.getElementById('singlePreview');
  const wfSection = document.getElementById('wfSection');
  const modeBtns = document.querySelectorAll('.video-mode-btn');

  // === DOM: Waterfall ===
  const wfPromptInput = document.getElementById('wfPromptInput');
  const wfRatio = document.getElementById('wfRatio');
  const wfLength = document.getElementById('wfLength');
  const wfResolution = document.getElementById('wfResolution');
  const wfConcurrent = document.getElementById('wfConcurrent');
  const wfAutoScroll = document.getElementById('wfAutoScroll');
  const wfAutoDownload = document.getElementById('wfAutoDownload');
  const wfGrid = document.getElementById('wfGrid');

  // === DOM: Waterfall Image Upload ===
  const wfImageUploadArea = document.getElementById('wfImageUploadArea');
  const wfImageFileInput = document.getElementById('wfImageFileInput');
  const wfImagePlaceholder = document.getElementById('wfImagePlaceholder');
  const wfImagePreviewContainer = document.getElementById('wfImagePreviewContainer');
  const wfImagePreview = document.getElementById('wfImagePreview');
  const wfImageName = document.getElementById('wfImageName');
  const wfImageRemoveBtn = document.getElementById('wfImageRemoveBtn');

  // === DOM: Lightbox ===
  const wfLightbox = document.getElementById('wfLightbox');
  const lightboxVideo = document.getElementById('lightboxVideo');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const lightboxCounter = document.getElementById('lightboxCounter');

  // === DOM: Floating Bar ===
  const wfFloatingBar = document.getElementById('wfFloatingBar');
  const wfStartBtn = document.getElementById('wfStartBtn');
  const wfStopBtn = document.getElementById('wfStopBtn');
  const wfClearBtn = document.getElementById('wfClearBtn');
  const floatCounter = document.getElementById('floatCounter');
  const floatSelectAll = document.getElementById('floatSelectAll');
  const selectionToolbar = document.getElementById('selectionToolbar');
  const floatDeselectAll = document.getElementById('floatDeselectAll');
  const floatDownload = document.getElementById('floatDownload');
  const floatDelete = document.getElementById('floatDelete');

  // === Constants & State ===
  const HISTORY_KEY = 'grok2api_video_history';
  const WF_KEY = 'grok2api_wf_items';
  const MAX_HISTORY = 20;

  let currentMode = 'single';
  let isGenerating = false;
  let abortController = null;
  let generateStartTime = 0;

  // Waterfall state
  let wfItems = [];
  let wfSelectionMode = false;
  let wfSelected = new Set();
  let lightboxIndex = -1;

  // Image upload state
  let uploadedImageBase64 = null; // data:image/xxx;base64,... or null
  let wfUploadedImageBase64 = null; // waterfall mode image

  // Cached api_key for /v1/chat/completions (fetched from admin config)
  let cachedChatApiKey = undefined; // undefined=not fetched, null=no auth, string=Bearer xxx

  /**
   * Get the api_key needed for /v1/chat/completions.
   * Uses ensureAdminKey() to authenticate with the admin backend first,
   * then fetches api_key from /v1/admin/config.
   * Returns: 'Bearer <api_key>' | '' (no auth needed) | null (auth failed)
   */
  async function getChatApiKey() {
    if (cachedChatApiKey !== undefined) return cachedChatApiKey;
    const adminKey = await ensureAdminKey();
    if (adminKey === null) return null;
    try {
      const res = await fetch('/v1/admin/config', {
        headers: buildAuthHeaders(adminKey)
      });
      if (!res.ok) throw new Error('Failed to fetch config');
      const cfg = await res.json();
      const apiKey = (cfg.app && cfg.app.api_key) || '';
      cachedChatApiKey = apiKey ? `Bearer ${apiKey}` : '';
      return cachedChatApiKey;
    } catch (e) {
      console.warn('getChatApiKey failed:', e);
      return null;
    }
  }

  // Waterfall concurrent engine state
  let waterfallRunning = false;
  let waterfallStopping = false;  // Graceful stop: wait for in-progress videos to finish
  let waterfallAbortControllers = [];
  let waterfallActiveCount = 0;   // Number of currently generating videos

  // === Image Upload Handlers ===
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('图片不能超过 20MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImageBase64 = e.target.result;
      if (imagePreview) imagePreview.src = uploadedImageBase64;
      if (imageUploadPlaceholder) imageUploadPlaceholder.classList.add('hidden');
      if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function removeUploadedImage() {
    uploadedImageBase64 = null;
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
    if (imageUploadPlaceholder) imageUploadPlaceholder.classList.remove('hidden');
  }

  // === Waterfall Image Upload Handlers ===
  function handleWfImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('图片不能超过 20MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      wfUploadedImageBase64 = e.target.result;
      if (wfImagePreview) wfImagePreview.src = wfUploadedImageBase64;
      if (wfImageName) wfImageName.textContent = file.name;
      if (wfImagePlaceholder) wfImagePlaceholder.classList.add('hidden');
      if (wfImagePreviewContainer) wfImagePreviewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function removeWfImage() {
    wfUploadedImageBase64 = null;
    if (wfImageFileInput) wfImageFileInput.value = '';
    if (wfImagePreview) wfImagePreview.src = '';
    if (wfImageName) wfImageName.textContent = '';
    if (wfImagePreviewContainer) wfImagePreviewContainer.classList.add('hidden');
    if (wfImagePlaceholder) wfImagePlaceholder.classList.remove('hidden');
  }

  if (wfImageUploadArea) {
    wfImageUploadArea.addEventListener('click', (e) => {
      if (e.target.closest('#wfImageRemoveBtn')) return;
      if (wfImageFileInput) wfImageFileInput.click();
    });
    wfImageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); wfImageUploadArea.classList.add('dragover'); });
    wfImageUploadArea.addEventListener('dragleave', () => { wfImageUploadArea.classList.remove('dragover'); });
    wfImageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      wfImageUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleWfImageFile(file);
    });
  }
  if (wfImageFileInput) {
    wfImageFileInput.addEventListener('change', () => {
      const file = wfImageFileInput.files[0];
      if (file) handleWfImageFile(file);
    });
  }
  if (wfImageRemoveBtn) {
    wfImageRemoveBtn.addEventListener('click', (e) => { e.stopPropagation(); removeWfImage(); });
  }

  if (imageUploadArea) {
    imageUploadArea.addEventListener('click', (e) => {
      if (e.target.closest('#imageRemoveBtn')) return;
      if (imageFileInput) imageFileInput.click();
    });
    imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadArea.classList.add('dragover'); });
    imageUploadArea.addEventListener('dragleave', () => { imageUploadArea.classList.remove('dragover'); });
    imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      imageUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    });
  }
  if (imageFileInput) {
    imageFileInput.addEventListener('change', () => {
      const file = imageFileInput.files[0];
      if (file) handleImageFile(file);
    });
  }
  if (imageRemoveBtn) {
    imageRemoveBtn.addEventListener('click', (e) => { e.stopPropagation(); removeUploadedImage(); });
  }

  function toast(message, type) {
    if (typeof showToast === 'function') {
      showToast(message, type);
    }
  }

  function setStatus(state, text) {
    if (!statusText) return;
    statusText.textContent = text;
    statusText.classList.remove('connected', 'connecting', 'error');
    if (state) statusText.classList.add(state);
  }

  function setButtons(generating) {
    if (!generateBtn || !stopBtn) return;
    if (generating) {
      generateBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
    } else {
      generateBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      generateBtn.disabled = false;
    }
  }

  function updateStatusPanel() {
    if (statusRatio) statusRatio.textContent = ratioSelect ? ratioSelect.value : '-';
    if (statusLength) statusLength.textContent = lengthSelect ? lengthSelect.value + 's' : '-';
    if (statusResolution) statusResolution.textContent = resolutionSelect ? resolutionSelect.value : '-';
    if (statusPreset) statusPreset.textContent = presetSelect ? presetSelect.value : '-';
  }

  function showEmpty() {
    if (videoEmpty) videoEmpty.classList.remove('hidden');
    if (videoProgress) videoProgress.classList.add('hidden');
    if (videoPlayer) videoPlayer.classList.add('hidden');
    if (videoHtmlContainer) videoHtmlContainer.classList.add('hidden');
    if (videoMeta) videoMeta.classList.add('hidden');
  }

  function showProgress(text) {
    if (videoEmpty) videoEmpty.classList.add('hidden');
    if (videoPlayer) videoPlayer.classList.add('hidden');
    if (videoHtmlContainer) videoHtmlContainer.classList.add('hidden');
    if (videoMeta) videoMeta.classList.add('hidden');
    if (videoProgress) videoProgress.classList.remove('hidden');
    if (progressFill) {
      progressFill.style.width = '0%';
      progressFill.classList.add('indeterminate');
    }
    if (progressText) progressText.textContent = text || '准备中...';
  }

  function updateProgress(text) {
    if (progressText) progressText.textContent = text;
  }

  function sanitizeVideoHtml(html) {
    // 仅允许 video/source 标签及安全属性，防止 XSS
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const videos = doc.querySelectorAll('video');
    if (videos.length === 0) return null;

    const container = document.createDocumentFragment();
    videos.forEach(srcVideo => {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.borderRadius = '8px';

      // 复制安全属性
      if (srcVideo.getAttribute('poster')) {
        video.poster = srcVideo.getAttribute('poster');
      }
      if (srcVideo.getAttribute('src')) {
        video.src = srcVideo.getAttribute('src');
      }

      // 复制 source 子元素
      srcVideo.querySelectorAll('source').forEach(srcSource => {
        const source = document.createElement('source');
        if (srcSource.getAttribute('src')) source.src = srcSource.getAttribute('src');
        if (srcSource.getAttribute('type')) source.type = srcSource.getAttribute('type');
        video.appendChild(source);
      });

      container.appendChild(video);
    });
    return container;
  }

  function showVideo(url, isHtml) {
    if (videoEmpty) videoEmpty.classList.add('hidden');
    if (videoProgress) videoProgress.classList.add('hidden');

    if (isHtml) {
      if (videoPlayer) videoPlayer.classList.add('hidden');
      if (videoHtmlContainer) {
        videoHtmlContainer.innerHTML = '';
        const safeContent = sanitizeVideoHtml(url);
        if (safeContent) {
          videoHtmlContainer.appendChild(safeContent);
        } else {
          // 无法解析出 video 标签，尝试提取 URL
          const urlMatch = url.match(/https?:\/\/[^\s"'<>]+/i);
          if (urlMatch) {
            showVideo(urlMatch[0], false);
            return;
          }
          videoHtmlContainer.textContent = '无法解析视频内容';
        }
        videoHtmlContainer.classList.remove('hidden');
      }
    } else {
      if (videoHtmlContainer) videoHtmlContainer.classList.add('hidden');
      if (videoPlayer) videoPlayer.classList.remove('hidden');
      if (videoElement) {
        videoElement.src = url;
        videoElement.load();
      }
    }
  }

  function showMeta(prompt, elapsed) {
    if (videoMeta) videoMeta.classList.remove('hidden');
    if (metaPrompt) metaPrompt.textContent = prompt;
    if (metaElapsed) metaElapsed.textContent = elapsed ? elapsed + 'ms' : '';
  }

  // --- History ---
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      // 限制每条记录的 content 大小，避免 localStorage 溢出
      const trimmed = history.slice(0, MAX_HISTORY).map(item => {
        const copy = { ...item };
        if (copy.content && copy.content.length > 2000) {
          // 对于过长的 HTML 内容，仅保留 URL
          const urlMatch = copy.content.match(/https?:\/\/[^\s"'<>]+/i);
          if (urlMatch) {
            copy.content = urlMatch[0];
            copy.type = 'url';
          } else {
            copy.content = copy.content.substring(0, 2000);
          }
        }
        return copy;
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
      // 存储满时清理最旧的记录
      try {
        const reduced = history.slice(0, Math.floor(MAX_HISTORY / 2));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(reduced));
      } catch (e2) {
        // ignore
      }
    }
  }

  function addToHistory(item) {
    const history = loadHistory();
    history.unshift(item);
    saveHistory(history);
    renderHistory();
  }

  function clearHistory() {
    // Delete all cached source files before clearing
    const history = loadHistory();
    history.forEach(item => _deleteCachedFile(item, { notifyOnFail: false }));
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      // ignore
    }
    renderHistory();
    toast('历史记录已清空', 'success');
  }

  function deleteHistoryItem(index) {
    const history = loadHistory();
    if (index >= 0 && index < history.length) {
      const item = history[index];
      // Try to delete the cached source file on server
      _deleteCachedFile(item, { notifyOnFail: true });
      history.splice(index, 1);
      saveHistory(history);
      renderHistory();
    }
  }

  function _deleteCachedFile(item, options = {}) {
    const notifyOnFail = options.notifyOnFail !== false;
    const warn = (msg) => {
      if (notifyOnFail) toast(msg, 'warning');
    };

    if (!item || !item.content) return;
    const content = String(item.content).trim();
    const videoMatch = content.match(/(?:https?:\/\/[^\s"'<>]+)?\/v1\/files\/video\/(.+?)(?=[?#][^\s"'<>]*|[\s"'<>]|$)/i);
    if (!videoMatch) {
      warn('删除缓存失败：未识别到视频文件路径');
      return;
    }

    // Fire-and-forget: backend auto-cleans associated thumbnail
    // Public mode returns '' (valid), only null means auth truly failed
    ensureAdminKey().then(apiKey => {
      if (apiKey === null) {
        warn('删除缓存失败：登录已失效，请重新登录');
        return;
      }
      fetch('/v1/admin/cache/item/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(apiKey) },
        body: JSON.stringify({ type: 'video', name: videoMatch[1] })
      }).catch(() => {});
    }).catch(() => {
      warn('删除缓存失败：鉴权检查异常');
    });
  }

  function renderHistory() {
    const history = loadHistory();
    if (!historyList) return;
    historyList.innerHTML = '';

    if (history.length === 0) {
      if (historyEmpty) historyEmpty.style.display = '';
      return;
    }
    if (historyEmpty) historyEmpty.style.display = 'none';

    history.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'video-history-item';
      el.dataset.index = index;

      const icon = document.createElement('div');
      icon.className = 'video-history-icon';
      icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

      const info = document.createElement('div');
      info.className = 'video-history-info';

      const promptEl = document.createElement('div');
      promptEl.className = 'video-history-prompt';
      promptEl.textContent = item.prompt || '(无提示词)';

      const timeEl = document.createElement('div');
      timeEl.className = 'video-history-time';
      const date = new Date(item.timestamp);
      timeEl.textContent = date.toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      if (item.elapsed) {
        timeEl.textContent += ' · ' + item.elapsed + 'ms';
      }

      info.appendChild(promptEl);
      info.appendChild(timeEl);
      el.appendChild(icon);
      el.appendChild(info);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'video-history-delete';
      deleteBtn.title = '删除';
      deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(index);
      });
      el.appendChild(deleteBtn);

      el.addEventListener('click', () => {
        const isHtml = item.type === 'html';
        showVideo(item.content, isHtml);
        showMeta(item.prompt, item.elapsed);

        historyList.querySelectorAll('.video-history-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
      });

      historyList.appendChild(el);
    });
  }

  // --- API ---
  function buildVideoContent(prompt) {
    if (uploadedImageBase64) {
      // Multimodal: image + text
      const parts = [
        { type: 'image_url', image_url: { url: uploadedImageBase64 } },
        { type: 'text', text: prompt }
      ];
      return parts;
    }
    return prompt;
  }

  async function generateVideo() {
    const prompt = promptInput ? promptInput.value.trim() : '';
    if (!prompt) {
      toast('请输入提示词', 'error');
      return;
    }

    const apiKey = await getChatApiKey();
    if (apiKey === null) {
      toast('请先登录后台', 'error');
      return;
    }

    if (isGenerating) {
      toast('正在生成中', 'warning');
      return;
    }

    isGenerating = true;
    generateStartTime = Date.now();
    abortController = new AbortController();

    const stream = streamToggle ? streamToggle.checked : true;
    const videoConfig = {
      aspect_ratio: ratioSelect ? ratioSelect.value : '3:2',
      video_length: lengthSelect ? parseInt(lengthSelect.value, 10) : 6,
      resolution_name: resolutionSelect ? resolutionSelect.value : '480p',
      preset: presetSelect ? presetSelect.value : 'custom'
    };

    updateStatusPanel();
    setStatus('connecting', '连接中...');
    setButtons(true);
    showProgress('正在连接服务...');

    const body = {
      model: 'grok-imagine-1.0-video',
      messages: [{ role: 'user', content: buildVideoContent(prompt) }],
      stream: stream,
      video_config: videoConfig
    };

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          ...buildAuthHeaders(apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: abortController.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      setStatus('connected', '生成中...');
      updateProgress('视频生成中，请耐心等待...');

      if (stream) {
        await handleStreamResponse(res, prompt);
      } else {
        await handleNonStreamResponse(res, prompt);
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setStatus('', '已停止');
        showEmpty();
        toast('已停止生成', 'info');
      } else {
        setStatus('error', '生成失败');
        updateProgress('生成失败: ' + e.message);
        toast('生成失败: ' + e.message, 'error');
      }
    } finally {
      isGenerating = false;
      abortController = null;
      setButtons(false);
    }
  }

  async function handleStreamResponse(res, prompt) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
          if (delta && delta.content) {
            fullContent += delta.content;
            updateProgress('视频生成中...');
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    handleVideoResult(fullContent, prompt);
  }

  async function handleNonStreamResponse(res, prompt) {
    const data = await res.json();
    let content = '';
    if (data.choices && data.choices[0]) {
      const msg = data.choices[0].message;
      if (msg && msg.content) {
        content = msg.content;
      }
    }
    handleVideoResult(content, prompt);
  }

  function handleVideoResult(content, prompt) {
    const elapsed = Date.now() - generateStartTime;

    if (!content) {
      setStatus('error', '无结果');
      updateProgress('未获取到视频内容');
      toast('未获取到视频内容', 'error');
      return;
    }

    const isHtml = content.trim().startsWith('<');
    const isUrl = /^https?:\/\//.test(content.trim());

    if (isHtml) {
      showVideo(content, true);
    } else if (isUrl) {
      showVideo(content.trim(), false);
    } else {
      // Try to extract URL from content
      const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(mp4|webm|mov)[^\s"'<>]*/i);
      if (urlMatch) {
        showVideo(urlMatch[0], false);
      } else {
        // Treat as HTML content
        showVideo(content, true);
      }
    }

    showMeta(prompt, elapsed);
    setStatus('connected', '生成完成');
    toast('视频生成完成', 'success');

    addToHistory({
      prompt: prompt,
      content: content,
      type: isHtml ? 'html' : 'url',
      timestamp: Date.now(),
      elapsed: elapsed,
      params: {
        aspect_ratio: ratioSelect ? ratioSelect.value : '3:2',
        video_length: lengthSelect ? lengthSelect.value : '6',
        resolution_name: resolutionSelect ? resolutionSelect.value : '480p',
        preset: presetSelect ? presetSelect.value : 'custom'
      }
    });
  }

  function stopGeneration() {
    if (abortController) {
      abortController.abort();
    }
  }

  // ================================================================
  // =================== MODE TOGGLE ================================
  // ================================================================
  function switchMode(mode) {
    currentMode = mode;
    modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    if (mode === 'single') {
      if (singleSettings) singleSettings.classList.remove('hidden');
      if (singlePreview) singlePreview.classList.remove('hidden');
      if (wfSection) wfSection.classList.add('hidden');
      if (videoGrid) videoGrid.classList.remove('waterfall-active');
      if (wfFloatingBar) wfFloatingBar.classList.add('hidden');
      wfExitSelectionMode();
      // Show top buttons in single mode
      if (generateBtn) generateBtn.classList.remove('hidden');
    } else {
      if (singleSettings) singleSettings.classList.add('hidden');
      if (singlePreview) singlePreview.classList.add('hidden');
      if (wfSection) wfSection.classList.remove('hidden');
      if (videoGrid) videoGrid.classList.add('waterfall-active');
      if (wfFloatingBar) wfFloatingBar.classList.remove('hidden');
      // Hide top buttons in waterfall mode (use floating bar instead)
      if (generateBtn) generateBtn.classList.add('hidden');
      if (stopBtn) stopBtn.classList.add('hidden');
      wfLoadItems();
      wfRender();
    }
    // Stop any ongoing generation when switching
    if (currentMode === 'single' && isGenerating) stopGeneration();
    if (waterfallRunning) stopWaterfall();
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // ================================================================
  // =================== WATERFALL: Persistence =====================
  // ================================================================
  function wfLoadItems() {
    try {
      const raw = localStorage.getItem(WF_KEY);
      wfItems = raw ? JSON.parse(raw) : [];
    } catch (e) { wfItems = []; }
  }

  function wfSaveItems() {
    try {
      const toSave = wfItems.map(item => {
        const copy = { ...item };
        if (copy.content && copy.content.length > 2000) {
          const urlMatch = copy.content.match(/https?:\/\/[^\s"'<>]+/i);
          if (urlMatch) { copy.content = urlMatch[0]; copy.type = 'url'; }
          else copy.content = copy.content.substring(0, 2000);
        }
        return copy;
      });
      localStorage.setItem(WF_KEY, JSON.stringify(toSave));
    } catch (e) {
      try { localStorage.setItem(WF_KEY, JSON.stringify(wfItems.slice(0, 20))); }
      catch (e2) { /* ignore */ }
    }
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function extractVideoUrl(item) {
    if (!item || !item.content) return null;
    const c = item.content.trim();
    if (/^https?:\/\//.test(c)) return c;
    const match = c.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? match[0] : null;
  }

  // ================================================================
  // =================== WATERFALL: Render ==========================
  // ================================================================
  function wfRender() {
    if (!wfGrid) return;
    wfGrid.innerHTML = '';

    if (wfItems.length === 0) {
      wfGrid.innerHTML = '<div class="wf-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accents-3);margin-bottom:8px;"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg><div>输入提示词并点击"生成视频"开始批量生成</div></div>';
      return;
    }

    wfItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'wf-item';
      card.dataset.id = item.id;
      if (wfSelectionMode) card.classList.add('selection-mode');
      if (wfSelected.has(item.id)) card.classList.add('selected');

      if (item.status === 'generating') {
        card.classList.add('generating');
        card.innerHTML = '<div class="wf-placeholder"><div class="wf-placeholder-bar"><div class="wf-placeholder-fill"></div></div><div class="wf-placeholder-text">生成中...</div></div>';
      } else if (item.status === 'error') {
        card.classList.add('error');
        card.innerHTML = '<div class="wf-placeholder"><div class="wf-placeholder-text">生成失败</div></div>';
      } else {
        const videoUrl = extractVideoUrl(item);
        if (videoUrl) {
          const vid = document.createElement('video');
          vid.src = videoUrl;
          vid.muted = true;
          vid.playsInline = true;
          vid.preload = 'metadata';
          vid.addEventListener('mouseenter', () => { try { vid.play(); } catch(e){} });
          vid.addEventListener('mouseleave', () => { try { vid.pause(); vid.currentTime = 0; } catch(e){} });
          card.appendChild(vid);
        } else {
          const ph = document.createElement('div');
          ph.className = 'wf-placeholder';
          ph.innerHTML = '<div class="wf-placeholder-text">视频</div>';
          card.appendChild(ph);
        }
      }

      // Info bar
      const info = document.createElement('div');
      info.className = 'wf-item-info';
      const promptEl = document.createElement('div');
      promptEl.className = 'wf-item-prompt';
      promptEl.textContent = item.prompt || '';
      const meta = document.createElement('div');
      meta.className = 'wf-item-meta';
      if (item.params) {
        const t1 = document.createElement('span'); t1.className = 'wf-tag'; t1.textContent = item.params.aspect_ratio || ''; meta.appendChild(t1);
        const t2 = document.createElement('span'); t2.className = 'wf-tag'; t2.textContent = (item.params.video_length || '') + 's'; meta.appendChild(t2);
      }
      if (item.elapsed) {
        const t3 = document.createElement('span'); t3.className = 'wf-tag'; t3.textContent = item.elapsed + 'ms'; meta.appendChild(t3);
      }
      info.appendChild(promptEl);
      info.appendChild(meta);
      card.appendChild(info);

      // Checkbox
      const checkbox = document.createElement('div');
      checkbox.className = 'wf-checkbox';
      checkbox.addEventListener('click', (e) => { e.stopPropagation(); wfToggleSelect(item.id); });
      card.appendChild(checkbox);

      // Click handler
      card.addEventListener('click', () => {
        if (wfSelectionMode) wfToggleSelect(item.id);
        else if (item.status === 'done') wfOpenLightbox(idx);
      });

      // Long press to enter selection
      let pressTimer = null;
      card.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => { if (!wfSelectionMode) { wfEnterSelectionMode(); wfToggleSelect(item.id); } }, 500);
      });
      card.addEventListener('pointerup', () => clearTimeout(pressTimer));
      card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

      wfGrid.appendChild(card);
    });
  }

  // ================================================================
  // =================== WATERFALL: Selection =======================
  // ================================================================
  function wfEnterSelectionMode() {
    wfSelectionMode = true;
    wfSelected.clear();
    if (selectionToolbar) selectionToolbar.classList.remove('hidden');
    wfRender();
    wfUpdateFloatingBar();
  }

  function wfExitSelectionMode() {
    wfSelectionMode = false;
    wfSelected.clear();
    if (selectionToolbar) selectionToolbar.classList.add('hidden');
    if (currentMode === 'waterfall') wfRender();
  }

  function wfToggleSelect(id) {
    if (wfSelected.has(id)) wfSelected.delete(id);
    else wfSelected.add(id);
    const card = wfGrid ? wfGrid.querySelector('[data-id="' + id + '"]') : null;
    if (card) card.classList.toggle('selected', wfSelected.has(id));
    wfUpdateFloatingBar();
    if (wfSelected.size === 0 && wfSelectionMode) wfExitSelectionMode();
  }

  function wfUpdateFloatingBar() {
    if (floatCounter) floatCounter.textContent = wfSelected.size;
  }

  // ================================================================
  // =================== WATERFALL: Lightbox ========================
  // ================================================================
  function wfGetDoneItems() {
    return wfItems.filter(item => item.status === 'done' && extractVideoUrl(item));
  }

  function wfOpenLightbox(globalIdx) {
    const doneItems = wfGetDoneItems();
    const item = wfItems[globalIdx];
    if (!item) return;
    const doneIdx = doneItems.findIndex(d => d.id === item.id);
    if (doneIdx === -1) return;
    lightboxIndex = doneIdx;
    wfShowLightboxItem();
    if (wfLightbox) wfLightbox.classList.add('active');
  }

  function wfCloseLightbox() {
    if (wfLightbox) wfLightbox.classList.remove('active');
    if (lightboxVideo) { lightboxVideo.pause(); lightboxVideo.src = ''; }
    lightboxIndex = -1;
  }

  function wfShowLightboxItem() {
    const doneItems = wfGetDoneItems();
    if (lightboxIndex < 0 || lightboxIndex >= doneItems.length) return;
    const item = doneItems[lightboxIndex];
    const url = extractVideoUrl(item);
    if (lightboxVideo && url) { lightboxVideo.src = url; lightboxVideo.load(); lightboxVideo.play().catch(() => {}); }
    if (lightboxCounter) lightboxCounter.textContent = (lightboxIndex + 1) + ' / ' + doneItems.length;
    if (lightboxPrev) lightboxPrev.disabled = (lightboxIndex === 0);
    if (lightboxNext) lightboxNext.disabled = (lightboxIndex === doneItems.length - 1);
  }

  if (lightboxClose) lightboxClose.addEventListener('click', wfCloseLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); if (lightboxIndex > 0) { lightboxIndex--; wfShowLightboxItem(); } });
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); const d = wfGetDoneItems(); if (lightboxIndex < d.length - 1) { lightboxIndex++; wfShowLightboxItem(); } });
  if (wfLightbox) wfLightbox.addEventListener('click', (e) => { if (e.target === wfLightbox) wfCloseLightbox(); });
  if (lightboxVideo) lightboxVideo.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (!wfLightbox || !wfLightbox.classList.contains('active')) return;
    if (e.key === 'Escape') wfCloseLightbox();
    if (e.key === 'ArrowLeft' && lightboxPrev && !lightboxPrev.disabled) lightboxPrev.click();
    if (e.key === 'ArrowRight' && lightboxNext && !lightboxNext.disabled) lightboxNext.click();
  });

  // ================================================================
  // =================== WATERFALL: Floating Bar ====================
  // ================================================================

  function wfSetBarButtons(running, stopping = false) {
    if (wfStartBtn && wfStopBtn) {
      if (running || stopping) {
        wfStartBtn.classList.add('hidden');
        wfStopBtn.classList.remove('hidden');
        // Update stop button text based on state
        if (stopping) {
          wfStopBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 等待完成...';
          wfStopBtn.disabled = true;
        } else {
          wfStopBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" /></svg> 停止';
          wfStopBtn.disabled = false;
        }
      } else {
        wfStartBtn.classList.remove('hidden');
        wfStopBtn.classList.add('hidden');
        wfStopBtn.disabled = false;
      }
    }
  }

  // Start / Stop
  if (wfStartBtn) wfStartBtn.addEventListener('click', () => startWaterfall());
  if (wfStopBtn) wfStopBtn.addEventListener('click', () => stopWaterfall());

  // Clear all
  if (wfClearBtn) wfClearBtn.addEventListener('click', () => {
    if (waterfallRunning) stopWaterfall();
    wfItems.forEach(item => _deleteCachedFile(item, { notifyOnFail: false }));
    wfItems = [];
    wfSaveItems();
    wfRender();
    toast('已清空所有视频', 'success');
  });

  // Batch select toggle
  if (floatSelectAll) floatSelectAll.addEventListener('click', () => {
    if (wfSelectionMode) {
      // Already in selection mode: select all
      wfItems.forEach(item => { if (item.status === 'done') wfSelected.add(item.id); });
      wfRender(); wfUpdateFloatingBar();
    } else {
      wfEnterSelectionMode();
    }
  });
  if (floatDeselectAll) floatDeselectAll.addEventListener('click', () => wfExitSelectionMode());
  if (floatDelete) floatDelete.addEventListener('click', () => {
    if (wfSelected.size === 0) return;
    const count = wfSelected.size;
    const toDelete = wfItems.filter(item => wfSelected.has(item.id));
    toDelete.forEach(item => _deleteCachedFile(item, { notifyOnFail: false }));
    wfItems = wfItems.filter(item => !wfSelected.has(item.id));
    wfSaveItems(); wfExitSelectionMode(); wfRender();
    toast('已删除 ' + count + ' 个视频', 'success');
  });
  if (floatDownload) floatDownload.addEventListener('click', () => {
    const selected = wfItems.filter(item => wfSelected.has(item.id) && item.status === 'done');
    if (selected.length === 0) { toast('没有可下载的视频', 'warning'); return; }
    selected.forEach(item => {
      const url = extractVideoUrl(item);
      if (!url) return;
      const a = document.createElement('a');
      a.href = url; a.download = (item.prompt || 'video').substring(0, 30) + '.mp4';
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
    toast('开始下载 ' + selected.length + ' 个视频', 'success');
  });

  // Floating bar drag
  if (wfFloatingBar) {
    let dragging = false, dragX = 0, dragY = 0, startLeft = 0, startTop = 0;
    wfFloatingBar.style.touchAction = 'none';
    wfFloatingBar.addEventListener('pointerdown', (e) => {
      // Check if click is on a button or any element inside a button (like SVG icons)
      if (e.target.closest('button')) return;
      dragging = true; dragX = e.clientX; dragY = e.clientY;
      const rect = wfFloatingBar.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      wfFloatingBar.style.transition = 'none';
      wfFloatingBar.setPointerCapture(e.pointerId);
    });
    document.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      wfFloatingBar.style.left = (startLeft + e.clientX - dragX) + 'px';
      wfFloatingBar.style.top = (startTop + e.clientY - dragY) + 'px';
      wfFloatingBar.style.transform = 'none'; wfFloatingBar.style.bottom = 'auto';
    });
    document.addEventListener('pointerup', () => { if (dragging) { dragging = false; wfFloatingBar.style.transition = ''; } });
  }

  // ================================================================
  // =================== WATERFALL: Generate ========================
  // ================================================================

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function wfGetPrompt() { return wfPromptInput ? wfPromptInput.value.trim() : ''; }
  function wfGetParams() {
    return {
      aspect_ratio: wfRatio ? wfRatio.value : '3:2',
      video_length: wfLength ? parseInt(wfLength.value, 10) : 6,
      resolution_name: wfResolution ? wfResolution.value : '480p',
      preset: 'custom'
    };
  }
  function wfGetConcurrent() { return wfConcurrent ? parseInt(wfConcurrent.value, 10) : 1; }

  async function startWaterfall() {
    const prompt = wfGetPrompt();
    if (!prompt) { toast('请输入提示词', 'error'); return; }

    const apiKey = await getChatApiKey();
    if (apiKey === null) { toast('请先登录后台', 'error'); return; }

    waterfallRunning = true;
    waterfallStopping = false;
    waterfallAbortControllers = [];
    waterfallActiveCount = 0;
    wfSetBarButtons(true);
    setStatus('connected', '瀑布流生成中...');

    const count = wfGetConcurrent();
    const workers = [];
    for (let i = 0; i < count; i++) {
      workers.push(waterfallWorker(i, apiKey));
    }
    await Promise.allSettled(workers);

    waterfallRunning = false;
    waterfallStopping = false;
    waterfallAbortControllers = [];
    waterfallActiveCount = 0;
    wfSetBarButtons(false);
    setStatus('', '就绪');
  }

  async function waterfallWorker(workerId, apiKey) {
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    while (waterfallRunning) {
      // Check if we should stop accepting new tasks (graceful stop)
      if (!waterfallRunning) break;

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        toast('Worker ' + workerId + ' 连续失败 ' + MAX_CONSECUTIVE_ERRORS + ' 次，已停止', 'error');
        break;
      }

      const controller = new AbortController();
      waterfallAbortControllers[workerId] = controller;

      const prompt = wfGetPrompt();
      if (!prompt) break;

      // Increment active count before starting
      waterfallActiveCount++;

      const itemId = genId();
      const params = wfGetParams();
      const newItem = { id: itemId, prompt, content: '', type: 'url', status: 'generating', params, timestamp: Date.now(), elapsed: 0 };
      wfItems.unshift(newItem);
      wfSaveItems();
      wfRender();

      const startTime = Date.now();
      const wfContent = wfUploadedImageBase64
        ? [{ type: 'image_url', image_url: { url: wfUploadedImageBase64 } }, { type: 'text', text: prompt }]
        : prompt;
      const body = {
        model: 'grok-imagine-1.0-video',
        messages: [{ role: 'user', content: wfContent }],
        stream: true,
        video_config: params
      };

      try {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { ...buildAuthHeaders(apiKey), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        if (!res.ok) { const errText = await res.text(); throw new Error(errText || 'HTTP ' + res.status); }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
              if (delta && delta.content) fullContent += delta.content;
            } catch (e) { /* ignore */ }
          }
        }

        const elapsed = Date.now() - startTime;
        const idx = wfItems.findIndex(i => i.id === itemId);
        if (idx !== -1) {
          wfItems[idx].content = fullContent;
          wfItems[idx].status = fullContent ? 'done' : 'error';
          wfItems[idx].elapsed = elapsed;
          wfItems[idx].type = fullContent.trim().startsWith('<') ? 'html' : 'url';
        }
        wfSaveItems(); wfRender();
        toast('视频生成完成', 'success');
        consecutiveErrors = 0; // Reset on success

        // Auto scroll
        if (wfAutoScroll && wfAutoScroll.checked && wfGrid) {
          wfGrid.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        // Auto download
        if (wfAutoDownload && wfAutoDownload.checked) {
          const doneItem = wfItems.find(i => i.id === itemId);
          if (doneItem) {
            const url = extractVideoUrl(doneItem);
            if (url) {
              const a = document.createElement('a');
              a.href = url; a.download = (doneItem.prompt || 'video').substring(0, 30) + '.mp4';
              a.target = '_blank'; a.rel = 'noopener';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
          }
        }

      } catch (e) {
        if (e.name === 'AbortError') {
          // Aborted - mark as error and exit
          const idx = wfItems.findIndex(i => i.id === itemId);
          if (idx !== -1) wfItems[idx].status = 'error';
          wfSaveItems(); wfRender();
          waterfallActiveCount--;
          break;
        }
        consecutiveErrors++;
        const idx = wfItems.findIndex(i => i.id === itemId);
        if (idx !== -1) wfItems[idx].status = 'error';
        wfSaveItems(); wfRender();
        toast('Worker ' + workerId + ' 生成失败: ' + e.message, 'error');
        // Delay before retry
        await sleep(2000);
      }

      // Decrement active count after finishing (success or error)
      waterfallActiveCount--;

      // Check if graceful stop is requested and all tasks are done
      if (waterfallStopping) {
        const stillGenerating = wfItems.filter(item => item.status === 'generating').length;
        if (stillGenerating === 0) {
          // All tasks completed, finalize the stop
          waterfallStopping = false;
          wfSetBarButtons(false);
          setStatus('', '已完成');
          toast('所有视频已完成', 'success');
        } else {
          // Update status to show remaining count
          setStatus('connecting', '等待 ' + stillGenerating + ' 个视频完成...');
        }
        break;
      }
    }
  }

  function stopWaterfall() {
    // Graceful stop: stop accepting new tasks, wait for in-progress to finish
    waterfallRunning = false;
    waterfallStopping = true;

    // Count how many items are still generating
    const generatingCount = wfItems.filter(item => item.status === 'generating').length;

    if (generatingCount > 0) {
      // Show "waiting for completion" status
      wfSetBarButtons(false, true);  // passing stopping=true
      setStatus('connecting', '等待 ' + generatingCount + ' 个视频完成...');
      toast('停止生成中，等待 ' + generatingCount + ' 个视频完成...', 'info');
    } else {
      // No videos in progress, stop immediately
      waterfallStopping = false;
      wfSetBarButtons(false);
      setStatus('', '已停止');
      toast('已停止生成', 'info');
    }

    // Note: We do NOT abort the controllers here - let in-progress requests finish naturally
    // The workers will exit after their current task completes because waterfallRunning is false
  }

  // ================================================================
  // =================== EVENT LISTENERS ============================
  // ================================================================
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      if (currentMode === 'waterfall') startWaterfall();
      else generateVideo();
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (currentMode === 'waterfall') stopWaterfall();
      else stopGeneration();
    });
  }

  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); generateVideo(); }
    });
  }

  if (wfPromptInput) {
    wfPromptInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); startWaterfall(); }
    });
  }

  // Update status panel when selects change
  [ratioSelect, lengthSelect, resolutionSelect, presetSelect].forEach(sel => {
    if (sel) sel.addEventListener('change', updateStatusPanel);
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistory);
  }

  // Init
  updateStatusPanel();
  renderHistory();
})();
