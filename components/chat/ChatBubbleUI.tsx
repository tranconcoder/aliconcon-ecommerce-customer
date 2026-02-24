import React, { useEffect, useState } from 'react';
import { Store, Bot } from 'lucide-react';
import { CustomImage } from '@/components/ui/CustomImage';
import { ChatPopup } from '@/lib/store/slices/chatSlice';

interface ChatBubbleUIProps {
    id: string;
    avatarUrl?: string;
    avatarFallback?: string;
    avatarType?: 'ai' | 'shop';
    unreadCount: number;
    popups: ChatPopup[];
    onClick: () => void;
    onRemovePopup: (popupId: string) => void;
}

export const ChatBubbleUI: React.FC<ChatBubbleUIProps> = ({
    id,
    avatarUrl,
    avatarFallback,
    avatarType = 'shop',
    unreadCount,
    popups,
    onClick,
    onRemovePopup
}) => {
    // Only display the most recent popup if there are multiple.
    const currentPopup = popups.length > 0 ? popups[popups.length - 1] : null;

    useEffect(() => {
        if (currentPopup) {
            const timer = setTimeout(() => {
                onRemovePopup(currentPopup.id);
            }, 2000); // Popup for 2 seconds

            return () => clearTimeout(timer);
        }
    }, [currentPopup, onRemovePopup]);

    // The gradient matches the original design logic
    const bubbleGradient = avatarType === 'ai' 
        ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
        : 'bg-gradient-to-br from-blue-500 to-blue-700';

    return (
        <div className="relative group inline-block">
            {/* The active message popup */}
            {currentPopup && (
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-48 bg-white text-gray-800 text-xs px-3 py-2 rounded-xl shadow-lg border animate-in slide-in-from-right-4 zoom-in-95 pointer-events-none">
                    <div className="truncate font-semibold mb-0.5">{avatarFallback || (avatarType === 'ai' ? 'AI Assistant' : 'Shop')}</div>
                    <div className="line-clamp-2 text-gray-500">{currentPopup.content}</div>
                    {/* Little triangle pointing right */}
                    <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-r border-b transform -rotate-45"></div>
                </div>
            )}

            <button
                onClick={onClick}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center
                    ${bubbleGradient} text-white shadow-lg
                    transition-all duration-300 ease-in-out
                    hover:scale-110 active:scale-95 border-2 border-white
                    pointer-events-auto shrink-0 relative
                `}
                title={avatarType === 'ai' ? 'Chat với AI Assistant' : 'Chat với Shop'}
            >
                {avatarUrl ? (
                    <CustomImage
                        src={avatarUrl}
                        alt="Avatar"
                        fill
                        className="rounded-full overflow-hidden"
                        objectFit="cover"
                        fallbackSrc="/placeholder.svg"
                    />
                ) : (
                    avatarType === 'ai' ? <Bot className="w-6 h-6" /> : <Store className="w-6 h-6" />
                )}

                {/* Unread dot */}
                {unreadCount > 0 && !currentPopup && (
                    <div className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full px-1.5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </button>
        </div>
    );
};
