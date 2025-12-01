// screenshot/recorder-tab.js - ✅ FIXED: Proper stream cleanup

// ===== I18N HELPER =====
/**
 * Hàm get (thay thế cho Lang.get)
 * Giả định i18n.js đã load và gán vào window.Lang
 */
function getLang(key, replaces = null) {
    if (window.Lang && typeof window.Lang.get === 'function') {
        let str = window.Lang.get(key, replaces);
        
        // Fallback cho các key động (ví dụ: fileSizeUnitMB)
        if (str.startsWith('[') && str.endsWith(']')) {
             if (replaces && replaces.fallback) return replaces.fallback;
             return key;
        }
        return str;
    }

    // Fallback nếu i18n.js chưa sẵn sàng
    let fallbackText = key;
    if (replaces) {
        for (const rKey in replaces) {
            fallbackText = fallbackText.replace(`%${rKey}%`, replaces[rKey]);
        }
    }
    return fallbackText;
}
// ========================


function isInjectableURL(url) {
    if (!url) return false;
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:', 'data:', 'file://'];
    return !restrictedProtocols.some(protocol => url.startsWith(protocol));
}

async function isTabAccessible(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return tab && isInjectableURL(tab.url);
    } catch (error) { return false; }
}

async function safeMessageSend(tabId, message, timeout = 5000) {
    try {
        if (!await isTabAccessible(tabId)) return { success: false, error: 'Tab not accessible' };
        return await Promise.race([
            chrome.tabs.sendMessage(tabId, message),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Message timeout')), timeout))
        ]);
    } catch (error) {
        console.warn(`Could not send message to tab ${tabId}:`, error.message);
        return { success: false, error: error.message };
    }
}

// ✅ FIXED: Added displayStream to state
let state = {
    currentScreen: 'setup', settings: null, mediaRecorder: null, recordedChunks: [], startTime: null, endTime: null, pausedTime: 0, totalPausedDuration: 0,
    timerInterval: null, isPaused: false, stream: null, displayStream: null, micStream: null, cameraStream: null, videoBlob: null, savePath: null,
    mixContext: null, mixDestination: null, monitorContext: null, micAnalyser: null, audioLevelInterval: null, isMicEnabled: false,
    micPermissionGranted: false, lastBroadcastLevel: 0, cachedTabs: [], activeControlBarTabs: new Set(),
    sharingMode: 'monitor', targetTabs: [], pendingStreamId: null, skipScreenSelection: false,
    isRecording: false, isSettingUp: false // Flags để tránh gọi lại
};

