/*
 * File: js/gmail-proxy.js
 * PROXY (Đại diện) cho GMAIL.JS - ĐÃ TÁI KIẾN TRÚC
 *
 * Chạy ở ISOLATED World ("Máy khách")
 *
 * (FIX 17): Sửa lỗi "resolve is not a function".
 * (FIX 15): Tái kiến trúc để gửi lệnh "EXEC" cho logic phức tạp
 * và sửa lỗi "observe.on" để nhận payload.
 */

console.log(Lang.get("logProxyInit"));

const pendingRequests = new Map();
const localEventCallbacks = new Map();

let isGmailReady = false;
let gmailReadyPromise = null;

// === LISTENER TỔNG HỢP ===
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || !event.data.type) {
        return;
    }
    
    const type = event.data.type;
    const requestId = event.data.requestId;
    
    // LOẠI 1: PONG (Phản hồi cho PING)
    if (type === 'GMAIL_JS_PONG' && requestId === 'ping') {
        const promiseFuncs = pendingRequests.get('ping');
        if (!promiseFuncs) return; 

        if (event.data.success) {
            console.log(Lang.get("logPongSuccess"));
            isGmailReady = true;
            if (typeof promiseFuncs.resolve === 'function') {
                promiseFuncs.resolve(true); 
            }
        } else {
            console.error(Lang.get("logPongError"), event.data.error);
            if (typeof promiseFuncs.reject === 'function') {
                promiseFuncs.reject(new Error(event.data.error)); 
            }
        }
        pendingRequests.delete('ping');
    }
    
    // LOẠI 2: RESPONSE (Phản hồi cho GMAIL_JS_CALL)
    else if (type === 'GMAIL_JS_RESPONSE' && requestId && pendingRequests.has(requestId)) {
        const { resolve, reject } = pendingRequests.get(requestId);
        if (event.data.success) {
            resolve(event.data.data);
        } else {
            reject(new Error(event.data.error));
        }
        pendingRequests.delete(requestId);
    }
    
    // LOẠI 3: EVENT_FIRED (Sự kiện chủ động từ MAIN world)
    else if (type === 'GMAIL_JS_EVENT_FIRED') {
        const eventName = event.data.payload.event; 
        const callbacks = localEventCallbacks.get(eventName);
        
        if (callbacks && callbacks.length > 0) {
            console.log(Lang.get("logEventFired", { eventName: eventName, count: callbacks.length }));
            callbacks.forEach(cb => {
                try {
                    cb(event.data.payload); // <-- GỬI PAYLOAD VÀO CALLBACK
                } catch (e) {
                    console.error(Lang.get("errorEventCallback", { eventName: eventName }), e);
                }
            });
        }
    }
});
// === KẾT THÚC LISTENER ===

function callGmailJs(target, args = []) {
    return new Promise(async (resolve, reject) => {
        if (!isGmailReady) {
            try {
                await waitForGmailReady();
            } catch (e) {
                return reject(e);
            }
        }

        const requestId = `req_${Date.now()}_${Math.random()}`;
        pendingRequests.set(requestId, { resolve, reject });
		// 🔴 THÊM LOG NÀY:
        console.log('🚨 DEBUG postMessage:', {
            target: target,
            argsType: args.map(a => typeof a),
            argsConstructor: args.map(a => a?.constructor?.name),
            hasFunction: args.some(a => typeof a === 'function'),
            hasDOMElement: args.some(a => a instanceof Element),
            args: args // Có thể sẽ fail nếu có circular reference
        });

        window.postMessage({
            type: 'GMAIL_JS_CALL',
            requestId: requestId,
            payload: {
                target: target,
                args: args
            }
        }, '*');
        
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                reject(new Error(Lang.get("errorProxyTimeout", { target: target })));
                pendingRequests.delete(requestId);
            }
        }, 15000); 
    });
}

function waitForGmailReady() {
    if (isGmailReady) return Promise.resolve(true);
    if (gmailReadyPromise) return gmailReadyPromise; 

    gmailReadyPromise = new Promise((resolve, reject) => { 
        pendingRequests.set('ping', { resolve, reject }); 

        let attempt = 0;
        const maxAttempts = 20; 

        function tryPing() {
            attempt++;
            if (isGmailReady) return; 

            if (attempt > maxAttempts) {
                console.error(Lang.get("logPingPongError"));
                reject(new Error(Lang.get("errorProxyNoResponse"))); 
                pendingRequests.delete('ping');
                gmailReadyPromise = null;
                return;
            }
            
            console.log(Lang.get("logProxyPinging", { attempt: attempt }));
            window.postMessage({ type: 'GMAIL_JS_PING', requestId: 'ping' }, '*');
            setTimeout(tryPing, 500);
        }
        
        tryPing();
    });
    return gmailReadyPromise;
}

// === TẠO OBJECT GMAILINSTANCE GIẢ LẬP ===
const createProxyHandler = (path = []) => {
    return {
        get(target, prop) {
			if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return target[prop];
    }
            const newPath = [...path, prop];
            const targetPath = newPath.join('.');

            // === XỬ LÝ OBSERVE.ON ===
            if (targetPath === 'observe.on') {
                return (eventName, callback) => {
                    console.log(Lang.get("logProxyObserver", { eventName: eventName }));
                    if (!localEventCallbacks.has(eventName)) {
                        localEventCallbacks.set(eventName, []);
                    }
                    localEventCallbacks.get(eventName).push(callback);
                    
                    if (localEventCallbacks.get(eventName).length === 1) { 
                        waitForGmailReady().then(() => {
                            window.postMessage({
                                type: 'GMAIL_JS_OBSERVE',
                                payload: { event: eventName }
                            }, '*');
                        }).catch(e => console.error(e));
                    }
                }
            }

            // === XỬ LÝ LỆNH EXEC ===
            if (prop === 'exec') {
                return (command, payload = {}) => {
                    console.log(Lang.get("logProxyExec", { command: command }));
                    waitForGmailReady().then(() => {
                        payload.command = command; 
                        window.postMessage({
                            type: 'GMAIL_JS_EXEC',
                            payload: payload
                        }, '*');
                    }).catch(e => console.error(e));
                };
            }
            
            // Trả về một hàm promise-based
            const proxyFn = (...args) => {
                return callGmailJs(targetPath, args);
            };

            return new Proxy(proxyFn, createProxyHandler(newPath));
        }
    };
};

window.gmailInstance = new Proxy({}, createProxyHandler());
console.log(Lang.get("logProxyCreated"));

document.dispatchEvent(new CustomEvent('gmailInstanceReady', {
    detail: { instance: window.gmailInstance }
}));

waitForGmailReady().catch(e => console.error(e));