import '@/styles/globals.css';

export const metadata = {
    title: 'Kết quả thanh toán VNPay',
    description: 'Kết quả thanh toán VNPay - Trang hiển thị kết quả giao dịch'
};

export default function VNPayReturnLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="antialiased bg-gray-50 min-h-screen">
            {children}
        </div>
    );
}
