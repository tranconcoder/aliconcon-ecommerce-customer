'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { toggleChat, removePopup } from '@/lib/store/slices/chatSlice';
import { AIChatInstance } from './AIChatInstance';
import { ShopChatInstance } from './ShopChatInstance';
import { ChatBubbleUI } from './ChatBubbleUI';

export const GlobalChatManager: React.FC = () => {
    const dispatch = useAppDispatch();
    const { activeChats } = useAppSelector((state) => state.chat);
    
    const { user, accessToken } = useAppSelector((state) => state.user);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-end">
            {/* 1. Open Chat Windows (side by side horizontally, or stacked, depending on space) */}
            <div className="flex gap-4 mr-4 items-end pr-1 pb-1">
                {activeChats.map((chat) => {
                    if (!chat.isOpen) return null;

                    if (chat.type === 'ai') {
                        return <AIChatInstance key={chat.id} isOpen={chat.isOpen} />;
                    }

                    if (chat.type === 'shop' && chat.shopData) {
                        return (
                            <ShopChatInstance 
                                key={chat.id}
                                shop={chat.shopData}
                                isOpen={chat.isOpen}
                                currentUserId={user?._id}
                                userToken={accessToken || undefined}
                            />
                        );
                    }

                    return null;
                })}
            </div>

            {/* 2. Floating Bubbles Column */}
            <div className="flex flex-col gap-3">
                {activeChats.map((chat) => {
                    // Always show the AI bubble, also show Shop bubbles
                    return (
                        <ChatBubbleUI
                            key={`bubble-${chat.id}`}
                            id={chat.id}
                            avatarType={chat.type}
                            avatarUrl={chat.shopData?.shop_logo}
                            avatarFallback={chat.shopData?.shop_name?.substring(0, 2).toUpperCase()}
                            unreadCount={chat.unreadCount}
                            popups={chat.popups}
                            onClick={() => dispatch(toggleChat(chat.id))}
                            onRemovePopup={(popupId) => dispatch(removePopup({ id: chat.id, popupId }))}
                        />
                    );
                })}
            </div>
        </div>
    );
};
