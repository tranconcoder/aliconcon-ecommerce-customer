'use client';

import { Button } from '@/components/ui/button';
import { Camera, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

interface CaptureScreenshotProps {
    orderId?: string;
}

export default function CaptureScreenshot({ orderId }: CaptureScreenshotProps) {
    const { toast } = useToast();

    const captureScreenshot = async () => {
        try {
            // Find the payment card element
            const element = document.querySelector('[data-payment-card]') as HTMLElement;
            if (!element) {
                toast({
                    title: 'Lỗi',
                    description: 'Không thể chụp ảnh hóa đơn',
                    variant: 'destructive'
                });
                return;
            }

            // Generate PNG using html-to-image
            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                cacheBust: true,
                pixelRatio: 2 // High quality
            });

            // Create download link
            const link = document.createElement('a');
            link.href = dataUrl;

            // Generate filename
            const timestamp = new Date().toISOString().slice(0, 10);
            const orderSuffix = orderId ? `_${orderId.slice(-6)}` : '';
            link.download = `Bill_Aliconcon${orderSuffix}_${timestamp}.png`;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: 'Đã lưu hóa đơn',
                description: 'Ảnh hóa đơn đã được tải về máy',
                variant: 'default'
            });

        } catch (error) {
            console.error('Screenshot error:', error);
            toast({
                title: 'Lỗi',
                description: 'Không thể lưu ảnh hóa đơn',
                variant: 'destructive'
            });
        }
    };

    return (
        <Button
            onClick={captureScreenshot}
            className="w-full bg-black hover:bg-gray-800 text-white border-0 font-mono uppercase tracking-wider h-12"
        >
            <Download className="h-4 w-4 mr-2" />
            Lưu Hóa Đơn
        </Button>
    );
}
