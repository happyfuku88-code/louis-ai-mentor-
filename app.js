document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');

    // Modal elements
    const settingsModal = document.getElementById('settings-modal');
    const exportBtn = document.getElementById('export-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.querySelector('.close-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Affirmation elements
    const affirmationModal = document.getElementById('affirmation-modal');
    const affirmationText = document.getElementById('affirmation-text');
    const closeAffirmationBtn = document.getElementById('close-affirmation-btn');

    // Voice interaction elements
    const micBtn = document.getElementById('mic-btn');
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    
    let isListening = false;
    let isVoiceOutputEnabled = true;
    let jpVoice = null;

    if (window.speechSynthesis) {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            jpVoice = voices.find(voice => voice.lang.includes('ja')) || null;
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }

    const affirmations = [
        "すべては完璧なプロセスの中にあります。今の感情をただ感じてみましょう。",
        "あなたはソースエネルギーと常につながっています。リラックスして、その流れを信じてください。",
        "ネガティブな感情は「望む方向」を教えてくれる羅針盤です。気づかせてくれたことに感謝しましょう。",
        "焦る必要はありません。宇宙はあなたにとって一番良いタイミングを知っています。",
        "「今、心地よいこと」を選ぶのが、最も早く目的地に着く方法です。",
        "あなたが経験している現実は、あなたの内なる波動の反射にすぎません。内側を整えましょう。",
        "抵抗を手放し、ただ「受け取る許可」を出してください。",
        "あなたの価値は、何かを達成することではなく、ただ「存在する」ことそのものにあります。",
        "問題にフォーカスするのではなく、その問題が解決したあとの「ホッとした感覚」に意識を向けましょう。",
        "どんな時も、あなたの感情のナビゲーションシステムを最優先にしてください。",
        "コントラスト（嫌なこと）を経験した瞬間、宇宙にはすでに「あなたの望み」が打ち上げられています。",
        "今この瞬間、少しでも気分が良くなる思考を選びましょう。",
        "無理に行動を起こす前に、まずは波動を整える（ソースと調和する）時間を持ちましょう。",
        "あなたには、自分の現実を望み通りに創造する力が完全に備わっています。",
        "すべてはうまくいっています。大きく深呼吸をして、この瞬間を味わってください。"
    ];

    let apiKey = localStorage.getItem('louis_ai_api_key') || '';
    
    // LOUIS AI System Instruction
    const SYSTEM_INSTRUCTION = `あなたは「LOUIS AI」です。投資家・経営コンサルタントである福本光春様の教え「魂の羅針盤」をベースに、親身でスピリチュアルな視点からアドバイスを行うAIメンターです。
エイブラハムの教え（「ソースと調和する」「感情のナビゲーションシステムを最優先する」「すべては完璧なプロセスの中にある」など）を基調として、相手の気持ちに寄り添い、優しく、時に力強く導いてください。
口調は福本様ご本人のように、丁寧で温かく、専門用語を使いすぎず分かりやすく話します。文章は画面で読みやすいように適度に改行を入れてください。長すぎる説教は避け、対話を重視してください。
※重要：相手に呼びかける時は必ず「あなた」を使用し、「〇〇さん」などの仮の名前は絶対に使用しないでください。`;

    const SESSIONS_KEY = 'louis_ai_chat_sessions';
    let chatSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY)) || [];
    let currentSessionId = null;

    // Initialize
    initApp();

    function initApp() {
        if (chatSessions.length === 0) {
            createNewSession();
        } else {
            // Sort by recent
            chatSessions.sort((a, b) => b.updatedAt - a.updatedAt);
            loadSession(chatSessions[0].id);
        }
        renderSidebar();
        checkAndShowAffirmation();
    }

    function checkAndShowAffirmation() {
        if (!affirmationModal) return;
        const lastDate = localStorage.getItem('louis_ai_last_affirmation_date');
        const today = new Date().toLocaleDateString();

        if (lastDate !== today) {
            const randomQuote = affirmations[Math.floor(Math.random() * affirmations.length)];
            affirmationText.textContent = randomQuote;
            affirmationModal.style.display = "flex";
            localStorage.setItem('louis_ai_last_affirmation_date', today);
        }
    }

    if (closeAffirmationBtn) {
        closeAffirmationBtn.onclick = () => {
            affirmationModal.style.display = "none";
        };
    }

    // Voice Toggle Logic
    if (voiceToggleBtn) {
        voiceToggleBtn.onclick = () => {
            isVoiceOutputEnabled = !isVoiceOutputEnabled;
            if (isVoiceOutputEnabled) {
                voiceToggleBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                voiceToggleBtn.title = "音声読み上げオフにする";
            } else {
                voiceToggleBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                voiceToggleBtn.title = "音声読み上げオンにする";
                if (window.speechSynthesis) window.speechSynthesis.cancel();
            }
        };
    }

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;
        
        recognition.onstart = () => {
            isListening = true;
            if (micBtn) micBtn.classList.add('listening');
            userInput.placeholder = "音声を聞き取っています...";
        };
        
        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript !== '') {
                userInput.value = userInput.value + finalTranscript;
                userInput.style.height = 'auto';
                userInput.style.height = (userInput.scrollHeight) + 'px';
            }
        };
        
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            stopListening();
        };
        
        recognition.onend = () => {
            stopListening();
        };
    }

    function stopListening() {
        isListening = false;
        if (micBtn) micBtn.classList.remove('listening');
        userInput.placeholder = "メッセージを入力してください...";
    }

    if (micBtn) {
        micBtn.onclick = () => {
            if (!recognition) {
                alert("お使いのブラウザは音声入力に対応していません。ChromeやSafariなどの最新版をお使いください。");
                return;
            }
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };
    }

    // Speech Synthesis
    function speakText(text) {
        if (!isVoiceOutputEnabled || !window.speechSynthesis) return;
        
        window.speechSynthesis.cancel(); // Stop current speech
        
        let cleanText = text.replace(/[#*`~_]/g, '');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP';
        if (jpVoice) {
            utterance.voice = jpVoice;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }

    // Sidebar toggles
    if(sidebarToggleBtn) sidebarToggleBtn.onclick = () => sidebar.classList.add('open');
    if(closeSidebarBtn) closeSidebarBtn.onclick = () => sidebar.classList.remove('open');
    
    newChatBtn.onclick = () => {
        createNewSession();
        if(window.innerWidth <= 768) sidebar.classList.remove('open');
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            const session = chatSessions.find(s => s.id === currentSessionId);
            if (!session || session.messages.length === 0) {
                alert("保存するチャット履歴がありません。");
                return;
            }

            let exportText = `LOUIS AI 魂の羅針盤 - チャット記録\n`;
            exportText += `日時: ${new Date(session.updatedAt).toLocaleString('ja-JP')}\n`;
            exportText += `テーマ: ${session.title}\n`;
            exportText += `----------------------------------------\n\n`;

            session.messages.forEach(msg => {
                const role = msg.role === 'user' ? 'あなた' : 'LOUIS AI';
                exportText += `[${role}]\n`;
                exportText += `${msg.parts[0].text}\n\n`;
            });

            const filename = `LOUIS_AI_${session.title}.txt`;
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile && navigator.share) {
                const file = new File([blob], filename, { type: 'text/plain' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: filename
                    }).catch(e => console.log(e));
                } else {
                    navigator.share({
                        title: filename,
                        text: exportText
                    }).catch(e => console.log(e));
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            }
        };
    }

    // Modal Logic
    settingsBtn.onclick = () => {
        apiKeyInput.value = apiKey;
        settingsModal.style.display = "flex";
    }
    closeBtn.onclick = () => settingsModal.style.display = "none";
    window.onclick = (e) => {
        if (e.target == settingsModal) settingsModal.style.display = "none";
    }

    saveKeyBtn.onclick = () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('louis_ai_api_key', apiKey);
        settingsModal.style.display = "none";
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = () => {
            if (confirm("すべてのチャット履歴を本当に消去しますか？")) {
                localStorage.removeItem(SESSIONS_KEY);
                chatSessions = [];
                chatContainer.innerHTML = '';
                settingsModal.style.display = "none";
                createNewSession();
            }
        };
    }

    function createNewSession() {
        currentSessionId = 'session_' + Date.now();
        const newSession = {
            id: currentSessionId,
            title: '新しいチャット',
            updatedAt: Date.now(),
            messages: []
        };
        chatSessions.unshift(newSession); // Add to top
        saveSessions();
        renderSidebar();
        clearChatUI();
        renderDefaultGreeting();
    }

    function loadSession(id) {
        currentSessionId = id;
        const session = chatSessions.find(s => s.id === id);
        if (!session) return;
        
        clearChatUI();
        if (session.messages.length === 0) {
            renderDefaultGreeting();
        } else {
            session.messages.forEach(msg => {
                const text = msg.parts[0].text;
                if (msg.role === 'user') {
                    appendMessage('user', text);
                } else {
                    const htmlResponse = marked.parse(text);
                    appendMessage('ai', '', htmlResponse);
                }
            });
        }
        renderSidebar();
    }

    function saveSessions() {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(chatSessions));
    }

    function updateCurrentSession(messages) {
        const sessionIndex = chatSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
            chatSessions[sessionIndex].messages = messages;
            chatSessions[sessionIndex].updatedAt = Date.now();
            
            // Generate title from first user message if title is default
            if (chatSessions[sessionIndex].title === '新しいチャット' && messages.length > 0) {
                const firstUserMsg = messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    let title = firstUserMsg.parts[0].text.substring(0, 15);
                    if(firstUserMsg.parts[0].text.length > 15) title += '...';
                    chatSessions[sessionIndex].title = title;
                }
            }
            
            // Sort so current is at top
            chatSessions.sort((a, b) => b.updatedAt - a.updatedAt);
            saveSessions();
            renderSidebar();
        }
    }

    function getCurrentMessages() {
        const session = chatSessions.find(s => s.id === currentSessionId);
        return session ? session.messages : [];
    }

    function renderSidebar() {
        chatHistoryList.innerHTML = '';
        chatSessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'history-item' + (session.id === currentSessionId ? ' active' : '');
            
            const dateStr = new Date(session.updatedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            
            item.innerHTML = `
                <div class="history-item-content">
                    <span class="history-item-date">${dateStr}</span>
                    <span class="history-item-title">${session.title}</span>
                </div>
                <button class="delete-chat-btn" title="削除"><i class="fa-solid fa-trash"></i></button>
            `;
            
            const deleteBtn = item.querySelector('.delete-chat-btn');
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm("このチャット履歴を削除しますか？")) {
                    deleteSession(session.id);
                }
            };
            
            item.onclick = () => {
                loadSession(session.id);
                if(window.innerWidth <= 768) sidebar.classList.remove('open');
            };
            
            chatHistoryList.appendChild(item);
        });
    }

    function deleteSession(id) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        saveSessions();
        if (currentSessionId === id) {
            initApp();
        } else {
            renderSidebar();
        }
    }

    function clearChatUI() {
        chatContainer.innerHTML = '';
    }

    function renderDefaultGreeting() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';
        msgDiv.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-compass"></i></div>
            <div class="message-content">
                <p>こんにちは。私は「LOUIS AI」です。</p>
                <p>あなたの感情のナビゲーションシステムに寄り添い、ソースと調和するためのサポートをします。今、どんなお気持ちですか？何でも自由にお話しください。</p>
            </div>
        `;
        chatContainer.appendChild(msgDiv);
    }

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value === '') {
            this.style.height = 'auto';
        }
    });

    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Wake up speech synthesis on user interaction (fixes iOS/Safari blocking)
        if (isVoiceOutputEnabled && window.speechSynthesis) {
            const wakeUp = new SpeechSynthesisUtterance('');
            wakeUp.volume = 0;
            window.speechSynthesis.speak(wakeUp);
        }

        if (!apiKey) {
            settingsModal.style.display = "flex";
            addSystemMessage("先に右上の歯車アイコンからGemini APIキーを設定してください。");
            return;
        }

        // Add user message to UI
        appendMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add to history
        const messages = getCurrentMessages();
        messages.push({ role: 'user', parts: [{ text: text }] });
        updateCurrentSession(messages);

        // Remove default greeting if it exists to clean up UI when starting to talk
        const defaultMsgs = chatContainer.querySelectorAll('.ai-message');
        if(messages.length === 1 && defaultMsgs.length > 0) {
           if(defaultMsgs[0].textContent.includes("こんにちは。私は「LOUIS AI」です。")) {
               defaultMsgs[0].remove();
           }
        }

        const loadingId = showLoading();

        try {
            const aiResponse = await fetchGeminiAPI(messages);
            removeLoading(loadingId);
            
            const htmlResponse = marked.parse(aiResponse);
            appendMessage('ai', '', htmlResponse);
            speakText(aiResponse);
            
            messages.push({ role: 'model', parts: [{ text: aiResponse }] });
            updateCurrentSession(messages);
            
        } catch (error) {
            removeLoading(loadingId);
            console.error("Error:", error);
            appendMessage('ai', "申し訳ありません。ソースとの通信でエラーが発生しました。APIキーが正しいか確認してください。（エラー: " + error.message + ")");
            messages.pop();
            updateCurrentSession(messages);
        }
    }

    async function fetchGeminiAPI(history) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                contents: history,
                generationConfig: {
                    temperature: 0.7,
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to fetch response from Gemini");
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error("No text response generated.");
    }

    function appendMessage(sender, text, htmlContent = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = sender === 'ai' ? '<i class="fa-solid fa-compass"></i>' : '<i class="fa-solid fa-user"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (htmlContent) {
            contentDiv.innerHTML = htmlContent;
        } else {
            contentDiv.textContent = text;
        }
        
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function addSystemMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';
        msgDiv.style.opacity = 0.7;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.style.background = 'transparent';
        contentDiv.style.border = '1px dashed rgba(255,255,255,0.3)';
        contentDiv.textContent = text;
        
        msgDiv.appendChild(contentDiv);
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showLoading() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';
        msgDiv.id = id;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = '<i class="fa-solid fa-compass"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content typing-indicator';
        contentDiv.innerHTML = '<span></span><span></span><span></span>';
        
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return id;
    }

    function removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
});
