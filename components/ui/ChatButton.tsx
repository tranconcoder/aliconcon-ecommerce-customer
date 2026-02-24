import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { MessageCircle } from 'lucide-react';

interface ChatButtonProps {
    onClick: () => void;
    hasUnread?: boolean;
    className?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
    onClick,
    hasUnread = false,
    className = ''
}) => {
    return (
        <Button
            onClick={onClick}
            className={`
                relative bg-blue-600 hover:bg-blue-700 text-white 
                shadow-lg hover:shadow-xl transition-all duration-200
                hover:scale-105 active:scale-95
                ${className}
            `}
        >
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat với Shop
            {hasUnread && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                    !
                </Badge>
            )}
        </Button>
    );
};
