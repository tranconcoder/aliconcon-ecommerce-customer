import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/toaster';
import { Check, X, Loader2, Download } from 'lucide-react';
import PaymentReturnActions from './components/PaymentReturnActions';


// VNPay response codes mapping
const VNP_RESPONSE_CODES: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ',
    '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking',
    '10': 'Xác thực không đúng quá 3 lần',
    '11': 'Hết hạn chờ thanh toán',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Sai OTP',
    '24': 'Hủy giao dịch',
    '51': 'Số dư không đủ',
    '65': 'Vượt quá hạn mức giao dịch',
    '75': 'Ngân hàng bảo trì',
    '79': 'Sai mật khẩu thanh toán quá số lần',
    '99': 'Lỗi khác'
};

// Bank codes mapping
const BANK_CODES: Record<string, string> = {
    NCB: 'NCB',
    AGRIBANK: 'Agribank',
    SCB: 'SCB',
    SACOMBANK: 'SacomBank',
    EXIMBANK: 'EximBank',
    MSBANK: 'MS Bank',
    NAMABANK: 'NamA Bank',
    VNMART: 'Ví VnMart',
    VIETINBANK: 'Vietinbank',
    VIETCOMBANK: 'Vietcombank',
    HDBANK: 'HDBank',
    DONGABANK: 'Dong A',
    TPBANK: 'TPBank',
    OJB: 'OceanBank',
    BIDV: 'BIDV',
    TECHCOMBANK: 'Techcombank',
    VPBANK: 'VPBank',
    MBBANK: 'MBBank',
    ACB: 'ACB',
    OCB: 'OCB',
    IVB: 'IVB',
    VISA: 'VISA/MASTER'
};

interface VNPayReturnPageProps {
    searchParams: Record<string, string>;
}

function formatAmount(amount: string | number) {
    const numAmount = typeof amount === 'string' ? parseInt(amount) / 100 : amount;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(numAmount);
}

function formatDateTime(dateTimeStr: string) {
    if (!dateTimeStr || dateTimeStr.length !== 14) return dateTimeStr;

    const year = dateTimeStr.substring(0, 4);
    const month = dateTimeStr.substring(4, 6);
    const day = dateTimeStr.substring(6, 8);
    const hour = dateTimeStr.substring(8, 10);
    const minute = dateTimeStr.substring(10, 12);
    const second = dateTimeStr.substring(12, 14);

    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

// Receipt Item Component
function ReceiptItem({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
    return (
        <div 
            className={`flex justify-between items-start py-2 ${!isLast ? 'border-b border-dashed border-gray-300' : ''}`}
            style={{ borderColor: !isLast ? '#d1d5db' : 'transparent' }}
        >
            <span className="text-gray-600 font-mono text-sm" style={{ color: '#4b5563' }}>{label}:</span>
            <span className="text-gray-900 font-mono text-sm font-semibold text-right max-w-[60%] break-words" style={{ color: '#111827' }}>{value}</span>
        </div>
    );
}

// Loading component
function LoadingState() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded shadow-lg flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-800 mb-4" />
                <p className="text-gray-600 font-mono">In hóa đơn...</p>
            </div>
        </div>
    );
}

