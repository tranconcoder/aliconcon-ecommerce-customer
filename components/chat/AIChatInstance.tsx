import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/lib/store/hooks';
import { closeChat, addUnread, showPopup } from '@/lib/store/slices/chatSlice';
import { ChatWindowUI, UIChatMessage } from './ChatWindowUI';

interface AIChatInstanceProps {
    isOpen: boolean;
}

export const AIChatInstance: React.FC<AIChatInstanceProps> = ({ isOpen }) => {
    const dispatch = useAppDispatch();

    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<UIChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Đang kết nối...');
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isProfileInitialized, setIsProfileInitialized] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    let WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/chat';
    if (WS_URL.startsWith('http')) {
        WS_URL = WS_URL.replace(/^http/, 'ws');
    }
    if (!WS_URL.includes('/chat')) {
        WS_URL = WS_URL.endsWith('/') ? WS_URL + 'chat' : WS_URL + '/chat';
    }

    const RECONNECT_INTERVAL = 3000;

    const getAccessToken = () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token) return token;

            if (typeof window !== 'undefined' && (window as any).__REDUX_STORE__) {
                const state = (window as any).__REDUX_STORE__.getState();
                const reduxToken = state?.auth?.token || state?.user?.accessToken || state?.auth?.accessToken;
                if (reduxToken) return reduxToken;
            }

            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'accessToken' || name === 'authToken') {
                    return decodeURIComponent(value);
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    const getCurrentContext = () => {
        return {
            currentPage: window.location.pathname,
            currentUrl: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            language: navigator.language || 'vi-VN',
            cartItems: [], 
            recentlyViewed: [], 
            searchQuery: new URLSearchParams(window.location.search).get('q') || null
        };
    };

    const initializeProfile = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const accessToken = getAccessToken();
        const context = getCurrentContext();

        const initMessage = {
            type: 'init_profile',
            accessToken: accessToken,
            context: context
        };

        wsRef.current.send(JSON.stringify(initMessage));
        setIsProfileInitialized(true);
    };

    useEffect(() => {
        // ALWAYS CONNECT The AI regardless of window stat to receive background popups
        // But in original code it only connects when `isOpen`.
        // Let's connect on mount to ensure background notifications work.
        connectWebSocket();
        return () => disconnectWebSocket();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const connectWebSocket = () => {
        try {
            setConnectionStatus('Đang kết nối...');
            setIsProfileInitialized(false);
            wsRef.current = new WebSocket(WS_URL);

            wsRef.current.onopen = () => {
                setIsConnected(true);
                setConnectionStatus('Đã kết nối');
                setTimeout(() => initializeProfile(), 500);

                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            wsRef.current.onclose = () => {
                setIsConnected(false);
                setConnectionStatus('Mất kết nối');
                setIsProfileInitialized(false);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, RECONNECT_INTERVAL);
            };

            wsRef.current.onerror = () => {
                setIsConnected(false);
                setConnectionStatus('Lỗi kết nối');
                setIsProfileInitialized(false);
            };
        } catch (error) {
            setConnectionStatus('Không thể kết nối');
        }
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setIsConnected(false);
        setConnectionStatus('Đã ngắt kết nối');
        setIsProfileInitialized(false);
        setUserProfile(null);
    };

    const handleWebSocketMessage = (data: any) => {
        switch (data.type) {
            case 'profile_initialized':
                setUserProfile(data.profile);
                if (data.welcomeMessage) {
                    const profileDisplay = data.profile 
                        ? `${data.profile.isGuest ? 'Khách' : data.profile.user_fullName || 'bạn'}` 
                        : 'bạn';
                    
                    const systemWelcome = `Xin chào ${profileDisplay}! Tôi là trợ lý mua sắm thông minh của Aliconcon. Hãy hỏi tôi về sản phẩm, cửa hàng, hoặc bất kỳ thông tin gì bạn cần!`;

                    setMessages([{
                        id: `welcome_${Date.now()}`,
                        content: data.welcomeMessage || systemWelcome,
                        isOwn: false,
                        timestamp: new Date(data.timestamp || Date.now()),
                        isMarkdown: true
                    }]);
                }
                break;

            case 'profile_error':
                setMessages((prev) => [...prev, {
                    id: `err_${Date.now()}`,
                    content: `Lỗi khởi tạo profile: ${data.message}`,
                    isOwn: false,
                    timestamp: new Date(),
                    status: 'error',
                    isMarkdown: false
                }]);
                break;

            case 'message':
                const aiMsgId = `ai_${Date.now()}_${Math.random()}`;
                
                setMessages((prev) => [...prev, {
                    id: aiMsgId,
                    content: data.content,
                    isOwn: false,
                    timestamp: new Date(data.timestamp || Date.now()),
                    isMarkdown: data.markdown || false
                }]);
                setIsTyping(false);
                
                // Read/unread logic for AI chat
                if (!isOpen || isMinimized) {
                    dispatch(addUnread('ai'));
                    dispatch(showPopup({ 
                        id: 'ai', 
                        message: data.content, 
                        popupId: aiMsgId 
                    }));
                }
                break;

            case 'typing':
                setIsTyping(data.isTyping);
                break;

            case 'error':
                setMessages((prev) => [...prev, {
                    id: `err_${Date.now()}`,
                    content: `Lỗi: ${data.message}`,
                    isOwn: false,
                    timestamp: new Date(),
                    status: 'error',
                    isMarkdown: false
                }]);
                setIsTyping(false);
                break;
        }
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const userMsgId = `usr_${Date.now()}`;
        setMessages((prev) => [...prev, {
            id: userMsgId,
            content: inputMessage.trim(),
            isOwn: true,
            timestamp: new Date(),
            status: 'sent',
            isMarkdown: false
        }]);
        
        const context = getCurrentContext();

        wsRef.current.send(JSON.stringify({
            type: 'chat',
            content: inputMessage.trim(),
            context: context
        }));

        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <ChatWindowUI
            id="ai"
            title="AI Assistant"
            subtitle={userProfile ? (userProfile.isGuest ? 'Khách' : userProfile.user_fullName) : connectionStatus}
            avatarType="ai"
            status={isConnected ? 'online' : 'connecting'}
            isOpen={isOpen}
            isMinimized={isMinimized}
            onClose={() => dispatch(closeChat('ai'))}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
            messages={messages}
            isLoading={false}
            partnerTyping={isTyping}
            isConnected={isConnected && isProfileInitialized}
            inputMessage={inputMessage}
            onInputChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onSendMessage={handleSendMessage}
        />
    );
};
