import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatPopup {
    id: string; // Message ID or timestamp
    content: string;
    timestamp: number;
}

export interface ChatSession {
    id: string; // shop._id or 'ai'
    type: 'shop' | 'ai';
    shopData?: {
        _id: string;
        shop_name: string;
        shop_logo?: string;
        shop_userId?: string;
    };
    isOpen: boolean;
    unreadCount: number;
    popups: ChatPopup[];
}

interface ChatState {
    activeChats: ChatSession[];
}

const initialState: ChatState = {
    // The AI chat string is always present
    activeChats: [
        {
            id: 'ai',
            type: 'ai',
            isOpen: false,
            unreadCount: 0,
            popups: []
        }
    ]
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        openChat: (
            state,
            action: PayloadAction<{ id: string; type: 'shop' | 'ai'; shopData?: any }>
        ) => {
            const { id, type, shopData } = action.payload;
            const existingChat = state.activeChats.find((chat) => chat.id === id);

            if (existingChat) {
                existingChat.isOpen = true;
                // Clear unread when opened
                existingChat.unreadCount = 0;
            } else {
                state.activeChats.push({
                    id,
                    type,
                    shopData,
                    isOpen: true,
                    unreadCount: 0,
                    popups: []
                });
            }
        },
        closeChat: (state, action: PayloadAction<string>) => {
            const existingChat = state.activeChats.find((chat) => chat.id === action.payload);
            if (existingChat) {
                existingChat.isOpen = false;
            }
        },
        toggleChat: (state, action: PayloadAction<string>) => {
            const existingChat = state.activeChats.find((chat) => chat.id === action.payload);
            if (existingChat) {
                existingChat.isOpen = !existingChat.isOpen;
                if (existingChat.isOpen) {
                    existingChat.unreadCount = 0;
                }
            }
        },
        addUnread: (state, action: PayloadAction<string>) => {
            const existingChat = state.activeChats.find((chat) => chat.id === action.payload);
            // Only add unread if it's currently closed
            if (existingChat && !existingChat.isOpen) {
                existingChat.unreadCount += 1;
            }
        },
        showPopup: (
            state,
            action: PayloadAction<{ id: string; message: string; popupId: string }>
        ) => {
            const { id, message, popupId } = action.payload;
            const existingChat = state.activeChats.find((chat) => chat.id === id);
            if (existingChat && !existingChat.isOpen) {
                existingChat.popups.push({
                    id: popupId,
                    content: message,
                    timestamp: Date.now()
                });
            }
        },
        removePopup: (state, action: PayloadAction<{ id: string; popupId: string }>) => {
            const { id, popupId } = action.payload;
            const existingChat = state.activeChats.find((chat) => chat.id === id);
            if (existingChat) {
                existingChat.popups = existingChat.popups.filter((p) => p.id !== popupId);
            }
        },
        removeChatSession: (state, action: PayloadAction<string>) => {
            // Cannot remove the "ai" core session
            if (action.payload !== 'ai') {
                state.activeChats = state.activeChats.filter(chat => chat.id !== action.payload);
            }
        }
    }
});

export const {
    openChat,
    closeChat,
    toggleChat,
    addUnread,
    showPopup,
    removePopup,
    removeChatSession
} = chatSlice.actions;

export default chatSlice.reducer;