// Main server component
export default async function VNPayReturnPage(props: { searchParams: Promise<Record<string, string>> }) {
    const searchParams = await props.searchParams;

    if (!searchParams.vnp_TxnRef || !searchParams.vnp_ResponseCode) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <X className="h-12 w-12 text-black mb-4" />
                        <h2 className="text-xl font-bold text-black font-mono uppercase mb-2">
                            Lỗi Giao Dịch
                        </h2>
                        <p className="text-gray-600 text-center font-mono mb-6">Thiếu thông tin thanh toán</p>
                        <PaymentReturnActions isSuccess={false} vnpayParams={searchParams} />
                    </CardContent>
                </Card>
                <Toaster />
            </div>
        );
    }

    const vnpayParams = searchParams;
    const isSuccess = vnpayParams.vnp_ResponseCode === '00';
    const responseCode = vnpayParams.vnp_ResponseCode;
    const responseMessage = VNP_RESPONSE_CODES[responseCode] || 'Không xác định';
    const orderId = vnpayParams.vnp_TxnRef;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 print:bg-white print:p-0">
            {/* Real Receipt Container */}
            <div 
                className="w-full max-w-sm bg-white shadow-2xl overflow-hidden relative" 
                data-payment-card
                style={{ backgroundColor: '#ffffff', color: '#000000' }} // Hardcode for html2canvas
            >
                {/* Zigzag top border effect (using CSS or SVG if needed, keeping simple for now) */}
                <div className="h-2 bg-gray-800 w-full" style={{ backgroundColor: '#1f2937' }}></div>

                <div className="p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900 font-mono" style={{ color: '#111827' }}>
                            Aliconcon
                        </h1>
                        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider" style={{ color: '#6b7280' }}>
                            Hóa Đơn Thanh Toán
                        </p>
                    </div>

                    <Separator className="bg-gray-800" style={{ backgroundColor: '#1f2937' }} />

                    {/* Status */}
                    <div className="flex flex-col items-center justify-center py-2">
                        <div 
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 ${isSuccess ? 'border-black text-black' : 'border-black text-black'}`}
                            style={{ borderColor: '#000000', color: '#000000' }}
                        >
                            {isSuccess ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
                        </div>
                        <h2 className="text-lg font-bold uppercase font-mono" style={{ color: '#000000' }}>
                            {isSuccess ? 'Thành Công' : 'Thất Bại'}
                        </h2>
                        <p className="text-xs text-gray-500 font-mono mt-1 text-center px-4" style={{ color: '#6b7280' }}>
                            {responseMessage}
                        </p>
                    </div>

                    <Separator className="bg-gray-300 border-dashed" style={{ backgroundColor: '#d1d5db' }} />

                    {/* Details */}
                    <div className="space-y-1">
                        <ReceiptItem 
                            label="Mã đơn hàng" 
                            value={`#${orderId.slice(-8)}`} 
                        />
                         <ReceiptItem 
                            label="Thời gian" 
                            value={formatDateTime(vnpayParams.vnp_PayDate || '')} 
                        />
                        <ReceiptItem 
                            label="Cổng thanh toán" 
                            value="VNPAY" 
                        />
                        {vnpayParams.vnp_BankCode && (
                            <ReceiptItem 
                                label="Ngân hàng" 
                                value={BANK_CODES[vnpayParams.vnp_BankCode] || vnpayParams.vnp_BankCode} 
                            />
                        )}
                        {vnpayParams.vnp_TransactionNo && (
                            <ReceiptItem 
                                label="Mã giao dịch" 
                                value={vnpayParams.vnp_TransactionNo} 
                            />
                        )}
                        <ReceiptItem 
                            label="Nội dung" 
                            value={vnpayParams.vnp_OrderInfo || 'Thanh toán đơn hàng'}
                        />
                    </div>

                    <Separator className="bg-gray-800 h-[2px]" style={{ backgroundColor: '#1f2937' }} />

                    {/* Total */}
                    <div className="flex justify-between items-end pt-2">
                        <span className="text-gray-900 font-bold font-mono text-lg" style={{ color: '#111827' }}>TỔNG CỘNG</span>
                        <span className="text-gray-900 font-bold font-mono text-2xl" style={{ color: '#111827' }}>
                             {formatAmount(vnpayParams.vnp_Amount || 0)}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="pt-8 text-center space-y-4">
                        <div className="flex justify-center">
                            {/* Simple barcode simulation */}
                            <div className="h-8 flex space-x-[2px] items-end opacity-50">
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} className={`bg-black w-[${Math.random() > 0.5 ? '2px' : '4px'}] h-[${Math.floor(Math.random() * 100) + 50}%]`} style={{ backgroundColor: '#000000' }}></div>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 font-mono italic" style={{ color: '#9ca3af' }}>
                            Cảm ơn quý khách đã mua hàng!
                        </p>
                    </div>
                </div>
                
                {/* Actions (Hidden in screenshot if needed, but useful in UI) */}
                <div className="bg-gray-50 p-4 border-t border-dashed border-gray-300" data-html2canvas-ignore="true">
                     <PaymentReturnActions 
                        isSuccess={isSuccess} 
                        orderId={isSuccess ? orderId : undefined} 
                        vnpayParams={vnpayParams} 
                    />
                </div>
            </div>
            <Toaster />
        </div>
    );
}

// Add loading boundary
export function Loading() {
    return <LoadingState />;
}