async function getDisplayStreamFromId(streamId, includeAudio) {
    if (!streamId) return null;
    try {
        const constraints = {
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId,
                    maxWidth: 3840,
                    maxHeight: 2160,
                    maxFrameRate: state.settings?.frameRate || 60
                }
            },
            audio: includeAudio ? {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId
                }
            } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[Recording] Successfully acquired display stream using streamId');
        return stream;
    } catch (error) {
        console.warn('[Recording] Failed to use streamId directly:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Chờ i18n.js sẵn sàng (nó tự chạy)
    await (window.Lang?.initializationPromise || Promise.resolve());
    
    // Áp dụng theme từ storage
    await applyTheme();
    
    // Lắng nghe thay đổi theme
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.theme) {
            const newTheme = changes.theme.newValue;
            if (newTheme === 'light' || newTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        }
    });
    
    // ✅ Lắng nghe thay đổi ngôn ngữ
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'sync' && changes.userLang && window.Lang) {
            const newLangCode = changes.userLang.newValue;
            const currentLang = window.Lang.getCurrentLanguage();
            
            if (newLangCode && newLangCode !== currentLang) {
                try {
                    // Tải file ngôn ngữ mới
                    const langUrl = chrome.runtime.getURL(`lang/${newLangCode}.json`);
                    const response = await fetch(langUrl);
                    if (!response.ok) throw new Error(`Không thể tải ${newLangCode}.json`);
                    const newStrings = await response.json();
                    
                    // Cập nhật Lang service
                    window.Lang.currentLang = newLangCode;
                    window.Lang.strings = newStrings;
                    document.documentElement.lang = newLangCode;
                    
                    // Áp dụng ngôn ngữ mới cho toàn bộ DOM
                    window.Lang.applyToDOM();
                    
                    // Cập nhật lại các text động trong recorder
                    updateSetupScreen();
                    
                    console.log(`[Recorder] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
                } catch (error) {
                    console.error('[Recorder] Lỗi khi cập nhật ngôn ngữ:', error);
                }
            }
        }
    });
    
    // ✅ KIỂM TRA: Có settings từ toolbar không? (mở từ toolbar)
    const storageData = await chrome.storage.local.get(['recorderSettings', 'recorderPendingStart', 'recorderStreamId']);
    
    if (storageData.recorderSettings && storageData.recorderPendingStart) {
        // Mở từ toolbar, load settings từ storage
        console.log('[Recorder] Loading settings from toolbar:', storageData.recorderSettings);
        // ✅ Đảm bảo settings có đầy đủ thuộc tính cần thiết
        // Load default settings trước, sau đó merge với settings từ storage
        const defaultSettings = await getSettings();
        state.settings = { ...defaultSettings, ...storageData.recorderSettings };
        console.log('[Recorder] Merged settings:', state.settings);
        // Xóa flag để tránh load lại
        await chrome.storage.local.remove('recorderPendingStart');
        // Update UI với settings mới
        updateSetupScreen();
    } else {
        // Load settings bình thường
    await loadSettings();
    }
    
    // Sửa đường dẫn CSS và icon sau khi DOM đã load
    const recorderTabCss = document.getElementById('recorderTabCss');
    if (recorderTabCss) {
        recorderTabCss.href = chrome.runtime.getURL('modules/screenshot/recorder-tab.css');
    }
    
    const shareGoogleDriveIcon = document.getElementById('shareGoogleDriveIcon');
    const shareYouTubeIcon = document.getElementById('shareYouTubeIcon');
    if (shareGoogleDriveIcon) {
        shareGoogleDriveIcon.src = chrome.runtime.getURL('modules/screenshot/icons/google-drive.svg');
    }
    if (shareYouTubeIcon) {
        shareYouTubeIcon.src = chrome.runtime.getURL('modules/screenshot/icons/youtube.svg');
    }
    
    initializeEventListeners();
    setupMessageListeners();
    
    // ✅ KIỂM TRA: Có streamId từ background không? (đã chọn màn hình - flow cũ)
    if (storageData.recorderStreamId) {
        console.log('[Recorder] Found streamId from background, auto-starting recording...');
        // Xóa streamId khỏi storage để tránh dùng lại
        await chrome.storage.local.remove('recorderStreamId');
        // Tự động bắt đầu recording với streamId này
        // Đợi một chút để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
            startRecordingWithStreamId(storageData.recorderStreamId).catch(error => {
                console.error('[Recorder] Error auto-starting recording:', error);
    showScreen('setup');
            });
        }, 100);
    } else {
        // Không có streamId, hiển thị setup screen bình thường
        showScreen('setup');
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // (Đã thêm) Tự động dịch các thẻ data-i18n
    window.Lang.applyToDOM(document.body);
});

function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // ✅ REMOVED: startRecordingWithStreamId handler
        // Tab recorder sẽ nhận streamId từ response của startRecordingSession
        // Không cần handler riêng này nữa để tránh lặp
        
        if (request.action === 'recorderControl') {
            if (request.controlAction === 'register') {
                if (sender.tab && sender.tab.id) {
                    console.log(`[Recorder] Control bar registered from tab: ${sender.tab.id}`);
                    state.activeControlBarTabs.add(sender.tab.id);
                    broadcastMicState();
                } else {
                    // Chỉ log warning nếu không phải từ background script (có thể là từ popup hoặc extension page)
                    if (sender.id && sender.id === chrome.runtime.id) {
                        // Từ extension context, có thể bỏ qua
                        console.debug('[Recorder] Received register from extension context, ignoring.');
                    } else {
                        console.warn('[Recorder] Received a register request from a non-tab context. Ignoring.');
                    }
                }
            } else { handleControlBarAction(request.controlAction, request.data); }
            sendResponse({ success: true });
        }
        return true;
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
        if (state.activeControlBarTabs.has(tabId)) {
            console.log(`[Recorder] Control bar deregistered from closed tab: ${tabId}`);
            state.activeControlBarTabs.delete(tabId);
        }
    });
}

async function handleControlBarAction(action, data) {
    console.log('[Recorder] Received action:', action, data);
    switch (action) {
        case 'pause': await handlePauseFromControlBar(data.isPaused); break;
        case 'stop': await stopRecording(); break;
        case 'toggleMic': await toggleMicFromControlBar(data.enabled); break;
        case 'toggleCamera': await handleToggleCamera(data.enabled); break;
        case 'syncMicState':
            console.log('[Recorder] Syncing mic state:', { micPermissionGranted: state.micPermissionGranted, isMicEnabled: state.isMicEnabled });
            await broadcastMicState();
            break;
    }
}

// (Đã cập nhật i18n)
async function handleToggleCamera(shouldEnable) { 
    console.log(`[Recorder] Camera toggle requested: ${shouldEnable}`); 
    const message = shouldEnable ? getLang('notifyCameraToggledShow') : getLang('notifyCameraToggledHide');
    showNotification(message, 'success'); 
}

// (Đã cập nhật i18n)
async function handlePauseFromControlBar(shouldPause) {
    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') return;
    if (shouldPause && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.pause(); state.isPaused = true; state.pausedTime = Date.now();
        document.getElementById('recordingScreen').classList.add('paused'); updatePauseButton(true);
    } else if (!shouldPause && state.mediaRecorder.state === 'paused') {
        state.mediaRecorder.resume(); state.isPaused = false;
        if (state.pausedTime > 0) { state.totalPausedDuration += (Date.now() - state.pausedTime); state.pausedTime = 0; }
        document.getElementById('recordingScreen').classList.remove('paused'); updatePauseButton(false);
    }
}

// (Đã cập nhật i18n)
async function toggleMicFromControlBar(shouldEnable) {
    console.log(`[Recorder] Toggling mic via GainNode to: ${shouldEnable ? 'ON' : 'OFF'}`);
    
    // ✅ Nếu muốn bật mic nhưng chưa có mic stream, cần request mic stream trước
    if (shouldEnable && !state.micStream) {
        console.log('[Recorder] Mic stream not found, requesting mic stream...');
        try {
            state.micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    noiseSuppression: false, 
                    echoCancellation: false, 
                    autoGainControl: false, 
                    googEchoCancellation: false, 
                    googNoiseSuppression: false, 
                    googAutoGainControl: false, 
                    "googAutoGainControl2": false, 
                    latency: 0 
                } 
            });
            
            if (state.micStream && state.micStream.getAudioTracks().length > 0) {
                const micTrack = state.micStream.getAudioTracks()[0];
                if (micTrack.readyState === 'live') {
                    state.micPermissionGranted = true;
                    console.log('[Recorder] Mic stream acquired');
                    
                    // ✅ Cần tạo lại audio pipeline với mic stream mới
                    if (state.stream && state.mixContext) {
                        // Thêm mic track vào existing stream
                        const micAudioTracks = state.micStream.getAudioTracks();
                        if (micAudioTracks.length > 0) {
                            const micAudioSource = state.mixContext.createMediaStreamSource(new MediaStream([micAudioTracks[0]]));
                            const micGainNode = state.mixContext.createGain();
                            micGainNode.gain.value = 1;
                            state.micGainNode = micGainNode;
                            const micAnalyser = state.mixContext.createAnalyser();
                            micAnalyser.fftSize = 32;
                            micAnalyser.smoothingTimeConstant = 0;
                            state.micAnalyser = micAnalyser;
                            micAudioSource.connect(micGainNode);
                            micGainNode.connect(state.mixContext.destination);
                            micGainNode.connect(micAnalyser);
                            console.log('[Recorder] Mic pipeline created and connected');
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Recorder] Failed to get mic stream:', err);
            state.micPermissionGranted = false;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showNotification(getLang('errorMicPermission'), 'error');
            } else {
                showNotification(getLang('errorMicAccess', { message: err.message }), 'error');
            }
            return;
        }
    }
    
    if (!state.micGainNode) { 
        console.warn('[Recorder] Mic GainNode not found. Cannot toggle mic.'); 
        showNotification(getLang('errorMicGainNode'), 'error'); 
        return; 
    }
    if (!state.micPermissionGranted) { 
        console.warn('[Recorder] Mic permission not granted'); 
        showNotification(getLang('errorMicPermission'), 'warning'); 
        return; 
    }
    state.isMicEnabled = shouldEnable;
    state.micGainNode.gain.value = shouldEnable ? 1 : 0;
    if (shouldEnable) {
        if (!state.audioLevelInterval && state.micAnalyser) startAudioLevelMonitoring();
        showNotification(getLang('notifyMicOn'), 'success');
    } else {
        await broadcastMicLevel(0);
        showNotification(getLang('notifyMicOff'), 'success');
    }
    
    // Broadcast mic state to control bars
    await broadcastMicState();
}

async function broadcastMicState() {
    const message = { action: 'updateMicState', permissionGranted: state.micPermissionGranted, isEnabled: state.isMicEnabled };
    console.log(`[Recorder] Broadcasting mic state to ${state.activeControlBarTabs.size} tabs.`);
    for (const tabId of state.activeControlBarTabs) { safeMessageSend(tabId, message, 1000).catch(() => {}); }
}

async function broadcastMicLevel(level) {
    if (state.lastBroadcastLevel === level) return;
    state.lastBroadcastLevel = level;
    const message = { action: 'updateMicLevel', level: level };
    for (const tabId of state.activeControlBarTabs) { chrome.tabs.sendMessage(tabId, message).catch(() => {}); }
}

function startAudioLevelMonitoring() {
    if (!state.micAnalyser) { console.error('[Audio] No analyser available'); return; }
    const bufferLength = state.micAnalyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    state.audioLevelInterval = setInterval(() => {
        if (!state.micAnalyser || !state.isMicEnabled) {
            if (state.lastBroadcastLevel !== 0) broadcastMicLevel(0);
            return;
        }
        state.micAnalyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0.0;
        for (const amplitude of dataArray) {
            const normalizedAmplitude = (amplitude / 128.0) - 1.0;
            sumSquares += normalizedAmplitude * normalizedAmplitude;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const amplifiedLevel = Math.min(1.0, rms * 40.0);
        const finalLevel = amplifiedLevel < 0.0005 ? 0 : amplifiedLevel;
        broadcastMicLevel(finalLevel);
    }, 10);
    console.log('[Audio] Monitoring started');
}

function stopAudioLevelMonitoring() {
    if (state.audioLevelInterval) { clearInterval(state.audioLevelInterval); state.audioLevelInterval = null; console.log('[Audio] Monitoring stopped'); }
}

async function loadSettings() { state.settings = await getSettings(); updateSetupScreen(); }

// (Đã cập nhật i18n)
function updateSetupScreen() {
    // ✅ Đảm bảo settings tồn tại và có đầy đủ thuộc tính
    if (!state.settings) {
        console.warn('[Recorder] Settings not loaded yet, skipping updateSetupScreen');
        return;
    }
    
    const s = state.settings;

    // Đảm bảo i18n đã sẵn sàng
    if (!window.Lang || typeof window.Lang.get !== 'function') {
        console.warn('[Recorder] i18n chưa sẵn sàng, sẽ cập nhật lại sau');
        setTimeout(updateSetupScreen, 100);
        return;
    }

    const sourceMap = {
        'desktop': getLang('sourceDesktop', { fallback: 'Màn hình' }),
        'this_tab': getLang('sourceTab', { fallback: 'Tab này' }),
        'camera_only': getLang('sourceCameraOnly', { fallback: 'Chỉ Camera' })
    };

    const statusOn = getLang('statusOn', { fallback: 'Bật' });
    const statusOff = getLang('statusOff', { fallback: 'Tắt' });

    document.getElementById('sourceStatus').textContent = getLang('setupStatusSource', { source: sourceMap[s.source] || getLang('setupStatusSourceUnknown', { fallback: 'Không rõ' }) });
    document.getElementById('micStatus').textContent = getLang('setupStatusMic', { status: s.micEnabled ? statusOn : statusOff });
    
    let camStatus;
    if (s.cameraEnabled) {
        const shape = s.cameraShape === 'square' ? getLang('shapeSquare', { fallback: 'Vuông' }) : getLang('shapeCircle', { fallback: 'Tròn' });
        camStatus = getLang('camStatusOn', { shape: shape });
    } else {
        camStatus = statusOff;
    }
    document.getElementById('cameraStatus').textContent = getLang('setupStatusCam', { status: camStatus });
    
    document.getElementById('clickStatus').textContent = getLang('setupStatusClick', { status: s.clickEffectEnabled ? statusOn : statusOff });
    document.getElementById('drawStatus').textContent = getLang('setupStatusDraw', { status: s.annotationEnabled ? statusOn : statusOff });
    document.getElementById('controlBarStatus').textContent = getLang('setupStatusControls', { status: s.controlBarEnabled ? statusOn : statusOff });
    // ✅ Đảm bảo videoQuality và frameRate tồn tại
    const videoQuality = (s.videoQuality || '1080p').toUpperCase();
    const frameRate = s.frameRate || 30;
    document.getElementById('qualityStatus').textContent = getLang('setupStatusQuality', { quality: videoQuality, fps: frameRate });
}

function initializeEventListeners() {
    document.getElementById('startRecordingBtn').addEventListener('click', startRecordingProcess);
    document.getElementById('backToSettingsBtn').addEventListener('click', backToSettings);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('downloadBtn').addEventListener('click', downloadVideo);
    document.getElementById('deleteBtn').addEventListener('click', deleteVideo);
    document.getElementById('newRecordingBtn').addEventListener('click', newRecording);
    document.getElementById('shareGoogleDrive').addEventListener('click', () => shareVideo('drive'));
    document.getElementById('shareYouTube').addEventListener('click', () => shareVideo('youtube'));
}

function showScreen(screenName) {
    console.log('[UI] showScreen called with:', screenName);
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const screenMap = { 'setup': 'setupScreen', 'recording': 'recordingScreen', 'preview': 'previewScreen' };
    const targetScreen = document.getElementById(screenMap[screenName]);
    console.log('[UI] Target screen element:', targetScreen);
    if (targetScreen) {
        targetScreen.classList.add('active');
        state.currentScreen = screenName;
        console.log('[UI] ✅ Screen changed to:', screenName);
        // Đảm bảo theme được áp dụng cho screen mới
        applyTheme().catch(console.warn);
    } else {
        console.error('[UI] ❌ Target screen not found:', screenMap[screenName]);
    }
}

// ✅ Hàm mới: Bắt đầu recording với streamId từ background
// LƯU Ý: Trong Manifest V3, ta không thể dùng streamId trực tiếp với getUserMedia()
// Vì vậy, ta vẫn cần gọi getDisplayMedia(), nhưng nó sẽ không hiển thị dialog nữa
// vì background đã chọn màn hình. Tuy nhiên, getDisplayMedia() vẫn cần user gesture.
// Giải pháp: Gọi startRecordingProcess() bình thường, nhưng bỏ qua bước chọn file
// (hoặc tự động chọn file mặc định)
async function startRecordingWithStreamId(streamId) {
    console.log('[Recorder] Starting recording with streamId from background:', streamId);
    
    state.pendingStreamId = streamId;
    state.skipScreenSelection = true;
    
    await startRecordingProcess();
}

// (Đã cập nhật i18n)
async function startRecordingProcess() {
    // ✅ TRÁNH GỌI LẠI NẾU ĐANG TRONG QUÁ TRÌNH SETUP
    if (state.isRecording || state.isSettingUp) {
        console.warn('[Recording] Already in progress or setting up, ignoring duplicate call');
        return;
    }
    
    console.log('[Recording] ========== START RECORDING PROCESS ==========');
    state.isSettingUp = true; // Set flag để tránh gọi lại
    let writableStream = null;

    try {
        console.log('[Recording] Step 0: Starting recording process...');
        // ✅ BƯỚC 1: Chọn nơi lưu file
        try {
            console.log('[Recording] Step 1: Opening file save dialog...');
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: generateFilename('Video-screenshot', state.settings.videoFormat),
                types: [{
                    description: 'WebM Video File',
                    accept: { 'video/webm': ['.webm'] },
                }],
            });
            
            console.log('[Recording] File selected:', fileHandle.name);
            state.fileHandle = fileHandle; 
            writableStream = await fileHandle.createWritable();
            state.writableStream = writableStream;
            console.log('[Recording] File writable stream created');
        } catch (err) {
            console.log('[Recording] User cancelled the file save dialog.');
            state.isSettingUp = false; // Reset flag
            showNotification(getLang('notifyRecordCancelled'), 'info');
            return;
        }

        // ✅ BƯỚC 2: Kiểm tra xem background đã chọn màn hình chưa
        let displayStream;
        
        // Kiểm tra storage xem có streamId từ background không
        const storageData = await chrome.storage.local.get(['recorderStreamId', 'recorderSettings', 'recorderTabId']);
        const currentRecorderTab = await chrome.tabs.getCurrent();
        
        if (storageData.recorderStreamId && storageData.recorderTabId === currentRecorderTab.id) {
            console.log('[Recording] Found streamId in storage from background:', storageData.recorderStreamId);
            await chrome.storage.local.remove(['recorderStreamId', 'recorderSettings', 'recorderTabId']);
            displayStream = await getDisplayStreamFromId(storageData.recorderStreamId, state.settings.systemAudioEnabled);
            if (!displayStream) {
                showLoading(getLang('loadingInit'));
                try {
                    displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                        video: { cursor: 'always', displaySurface: 'monitor' }, 
                        audio: state.settings.systemAudioEnabled, 
                        preferCurrentTab: false 
                    });
                } catch (err) {
                    console.log('[Recording] User cancelled getDisplayMedia() dialog:', err);
                    state.isSettingUp = false;
                    hideLoading();
                    showNotification(getLang('notifyScreenCancelled'), 'info');
                    if (state.writableStream) {
                        await state.writableStream.close();
                        state.writableStream = null;
                    }
                    return;
                }
            }
        } else if (state.skipScreenSelection && state.pendingStreamId) {
            console.log('[Recording] Skipping screen selection, using pending streamId:', state.pendingStreamId);
            state.skipScreenSelection = false;
            displayStream = await getDisplayStreamFromId(state.pendingStreamId, state.settings.systemAudioEnabled);
            if (!displayStream) {
                displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: { cursor: 'always', displaySurface: 'monitor' }, 
                    audio: state.settings.systemAudioEnabled, 
                    preferCurrentTab: false 
                });
            }
        } else {
            // Chưa có streamId, gọi background để chọn màn hình
            showLoading(getLang('loadingInit'));
            console.log('[Recording] Step 1: Requesting screen selection from background...');
            
            const recorderTab = currentRecorderTab;
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ 
                    action: 'startRecordingSession', 
                    settings: state.settings,
                    recorderTabId: recorderTab.id
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (!response || !response.success) {
                        if (response?.cancelled) {
                            resolve({ cancelled: true });
                        } else {
                            reject(new Error(response?.error || 'Failed to start recording session'));
                        }
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (result.cancelled) {
                state.isSettingUp = false;
                hideLoading();
                showNotification(getLang('notifyScreenCancelled'), 'info');
                if (state.writableStream) {
                    await state.writableStream.close();
                    state.writableStream = null;
                }
                return;
            }
            
            const storageCheck = await chrome.storage.local.get(['recorderStreamId', 'recorderTabId']);
            let effectiveStreamId = null;
            if (storageCheck.recorderStreamId && storageCheck.recorderTabId === recorderTab.id) {
                console.log('[Recording] Found streamId in storage after startRecordingSession:', storageCheck.recorderStreamId);
                effectiveStreamId = storageCheck.recorderStreamId;
                await chrome.storage.local.remove(['recorderStreamId', 'recorderSettings', 'recorderTabId']);
            } else if (result && result.streamId) {
                effectiveStreamId = result.streamId;
                console.log('[Recording] Screen selected, streamId from response:', effectiveStreamId);
            }
            
            if (effectiveStreamId) {
                displayStream = await getDisplayStreamFromId(effectiveStreamId, state.settings.systemAudioEnabled);
            }
            
            if (!displayStream) {
                try {
                    displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                        video: { cursor: 'always', displaySurface: 'monitor' }, 
                        audio: state.settings.systemAudioEnabled, 
                        preferCurrentTab: false 
                    });
                if (!displayStream) {
                        throw new Error('No display stream returned');
                    }
                } catch (err) {
                    console.log('[Recording] User cancelled getDisplayMedia() dialog:', err);
                    state.isSettingUp = false;
                    hideLoading();
                    showNotification(getLang('notifyScreenCancelled'), 'info');
                    if (state.writableStream) {
                        await state.writableStream.close();
                        state.writableStream = null;
                    }
                    return;
                }
            }
        }
        
        if (!displayStream) {
            hideLoading();
            showNotification(getLang('notifyScreenCancelled'), 'info');
            if (state.writableStream) {
                await state.writableStream.close();
                state.writableStream = null;
            }
            return;
        }
        
        // ✅ LƯU displayStream vào state để có thể stop sau này
        state.displayStream = displayStream;
        console.log('[Recording] Display stream acquired');
        
        // ✅ DETECT sharing mode (tab vs screen/window)
        const videoTrack = displayStream.getVideoTracks()[0];
        const trackSettings = videoTrack.getSettings();
        const displaySurface = trackSettings.displaySurface || 'monitor';
        
        console.log('[Recording] Display surface type:', displaySurface);
        console.log('[Recording] Track settings:', trackSettings);
        
        // ✅ Determine target tabs based on sharing mode
        let targetTabs = [];
        if (displaySurface === 'browser') {
            // User is sharing a specific browser tab
            // Try to get the shared tab ID from track label or assume current active tab
            try {
                // Method 1: Parse from track label (format: "Tab: Title - example.com")
                const label = videoTrack.label;
                console.log('[Recording] Video track label:', label);
                
                // Method 2: Get current active tab (most likely the one being shared)
                const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (tabs.length > 0 && tabs[0].id) {
                    targetTabs = [tabs[0].id];
                    console.log('[Recording] ✅ TAB SHARING MODE - Will only inject into tab:', tabs[0].id, tabs[0].url);
                }
            } catch (err) {
                console.warn('[Recording] Could not determine shared tab, falling back to all tabs:', err);
                targetTabs = []; // Will inject into all tabs as fallback
            }
        }
        
        // Store sharing mode info
        state.sharingMode = displaySurface;
        state.targetTabs = targetTabs;
        
        if (targetTabs.length > 0) {
            console.log('[Recording] 🎯 SINGLE TAB MODE - Injection will be limited to tab:', targetTabs[0]);
        } else {
            console.log('[Recording] 📺 SCREEN/WINDOW MODE - Injection will cover all tabs');
        }
        
        state.micPermissionGranted = false;
        state.isMicEnabled = false;

        if (state.settings.micEnabled) {
            try {
                showLoading(getLang('loadingMic'));
                console.log('[Audio] Requesting RAW microphone stream...');
                state.micStream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false, googEchoCancellation: false, googNoiseSuppression: false, googAutoGainControl: false, "googAutoGainControl2": false, latency: 0 } });
                if (state.micStream && state.micStream.getAudioTracks().length > 0) {
                    const micTrack = state.micStream.getAudioTracks()[0];
                    if (micTrack.readyState === 'live') {
                        state.micPermissionGranted = true;
                        state.isMicEnabled = true;
                        console.log('[Recording] Mic stream acquired and validated');
                        showNotification(getLang('notifyMicReady'), 'success');
                    }
                }
            } catch (err) {
                console.error('[Recording] Mic error:', err);
                state.micPermissionGranted = false;
                state.isMicEnabled = false;
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    showNotification(getLang('errorMicPermission'), 'error');
                } else {
                    showNotification(getLang('errorMicAccess', { message: err.message }), 'warning');
                }
            }
        }

        await broadcastMicState();

        if (state.settings.cameraEnabled) {
            try {
                showLoading(getLang('loadingCamera'));
                state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
                console.log('[Recording] Camera stream acquired');
            } catch (err) {
                console.warn('[Recording] Could not get camera:', err);
                showNotification(getLang('errorCameraAccess'), 'warning');
            }
        }

        showLoading(getLang('loadingUI'));
        const currentTab = await chrome.tabs.getCurrent();
        
        // ✅ KHÔNG gọi startRecordingSession lại vì background đã gọi rồi
        // Thay vào đó, chỉ thông báo cho background biết tab recorder đã sẵn sàng
        // và đăng ký recorderTabId
        try {
        await chrome.runtime.sendMessage({ 
                action: 'registerRecorderTab', 
            recorderTabId: currentTab.id,
                settings: state.settings, 
            sharingMode: state.sharingMode,
            targetTabs: state.targetTabs
        });
            console.log('[Recording] Registered recorder tab with background');
        } catch (err) {
            console.warn('[Recording] Failed to register recorder tab:', err);
            // Không block recording nếu không register được
        }
        
        console.log('[Recording] Injecting components...');
        await injectComponents();

        console.log('[Recording] Combining streams...');
        const combinedStream = await combineStreams(displayStream, state.micStream);
        if (!combinedStream) {
            throw new Error('Failed to combine streams');
        }
        
        console.log('[Recording] Setting up MediaRecorder...');
        await setupMediaRecorder(combinedStream);
        if (!state.mediaRecorder) {
            throw new Error('Failed to setup MediaRecorder');
        }

        if (state.micStream && state.micAnalyser && state.isMicEnabled) {
            startAudioLevelMonitoring();
            console.log('[Recording] Audio monitoring started');
        }

        console.log('[Recording] Starting MediaRecorder...');
        state.mediaRecorder.start(1000);
        state.startTime = Date.now();
        state.isPaused = false;
        state.pausedTime = 0;
        state.totalPausedDuration = 0;
        state.isRecording = true; // Set flag
        state.isSettingUp = false; // Reset setup flag
        
        console.log('[Recording] Starting timer...');
        startTimer();

        console.log('[Recording] Updating badge to 00:00...');
        chrome.runtime.sendMessage({ action: 'updateBadge', text: '00:00', color: '#FF0000' }).catch((err) => {
            console.warn('[Recording] Failed to update badge:', err);
        });
        
        console.log('[Recording] Hiding loading...');
        hideLoading();
        
        console.log('[Recording] About to call showScreen("recording")...');
        console.log('[Recording] Current state.currentScreen:', state.currentScreen);
        showScreen('recording');
        console.log('[Recording] After showScreen("recording"), state.currentScreen:', state.currentScreen);
        
        // Kiểm tra xem screen có được hiển thị không
        const recordingScreen = document.getElementById('recordingScreen');
        console.log('[Recording] Recording screen element:', recordingScreen);
        if (recordingScreen) {
            console.log('[Recording] Recording screen has active class:', recordingScreen.classList.contains('active'));
            console.log('[Recording] All screens:', document.querySelectorAll('.screen'));
        } else {
            console.error('[Recording] ❌ Recording screen element not found!');
        }
        
        console.log('[Recording] Recording screen shown, showing notification...');
        const statusMsg = state.micPermissionGranted ? getLang('notifyRecordStartMic') : getLang('notifyRecordStartNoMic');
        showNotification(statusMsg, 'success');
        
        console.log('[Recording] ✅ Recording started successfully. File will be saved directly to disk.');
        displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('[Recording] Display stream ended, stopping recording...');
            stopRecording();
        });

    } catch (error) {
        console.error('[Recording] Error starting recording:', error);
        
        // Reset flags
        state.isSettingUp = false;
        state.isRecording = false;
        
        // ✅ Stop tất cả streams nếu có lỗi
        if (state.displayStream) {
            state.displayStream.getTracks().forEach(track => track.stop());
            state.displayStream = null;
        }
        if (state.micStream) {
            state.micStream.getTracks().forEach(track => track.stop());
            state.micStream = null;
        }
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach(track => track.stop());
            state.cameraStream = null;
        }
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
        }
        if (state.mixContext && state.mixContext.state !== 'closed') {
            await state.mixContext.close();
            state.mixContext = null;
        }
        
        if (state.writableStream) {
            await state.writableStream.abort();
            state.writableStream = null;
            console.log('[Recording] File stream aborted due to an error.');
        }

        hideLoading();
        showNotification(getLang('errorRecordStart', { message: error.message }), 'error');
    }
}

async function combineStreams(displayStream, micStream) {
    console.log('[Audio] Initializing single, master AudioContext...');
    const videoTracks = displayStream.getVideoTracks();
    if (videoTracks.length === 0) { console.error('[Audio] Critical error: Display stream has no video tracks.'); return displayStream; }
    const systemAudioTracks = displayStream.getAudioTracks();
    const micAudioTracks = micStream ? micStream.getAudioTracks() : [];
    if (systemAudioTracks.length === 0 && micAudioTracks.length === 0) { console.log('[Audio] No audio tracks detected. Proceeding with video-only stream.'); state.stream = displayStream; return displayStream; }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.mixContext = audioContext;
    const destination = audioContext.createMediaStreamDestination();
    if (systemAudioTracks.length > 0) { const systemAudioSource = audioContext.createMediaStreamSource(new MediaStream([systemAudioTracks[0]])); systemAudioSource.connect(destination); console.log('[Audio] System audio source connected to mixer.'); }
    if (micAudioTracks.length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(new MediaStream([micAudioTracks[0]]));
        const micGainNode = audioContext.createGain(); micGainNode.gain.value = state.isMicEnabled ? 1 : 0; state.micGainNode = micGainNode;
        const micAnalyser = audioContext.createAnalyser(); micAnalyser.fftSize = 32; micAnalyser.smoothingTimeConstant = 0; state.micAnalyser = micAnalyser;
        micAudioSource.connect(micGainNode); micGainNode.connect(destination); micGainNode.connect(micAnalyser);
        console.log('[Audio] Mic pipeline created: Source -> Gain -> (Destination & Analyser)');
    }
    const mixedAudioTrack = destination.stream.getAudioTracks()[0];
    const finalStream = new MediaStream([videoTracks[0], mixedAudioTrack]);
    console.log('[Audio] Final stream created with 1 video track and 1 mixed audio track.');
    state.stream = finalStream;
    
    // ✅ FIXED: Cleanup khi video track kết thúc
    videoTracks[0].onended = () => { 
        console.log('[Audio] Video track ended, triggering cleanup...');
        if (state.mixContext && state.mixContext.state !== 'closed') { 
            state.mixContext.close().then(() => console.log('[Audio] Master AudioContext closed successfully.'));
        }
        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
            stopRecording();
        }
    };
    
    return finalStream;
}

async function setupMediaRecorder(stream) {
    const codecs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    let selectedCodec = null;
    for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
            selectedCodec = codec;
            console.log('[MediaRecorder] Using codec:', codec);
            break;
        }
    }
    const options = { mimeType: selectedCodec || 'video/webm', videoBitsPerSecond: getVideoBitrate(), audioBitsPerSecond: 128000 };
    state.mediaRecorder = new MediaRecorder(stream, options);

    console.log('[MediaRecorder] Stream verification:', { /* ... */ });
    
    state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && state.writableStream) {
            state.writableStream.write(event.data); 
        }
    };

    state.mediaRecorder.onstop = async () => {
        await handleRecordingStop();
    };
    
    console.log('[MediaRecorder] Setup complete with options:', options);
}

function getVideoBitrate() { const bitrateMap = { '4k': 20000000, '1440p': 12000000, '1080p': 8000000, '720p': 5000000, '480p': 2500000 }; return bitrateMap[state.settings.videoQuality] || 8000000; }

function startTimer() {
    state.timerInterval = setInterval(() => {
        if (!state.isPaused) {
            const elapsed = Date.now() - state.startTime - state.totalPausedDuration;
            const timeStr = formatTime(elapsed); document.getElementById('recordingTime').textContent = timeStr;
            chrome.runtime.sendMessage({ action: 'updateBadge', text: timeStr.substring(0, 5), color: '#FF0000' }).catch(() => {});
        }
    }, 1000);
}

// (Đã cập nhật i18n)
function togglePause() {
    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') return;
    if (state.isPaused) {
        state.mediaRecorder.resume(); state.isPaused = false;
        if (state.pausedTime > 0) { state.totalPausedDuration += (Date.now() - state.pausedTime); state.pausedTime = 0; }
        document.getElementById('recordingScreen').classList.remove('paused'); updatePauseButton(false);
    } else {
        state.mediaRecorder.pause(); state.isPaused = true; state.pausedTime = Date.now();
        document.getElementById('recordingScreen').classList.add('paused'); updatePauseButton(true);
    }
}

// (Đã cập nhật i18n)
function updatePauseButton(paused) {
    const pauseBtn = document.getElementById('pauseBtn');
    if (paused) { 
        pauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span class="btn-label">${getLang('recordingResume')}</span>`; 
        pauseBtn.title = getLang('recordingResume');
    }
    else { 
        pauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span class="btn-label">${getLang('recordingPause')}</span>`; 
        pauseBtn.title = getLang('recordingPause');
    }
}

// (Đã cập nhật i18n)
async function stopRecording() { 
    console.log('[Recording] stopRecording() called');
    console.log('[Recording] MediaRecorder state:', state.mediaRecorder?.state);
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') { 
        console.log('[Recording] Stopping MediaRecorder...');
        showLoading(getLang('loadingStopping')); 
        state.mediaRecorder.stop(); 
    } else {
        console.warn('[Recording] Cannot stop: MediaRecorder is not active or does not exist');
    } 
}

// ✅ COMPLETELY REWRITTEN: Proper cleanup order
// (Đã cập nhật i18n)
async function handleRecordingStop() {
    console.log('[Recording] Stop requested. Finalizing and preparing preview...');
    showLoading(getLang('loadingFinalizing'));

    // ✅ Save end time for accurate duration calculation
    state.endTime = Date.now();
    
    // --- CLEANUP (✅ FIXED: Correct order) ---
    if (state.timerInterval) clearInterval(state.timerInterval);
    stopAudioLevelMonitoring();
    
    // ✅ CRITICAL: Stop MediaRecorder BEFORE stopping streams
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        console.log('[Recording] Stopping MediaRecorder...');
    }
    
    // ✅ Wait a bit for MediaRecorder to finish
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ✅ CRITICAL: Stop ALL streams in correct order
    console.log('[Recording] Stopping all media streams...');
    
    // 1. Stop display stream (screen capture)
    if (state.displayStream) {
        state.displayStream.getTracks().forEach(track => {
            console.log(`[Recording] Stopping displayStream track: ${track.kind}`);
            track.stop();
        });
        state.displayStream = null;
    }
    
    // 2. Stop mic stream
    if (state.micStream) {
        state.micStream.getTracks().forEach(track => {
            console.log(`[Recording] Stopping micStream track: ${track.kind}`);
            track.stop();
        });
        state.micStream = null;
    }
    
    // 3. Stop camera stream
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => {
            console.log(`[Recording] Stopping cameraStream track: ${track.kind}`);
            track.stop();
        });
        state.cameraStream = null;
    }
    
    // 4. Stop final mixed stream (if exists)
    if (state.stream) {
        state.stream.getTracks().forEach(track => {
            console.log(`[Recording] Stopping finalStream track: ${track.kind}`);
            track.stop();
        });
        state.stream = null;
    }
    
    // 5. Close AudioContext
    if (state.mixContext && state.mixContext.state !== 'closed') {
        await state.mixContext.close().catch(e => console.warn('Error closing audio context:', e));
        console.log('[Recording] AudioContext closed');
    }
    state.mixContext = null;
    
    // 6. Reset mic state
    state.isMicEnabled = false;
    state.micPermissionGranted = false;
    state.micGainNode = null;
    state.micAnalyser = null;
    
    // 7. Cleanup injected components
    await cleanupInjectedComponents();
    
    // 8. Clear badge
    chrome.runtime.sendMessage({ action: 'updateBadge', text: '' }).catch(() => {});
    
    // ✅ CRITICAL: Notify background.js to stop recording session
    // This prevents auto-injection when reloading/opening new tabs
    chrome.runtime.sendMessage({ action: 'stopRecordingSession' }).catch(() => {});
    console.log('[Recording] Recording session stopped in background');
    
    console.log('[Recording] All streams stopped successfully');

    // --- FINALIZE FILE AND CREATE PREVIEW ---
    try {
        if (state.writableStream) {
            await state.writableStream.close();
            state.writableStream = null;
            console.log('[Recording] File stream closed. Video saved successfully.');
        }

        if (state.fileHandle) {
            const file = await state.fileHandle.getFile();
            state.videoBlob = file; 

            if (state.videoBlob.size === 0) {
                console.error('[Recording] Empty video file created!');
                showNotification(getLang('errorEmptyVideo'), 'error');
                hideLoading();
                newRecording();
                return;
            }

            console.log('[Recording] Re-read file for preview:', { blobSize: state.videoBlob.size });
            await showPreview(); 
            hideLoading();
            showNotification(getLang('notifyRecordComplete'), 'success');

        } else {
            throw new Error("File handle not found.");
        }
    } catch (error) {
        console.error('[Recording] Error finalizing file or creating preview:', error);
        hideLoading();
        showNotification(getLang('errorPreview', { message: error.message }), 'error');
        newRecording();
    }
    
    // Focus back to this tab
    try {
        const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('modules/screenshot/recorder-tab.html') });
        if (tabs.length > 0) {
            const recorderTab = tabs[0];
            await chrome.windows.update(recorderTab.windowId, { focused: true });
            await chrome.tabs.update(recorderTab.id, { active: true });
        }
    } catch (error) {
        console.error('[Recorder] Error focusing tab:', error);
    }
}

async function cleanupInjectedComponents() {
    const tabs = await chrome.tabs.query({}); const currentTabId = (await chrome.tabs.getCurrent()).id; let cleanedCount = 0;
    for (const tab of tabs) {
        if (tab.id === currentTabId || !isInjectableURL(tab.url)) continue;
        try { await chrome.tabs.get(tab.id); const result = await safeMessageSend(tab.id, { action: 'cleanupRecorder' }, 3000); if (result && result.success) cleanedCount++; } catch (err) {}
    }
    console.log(`Cleanup complete: ${cleanedCount} tabs cleaned`);
}

// (Đã cập nhật i18n)
async function injectComponents() {
    const currentTabId = (await chrome.tabs.getCurrent()).id;
    
    let injectedCount = 0, skippedCount = 0;
    
    // ✅ SMART INJECTION: Only inject into target tabs if specified
    if (state.targetTabs && state.targetTabs.length > 0) {
        // TAB SHARING MODE - Only inject into the specific tab
        console.log('[Injection] 🎯 TAB MODE: Injecting only into tab:', state.targetTabs[0]);
        
        for (const tabId of state.targetTabs) {
            if (tabId === currentTabId) continue; // Skip recorder tab
            
            try {
                const tab = await chrome.tabs.get(tabId);
                if (isInjectableURL(tab.url)) {
                    await injectIntoTab(tabId);
                    injectedCount++;
                    console.log(`[Injection] ✅ Injected into target tab ${tabId}: ${tab.url}`);
                } else {
                    console.log(`[Injection] ⏭️ Skipping non-injectable tab ${tabId}: ${tab.url}`);
                    skippedCount++;
                }
            } catch (err) {
                console.warn(`[Injection] ❌ Could not inject into tab ${tabId}:`, err.message);
                skippedCount++;
            }
        }
    } else {
        // SCREEN/WINDOW SHARING MODE - Inject into all tabs
        console.log('[Injection] 📺 SCREEN MODE: Injecting into all tabs');
        
        const tabs = await chrome.tabs.query({});
        state.cachedTabs = tabs.filter(tab => tab.id !== currentTabId && isInjectableURL(tab.url));
        
        for (const tab of state.cachedTabs) {
            try {
                await injectIntoTab(tab.id);
                injectedCount++;
                console.log(`[Injection] ✅ Injected into tab ${tab.id}: ${tab.url}`);
            } catch (err) {
                console.warn(`[Injection] ❌ Could not inject into tab ${tabId} (${tab.url}):`, err.message);
                skippedCount++;
            }
        }
    }
    
    console.log(`[Injection] Complete: ${injectedCount} successful, ${skippedCount} skipped`);
    if (injectedCount === 0) {
        showNotification(getLang('notifyInjectFailed'), 'warning');
    }
}

async function injectIntoTab(tabId) {
    // ✅ Inject i18n.js trước để đảm bảo window.Lang sẵn sàng
    try {
        await chrome.scripting.executeScript({ 
            target: { tabId: tabId }, 
            files: ['js/i18n.js'] 
        });
        // Đợi i18n khởi tạo
        await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
        console.warn('[Injection] i18n.js might already be loaded or failed:', err);
    }
    
    await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/control-bar.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/control-bar.js'] });
    await new Promise(resolve => setTimeout(resolve, 100));
    const settingsToSend = { ...state.settings, micEnabled: state.isMicEnabled && state.micPermissionGranted };
    await safeMessageSend(tabId, { action: 'initControlBar', settings: settingsToSend });
    if (state.settings.cameraEnabled && state.cameraStream) {
        await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/camera-overlay.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/camera-overlay.js'] });
        await safeMessageSend(tabId, { action: 'initCamera', cameraShape: state.settings.cameraShape });
    }
    if (state.settings.clickEffectEnabled) {
        await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['modules/screenshot/click-effect.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['modules/screenshot/click-effect.js'] });
    }
}

// (Đã cập nhật i18n)
async function showPreview() {
    showScreen('preview');
    
    // Đảm bảo theme được áp dụng cho preview screen
    await applyTheme();
    
    const videoUrl = URL.createObjectURL(state.videoBlob); 
    const video = document.getElementById('previewVideo'); 
    video.src = videoUrl;
    
    // ✅ Calculate actual recording duration from timestamps
    const actualDuration = (state.startTime && state.endTime) ? 
        (state.endTime - state.startTime - state.totalPausedDuration) : 0;
    
    video.onloadedmetadata = () => {
        // ✅ Use video.duration if valid, otherwise use calculated duration
        let durationMs;
        if (isFinite(video.duration) && video.duration > 0) {
            durationMs = video.duration * 1000;
            console.log('[Preview] Using video.duration:', video.duration);
        } else {
            durationMs = actualDuration;
            console.log('[Preview] Video.duration invalid, using calculated duration:', actualDuration);
        }
        
        const duration = formatTime(durationMs); 
        const resolution = `${video.videoWidth}x${video.videoHeight}`;
        document.getElementById('videoDuration').textContent = duration; 
        document.getElementById('videoResolution').textContent = resolution;
    };
    
    // ✅ Fallback: Display calculated duration immediately (before metadata loads)
    document.getElementById('videoDuration').textContent = formatTime(actualDuration);
    
    const filename = state.savePath || generateFilename('recording', state.settings.videoFormat);
    document.getElementById('videoName').value = filename; 
    
    // (Đã cập nhật) Gọi formatFileSize (từ utils.js)
    // formatFileSize đã được cập nhật để dùng i18n
    document.getElementById('videoSize').textContent = formatFileSize(state.videoBlob.size);
    document.getElementById('videoFormat').textContent = state.settings.videoFormat.toUpperCase();
}

// (Đã cập nhật i18n)
async function downloadVideo() {
    const filename = document.getElementById('videoName').value || state.savePath || generateFilename('recording', state.settings.videoFormat);
    try {
        const url = URL.createObjectURL(state.videoBlob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        showNotification(getLang('notifyDownloading'), 'success');
        await saveRecordingHistory({ filename, size: state.videoBlob.size, duration: document.getElementById('videoDuration').textContent, format: state.settings.videoFormat });
    } catch (error) { 
        console.error('Download error:', error); 
        showNotification(getLang('errorDownload', { message: error.message }), 'error'); 
    }
}

// (Đã cập nhật i18n)
async function deleteVideo() { 
    if (confirm(getLang('confirmDelete'))) { 
        state.videoBlob = null; 
        state.recordedChunks = []; 
        showNotification(getLang('notifyDelete'), 'success'); 
        setTimeout(() => newRecording(), 1000); 
    } 
}

function newRecording() {
    state.recordedChunks = [];
    state.videoBlob = null;
    state.fileHandle = null; 
    
    // ✅ RESET all streams
    state.stream = null;
    state.displayStream = null;
    state.micStream = null;
    state.cameraStream = null;
    
    // ✅ RESET timing
    state.startTime = null;
    state.endTime = null;
    state.totalPausedDuration = 0;
    
    // ✅ RESET sharing mode
    state.sharingMode = 'monitor';
    state.targetTabs = [];

    state.isPaused = false;
    state.isMicEnabled = false;
    state.micPermissionGranted = false;
    state.cachedTabs = [];
    state.mixContext = null;
    state.mixDestination = null;
    state.monitorContext = null;
    state.micAnalyser = null;
    
    showScreen('setup');
}

// (Đã cập nhật i18n)
function shareVideo(platform) { 
    const urls = { 'drive': 'https://drive.google.com/drive/my-drive', 'youtube': 'https://studio.youtube.com/channel/UC/videos/upload' }; 
    if (urls[platform]) { 
        chrome.tabs.create({ url: urls[platform] }); 
        const platformName = platform === 'drive' ? 'Google Drive' : 'YouTube';
        showNotification(getLang('notifyOpeningPlatform', { platform: platformName }), 'info'); 
    } 
}

function backToSettings() { chrome.action.openPopup(); }

// (Đã cập nhật i18n)
function handleBeforeUnload(e) { 
    if (state.currentScreen === 'recording') { 
        const msg = getLang('confirmUnload');
        e.preventDefault(); 
        e.returnValue = msg; 
        return msg; 
    } 
}

// (Đã cập nhật i18n)
function showLoading(text = null) { 
    const overlay = document.getElementById('loadingOverlay'); 
    overlay.querySelector('.loading-text').textContent = text || getLang('loadingProcessing'); 
    overlay.classList.add('active'); 
}

function hideLoading() { document.getElementById('loadingOverlay').classList.remove('active'); }

// (Đã cập nhật) Không cần gọi applyTheme() vì i18n.js sẽ xử lý
chrome.storage.onChanged.addListener((changes, namespace) => { 
    if (namespace === 'local' && changes.theme) { 
        // applyTheme(); // i18n.js sẽ tự động xử lý
    } 
});