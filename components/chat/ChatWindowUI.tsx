import React, { useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, Loader2, Bot, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CardHeader } from '@/components/ui/card';
import { CustomImage } from '@/components/ui/CustomImage';

export interface UIChatMessage {
    id: string;
    content: string;
    isOwn: boolean;
    timestamp: Date | string;
    status?: 'sent' | 'delivered' | 'read' | 'error';
    isMarkdown?: boolean;
}

interface ChatWindowUIProps {
    id: string;
    title: string;
    subtitle?: string;
    avatarUrl?: string;
    avatarFallback?: string;
    avatarType?: 'ai' | 'shop';
    status: 'connecting' | 'online' | 'offline';
    isOpen: boolean;
    isMinimized: boolean;
    onClose: () => void;
    onToggleMinimize: () => void;
    messages: UIChatMessage[];
    isLoading: boolean;
    partnerTyping: boolean;
    isConnected: boolean;
    inputMessage: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
    onSendMessage: () => void;
}

const renderMarkdown = (content: string) => {
    if (!content) return '';

    let html = content
        .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mt-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold mt-2">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded my-1 text-xs overflow-x-auto"><code>$1</code></pre>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs text-red-500">$1</code>')
        .replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g,
            '<img src="$2" alt="$1" class="max-w-full rounded my-1" onerror="this.style.display=\'none\'" />'
        )
        .replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'
        )
        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
        .replace(/(<li[\s\S]*<\/li>)/, '<ul class="my-1">$1</ul>')
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-blue-500 pl-2 text-gray-600 my-1 italic">$1</blockquote>')
        .replace(/\n/g, '<br/>');

    return html;
};

export const ChatWindowUI: React.FC<ChatWindowUIProps> = ({
    id,
    title,
    subtitle,
    avatarUrl,
    avatarFallback,
    avatarType = 'shop',
    status,
    isOpen,
    isMinimized,
    onClose,
    onToggleMinimize,
    messages,
    isLoading,
    partnerTyping,
    isConnected,
    inputMessage,
    onInputChange,
    onKeyPress,
    onSendMessage
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const formatTime = (ts: Date | string) => {
        const date = typeof ts === 'string' ? new Date(ts) : ts;
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    // The gradient matches the original design logic
    const headerGradient = avatarType === 'ai' 
        ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
        : 'bg-gradient-to-r from-blue-600 to-blue-700';

    return (
        <div
            className={`
            flex flex-col bg-white rounded-t-lg md:rounded-lg shadow-2xl border transition-all duration-300 ease-in-out pointer-events-auto
            ${isMinimized ? 'w-80 h-14' : 'w-80 md:w-96'}
            ${!isMinimized ? 'h-[32rem]' : ''}
        `}
        >
            {/* Header */}
            <CardHeader className={`p-3 ${headerGradient} text-white rounded-t-lg flex-shrink-0 cursor-pointer`} onClick={onToggleMinimize}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <Avatar className="w-8 h-8 border-2 border-white/20 bg-white/10 shrink-0">
                            {avatarUrl ? (
                                <CustomImage
                                    src={avatarUrl}
                                    alt={title}
                                    fill
                                    className="rounded-full"
                                    objectFit="cover"
                                    fallbackSrc="/placeholder.svg"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    {avatarType === 'ai' ? <Bot size={16} /> : <Store size={16} />}
                                </div>
                            )}
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-semibold text-sm truncate" title={title}>{title}</h3>
                            <div className="flex items-center space-x-1 truncate">
                                {status === 'connecting' ? (
                                    <>
                                        <Loader2 className="w-2 h-2 animate-spin shrink-0" />
                                        <span className="text-xs opacity-90 truncate">
                                            {subtitle || 'Đang kết nối...'}
                                        </span>
                                    </>
                                ) : status === 'online' ? (
                                    <>
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></div>
                                        <span className="text-xs opacity-90 truncate">
                                            {subtitle || 'Đang hoạt động'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full shrink-0"></div>
                                        <span className="text-xs opacity-90 truncate">{subtitle || 'Ngoại tuyến'}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
                            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                        >
                            {isMinimized ? (
                                <Maximize2 className="h-3 w-3" />
                            ) : (
                                <Minimize2 className="h-3 w-3" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            title="Đóng chat"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 min-h-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="flex items-center space-x-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Đang tải...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            message.isOwn ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`
                                                max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm break-words
                                                ${
                                                    message.isOwn
                                                        ? avatarType === 'ai' 
                                                            ? 'bg-purple-600 text-white rounded-br-sm' 
                                                            : 'bg-blue-600 text-white rounded-br-sm'
                                                        : message.status === 'error'
                                                            ? 'bg-red-50 text-red-600 border border-red-200 rounded-bl-sm'
                                                            : 'bg-white text-gray-800 border rounded-bl-sm'
                                                }
                                            `}
                                        >
                                            {message.isMarkdown ? (
                                                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                                            ) : (
                                                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            )}
                                            
                                            <div
                                                className={`
                                                    text-[10px] mt-1 flex items-center justify-end space-x-1
                                                    ${message.isOwn ? 'text-white/70' : 'text-gray-400'}
                                                `}
                                            >
                                                <span>{formatTime(message.timestamp)}</span>
                                                {message.isOwn && message.status && (
                                                    <span>
                                                        {message.status === 'sent' && '✓'}
                                                        {message.status === 'delivered' && '✓✓'}
                                                        {message.status === 'read' && <span className={avatarType === 'ai' ? 'text-purple-200' : 'text-blue-200'}>✓✓</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {partnerTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] border shadow-sm flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t bg-white p-3 flex-shrink-0 rounded-b-lg">
                        <div className="flex items-center space-x-2">
                            <Input
                                ref={inputRef}
                                value={inputMessage}
                                onChange={onInputChange}
                                onKeyPress={onKeyPress}
                                placeholder={isConnected ? 'Nhập tin nhắn...' : 'Đang kết nối...'}
                                className={`flex-1 text-sm ${avatarType === 'ai' ? 'focus-visible:ring-purple-400' : 'focus-visible:ring-blue-400'}`}
                                disabled={!isConnected || isLoading}
                            />
                            <Button
                                onClick={onSendMessage}
                                disabled={!inputMessage.trim() || !isConnected || isLoading}
                                size="sm"
                                className={`${avatarType === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white h-9 px-3`}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
