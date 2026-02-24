import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { mediaService } from '@/lib/services/api/mediaService';
import chatService, { ChatMessage as ApiChatMessage, ChatConversation } from '@/lib/services/api/chatService';
import socketService from '@/lib/services/socketService';
import { useAppDispatch } from '@/lib/store/hooks';
import { closeChat, addUnread, showPopup } from '@/lib/store/slices/chatSlice';
import { ChatWindowUI, UIChatMessage } from './ChatWindowUI';

interface ShopData {
    _id: string;
    shop_name: string;
    shop_logo?: string;
    shop_userId?: string;
}

interface ShopChatInstanceProps {
    shop: ShopData;
    isOpen: boolean;
    currentUserId?: string;
    userToken?: string;
}

export const ShopChatInstance: React.FC<ShopChatInstanceProps> = ({
    shop,
    isOpen,
    currentUserId,
    userToken
}) => {
    const dispatch = useAppDispatch();
    
    // UI state
    const [isMinimized, setIsMinimized] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState<ApiChatMessage[]>([]);
    
    // Status state
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [shopOwnerTyping, setShopOwnerTyping] = useState(false);
    const [conversation, setConversation] = useState<ChatConversation | null>(null);

    const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Initial setup and connection when token/id is available
    useEffect(() => {
        if (userToken && currentUserId && isOpen && !isConnected && !isConnecting) {
            initializeChat();
        }
        return () => {
            if (conversation && !isOpen) {
                socketService.leaveConversation(conversation._id);
            }
        };
    }, [isOpen, userToken, currentUserId, isConnected, isConnecting, conversation]);

    // Setup socket listeners
    useEffect(() => {
        if (!isConnected) return;

        const handleNewMessage = (message: ApiChatMessage) => {
            if (message.sender.id !== currentUserId) {
                setMessages((prev) => {
                    const existing = prev.find((m) => m._id === message._id);
                    if (!existing) {
                        return [...prev, message];
                    }
                    return prev;
                });

                if (conversation && isOpen && !isMinimized) {
                    socketService.markAsRead(conversation._id);
                } else if (!isOpen || isMinimized) {
                    dispatch(addUnread(shop._id));
                    dispatch(showPopup({ 
                        id: shop._id, 
                        message: message.content, 
                        popupId: message._id 
                    }));
                }
            }
        };

        const handleMessageSent = (message: ApiChatMessage) => {
            setMessages((prev) => {
                const existing = prev.find((m) => m._id === message._id);
                if (!existing) {
                    return [...prev, message];
                }
                return prev.map((m) => (m._id === message._id ? message : m));
            });
        };

        const handleMessageDelivered = (data: any) => {
            setMessages((prev) =>
                prev.map((msg) => (msg._id === data._id ? { ...msg, status: 'delivered' } : msg))
            );
        };

        const handleUserTyping = (data: any) => {
            if (
                data.userId !== currentUserId &&
                conversation &&
                data.conversationId === conversation._id
            ) {
                setShopOwnerTyping(true);
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    setShopOwnerTyping(false);
                }, 3000);
            }
        };

        const handleUserStopTyping = (data: any) => {
            if (
                data.userId !== currentUserId &&
                conversation &&
                data.conversationId === conversation._id
            ) {
                setShopOwnerTyping(false);
            }
        };

        socketService.on('new_message', handleNewMessage);
        socketService.on('message_sent', handleMessageSent);
        socketService.on('message_delivered', handleMessageDelivered);
        socketService.on('user_typing', handleUserTyping);
        socketService.on('user_stop_typing', handleUserStopTyping);

        return () => {
            socketService.off('new_message', handleNewMessage);
            socketService.off('message_sent', handleMessageSent);
            socketService.off('message_delivered', handleMessageDelivered);
            socketService.off('user_typing', handleUserTyping);
            socketService.off('user_stop_typing', handleUserStopTyping);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [isConnected, conversation, currentUserId, isOpen, isMinimized, dispatch, shop._id]);

    const initializeChat = async () => {
        setIsLoading(true);
        setIsConnecting(true);

        try {
            if (!socketService.isConnected()) {
                const serverUrl = process.env.NEXT_PUBLIC_API_URL;
                if (!serverUrl) {
                    throw new Error('NEXT_PUBLIC_API_URL is not defined');
                }
                await socketService.connect(userToken!, serverUrl);
                setIsConnected(true);
            } else {
                setIsConnected(true);
            }

            let existingConversation = null;

            try {
                const conversationsResponse = await chatService.getConversations(50, 1);
                existingConversation = conversationsResponse.conversations.find((conv) =>
                    conv.participants.some((p) => p.user.id === (shop.shop_userId || shop._id))
                );
            } catch (error) {
                console.log('No existing conversations found for this shop');
            }

            if (!existingConversation) {
                const targetUserId = shop.shop_userId || shop._id;
                const newConvResponse = await chatService.startConversation(targetUserId);
                
                existingConversation = {
                    _id: newConvResponse.conversation._id,
                    type: newConvResponse.conversation.type as 'direct',
                    participants: newConvResponse.conversation.participants.map((p) => ({
                        user: p,
                        joined_at: new Date().toISOString(),
                        last_read_at: new Date().toISOString(),
                        unread_count: 0
                    })),
                    messageCount: newConvResponse.conversation.messageCount,
                    unreadCount: 0,
                    status: newConvResponse.conversation.status as 'active',
                    updated_at: newConvResponse.conversation.created_at,
                    isOnline: newConvResponse.conversation.isOnline
                };
            }

            setConversation(existingConversation);
            socketService.joinConversation(existingConversation._id);

            if (existingConversation.messageCount > 0) {
                const messagesResponse = await chatService.getMessages(existingConversation._id);
                setMessages(messagesResponse.messages);
                if (isOpen && !isMinimized) {
                    socketService.markAsRead(existingConversation._id);
                }
            } else {
                const welcomeMessage: ApiChatMessage = {
                    _id: 'welcome-' + Date.now() + '-' + shop._id,
                    content: `Xin chào! Cảm ơn bạn đã quan tâm đến ${shop.shop_name}. Chúng tôi có thể giúp gì cho bạn?`,
                    type: 'text',
                    sender: {
                        id: shop.shop_userId || shop._id,
                        fullName: shop.shop_name,
                        email: '',
                        avatar: shop.shop_logo
                    },
                    receiver: { id: currentUserId!, fullName: '', email: '' },
                    status: 'read',
                    timestamp: new Date().toISOString()
                };
                setMessages([welcomeMessage]);
            }
        } catch (error) {
            console.error('Failed to initialize shop chat:', error);
            // toast.error('Không thể kết nối với cửa hàng. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
            setIsConnecting(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !conversation || !isConnected) return;
        
        const messageContent = inputMessage.trim();
        setInputMessage('');

        try {
            const targetUserId = shop.shop_userId || shop._id;
            const success = socketService.sendMessage(targetUserId, messageContent, 'text');

            if (!success) {
                throw new Error('Failed to send message via socket');
            }

            if (isTyping) {
                socketService.stopTyping(conversation._id, targetUserId);
                setIsTyping(false);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
            setInputMessage(messageContent);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);

        if (!conversation || !isConnected) return;

        if (e.target.value.trim() && !isTyping) {
            setIsTyping(true);
            const targetUserId = shop.shop_userId || shop._id;
            socketService.startTyping(conversation._id, targetUserId);
        } else if (!e.target.value.trim() && isTyping) {
            setIsTyping(false);
            const targetUserId = shop.shop_userId || shop._id;
            socketService.stopTyping(conversation._id, targetUserId);
        }
    };

    const mappedMessages: UIChatMessage[] = messages.filter((m, i, arr) => 
        arr.findIndex((tm) => tm._id === m._id) === i
    ).map(m => ({
        id: m._id,
        content: m.content,
        isOwn: m.sender.id === currentUserId,
        timestamp: m.timestamp,
        status: m.status as 'sent' | 'delivered' | 'read',
        isMarkdown: false
    }));

    return (
        <ChatWindowUI
            id={shop._id}
            title={shop.shop_name}
            subtitle={isConnecting ? 'Đang kết nối...' : isConnected ? 'Đang hoạt động' : 'Ngoại tuyến'}
            avatarType="shop"
            avatarUrl={shop.shop_logo ? mediaService.getMediaUrl(shop.shop_logo) : undefined}
            avatarFallback={shop.shop_name.substring(0, 2).toUpperCase()}
            status={isConnecting ? 'connecting' : isConnected ? 'online' : 'offline'}
            isOpen={isOpen}
            isMinimized={isMinimized}
            onClose={() => dispatch(closeChat(shop._id))}
            onToggleMinimize={() => {
                const willBeMaximized = isMinimized;
                setIsMinimized(!isMinimized);
                if (willBeMaximized && conversation) {
                    socketService.markAsRead(conversation._id);
                }
            }}
            messages={mappedMessages}
            isLoading={isLoading}
            partnerTyping={shopOwnerTyping}
            isConnected={isConnected}
            inputMessage={inputMessage}
            onInputChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onSendMessage={handleSendMessage}
        />
    );
};
