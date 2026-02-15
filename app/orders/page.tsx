'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    Loader2,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    CreditCard,
    ShoppingBag,
    Search,
    ChevronLeft,
    ChevronRight,
    SortAsc,
    SortDesc,
    RefreshCw
} from 'lucide-react';
import orderService, {
    OrderHistoryItem,
    GetOrderHistoryParams,
    PaginationInfo
} from '@/lib/services/api/orderService';
import paymentService from '@/lib/services/api/paymentService';
import { getMediaUrl } from '@/lib/services/api/mediaService';
import { formatPrice } from '@/lib/utils/cartUtils';
import VNPayPaymentModal from '@/components/common/VNPayPaymentModal';

// Order status mapping to Vietnamese
const ORDER_STATUS_MAP = {
    pending: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    pending_payment: {
        label: 'Chờ thanh toán',
        color: 'bg-orange-100 text-orange-800',
        icon: CreditCard
    },
    delivering: { label: 'Đang giao hàng', color: 'bg-blue-100 text-blue-800', icon: Truck },
    success: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: XCircle },
    completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle }
};

// Payment type mapping to Vietnamese
const PAYMENT_TYPE_MAP = {
    cod: 'Thanh toán khi nhận hàng',
    vnpay: 'VNPay'
};

// Sort options
const SORT_OPTIONS = [
    { value: 'created_at', label: 'Ngày tạo' },
    { value: 'updated_at', label: 'Ngày cập nhật' },
    { value: 'price_to_payment', label: 'Tổng tiền' }
];

export default function OrderHistoryPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending_payment');
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<OrderHistoryItem | null>(null);
    const [cancelCountdown, setCancelCountdown] = useState(5);
    const [canCancel, setCanCancel] = useState(false);

    // Payment modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [orderToPayFor, setOrderToPayFor] = useState<OrderHistoryItem | null>(null);

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'price_to_payment'>(
        'created_at'
    );
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Debounced search
    const [searchDebounce, setSearchDebounce] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchDebounce(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch orders based on filters
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const params: GetOrderHistoryParams = {
                status: activeTab,
                page: currentPage,
                limit: itemsPerPage,
                search: searchDebounce || undefined,
                sortBy,
                sortOrder,
                paymentType: paymentTypeFilter !== 'all' ? paymentTypeFilter : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            };

            const response = await orderService.getOrderHistory(params);
            setOrders(response.metadata.orders);
            setPagination(response.metadata.pagination);
        } catch (error: any) {
            console.error('Failed to fetch orders:', error);
            toast({
                title: 'Lỗi',
                description: 'Không thể tải lịch sử đơn hàng. Vui lòng thử lại.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [
        activeTab,
        currentPage,
        itemsPerPage,
        searchDebounce,
        sortBy,
        sortOrder,
        paymentTypeFilter,
        dateFrom,
        dateTo,
        toast
    ]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchDebounce, paymentTypeFilter, dateFrom, dateTo]);

    // Handle countdown for cancel dialog
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (showCancelDialog && cancelCountdown > 0) {
            interval = setInterval(() => {
                setCancelCountdown((prev) => {
                    if (prev <= 1) {
                        setCanCancel(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [showCancelDialog, cancelCountdown]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const handleViewOrderDetail = (orderId: string) => {
        router.push(`/orders/${orderId}`);
    };

    const handleCancelOrder = async (orderId: string) => {
        try {
            setCancellingOrderId(orderId);
            const response = await orderService.cancelOrder(orderId);

            // Check if refund information is available
            const refundInfo = response.metadata.refund_info;

            toast({
                title: 'Thành công',
                description: refundInfo
                    ? `Đơn hàng đã được hủy thành công. Hoàn tiền ${formatPrice(
                          refundInfo.refund_amount
                      )} đang được xử lý.`
                    : 'Đơn hàng đã được hủy thành công.',
                variant: 'default'
            });

            // Close dialog and reset state
            setShowCancelDialog(false);
            setOrderToCancel(null);
            setCancelCountdown(5);
            setCanCancel(false);

            // Refresh the orders list
            await fetchOrders();
        } catch (error: any) {
            console.error('Failed to cancel order:', error);
            toast({
                title: 'Lỗi',
                description:
                    error.response?.data?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.',
                variant: 'destructive'
            });
        } finally {
            setCancellingOrderId(null);
        }
    };

    const handlePayment = (order: OrderHistoryItem) => {
        setOrderToPayFor(order);
        setShowPaymentModal(true);
    };

    const handleSortToggle = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setPaymentTypeFilter('all');
        setDateFrom('');
        setDateTo('');
        setSortBy('created_at');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) {
            return 'Không có thông tin';
        }

        try {
            // Handle different date formats
            let date: Date;

            // If it's already a valid ISO string or timestamp
            if (typeof dateString === 'string' && dateString.includes('T')) {
                date = new Date(dateString);
            } else if (typeof dateString === 'string' && !isNaN(Number(dateString))) {
                // If it's a timestamp string
                date = new Date(Number(dateString));
            } else {
                // Try parsing as is
                date = new Date(dateString);
            }

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                return 'Ngày không hợp lệ';
            }

            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'dateString:', dateString);
            return 'Lỗi định dạng ngày';
        }
    };

    const getOrderStatusInfo = (status: string) => {
        return (
            ORDER_STATUS_MAP[status as keyof typeof ORDER_STATUS_MAP] || {
                label: status,
                color: 'bg-gray-100 text-gray-800',
                icon: Package
            }
        );
    };

    const renderOrderCard = (order: OrderHistoryItem) => {
        const statusInfo = getOrderStatusInfo(order.order_status);
        const StatusIcon = statusInfo.icon;
        const canCancel =
            order.order_status === 'pending_payment' || order.order_status === 'pending';
        const isCancelling = cancellingOrderId === order._id;
        const firstProduct = order.products_info?.[0];

        return (
            <Card key={order._id} className="mb-3 hover:shadow-md transition-shadow overflow-hidden group">
                <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                            {/* Image & Basic Info */}
                        <div className="flex-1 p-4 flex gap-4">
                            {/* Thumbnail */}
                            <div className="h-20 w-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border group/thumb relative">
                                {firstProduct ? (
                                    <Link href={`/products/${firstProduct.sku_id}`}>
                                        <img
                                            src={getMediaUrl(firstProduct.thumb)}
                                            alt={firstProduct.product_name}
                                            className="h-full w-full object-cover transition-transform group-hover/thumb:scale-105"
                                        />
                                    </Link>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                        <Package className="h-8 w-8" />
                                    </div>
                                )}
                            </div>

                            {/* Order Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg">
                                        #{(order._id || '').slice(-8)}
                                    </span>
                                    <Badge variant="outline" className="text-xs font-normal text-gray-500">
                                        {formatDate(order.created_at || order.updated_at || '')}
                                    </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                    <ShoppingBag className="h-3 w-3" />
                                    <span className="truncate font-medium">
                                        {order.shop_name || 'Unknown Shop'}
                                    </span>
                                </div>

                                <div className="space-y-4 mt-3">
                                    {order.products_info?.slice(0, 3).map((product, index) => (
                                        <div key={index} className="flex items-start gap-3 group/item">
                                            {/* Secondary Thumb - Only for index > 0 */}
                                            {index > 0 && (
                                                <Link 
                                                    href={`/products/${product.sku_id}`}
                                                    className="h-14 w-14 flex-shrink-0 bg-gray-100 rounded border overflow-hidden block"
                                                >
                                                    <img
                                                        src={getMediaUrl(product.thumb)}
                                                        alt={product.product_name}
                                                        className="h-full w-full object-cover transition-transform group-hover/item:scale-105"
                                                    />
                                                </Link>
                                            )}

                                            <div className="flex-1 min-w-0 py-1">
                                                <Link
                                                    href={`/products/${product.sku_id}`}
                                                    className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors block"
                                                >
                                                    {product.product_name || 'Sản phẩm'}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700 font-medium">
                                                        x{product.quantity || 1}
                                                    </span>
                                                    {product.price && (
                                                        <span className="text-gray-900">
                                                            {formatPrice(product.price)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(order.products_info?.length || 0) > 3 && (
                                        <div className="text-sm text-gray-500 hover:text-blue-600 pl-1 cursor-pointer">
                                            Xem thêm {(order.products_info?.length || 0) - 3} sản phẩm khác...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Status, Price & Actions */}
                        <div className="flex flex-col sm:items-end justify-between p-4 bg-gray-50/50 sm:w-64 border-t sm:border-t-0">
                            <div className="flex justify-between sm:flex-col sm:items-end w-full gap-2">
                                <Badge className={`${statusInfo.color} whitespace-nowrap`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusInfo.label}
                                </Badge>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-blue-600">
                                        {formatPrice(order.price_to_payment || 0)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {order.payment_type === 'cod' ? 'Thanh toán khi nhận' : 'VNPay'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 w-full justify-end">
                                {order.order_status === 'pending_payment' && (
                                    <Button size="sm" onClick={() => handlePayment(order)} className="flex-1 sm:flex-none">
                                        Thanh toán
                                    </Button>
                                )}
                                
                                {canCancel && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                            setShowCancelDialog(true);
                                            setOrderToCancel(order);
                                            setCancelCountdown(5);
                                            setCanCancel(false);
                                        }}
                                        disabled={isCancelling}
                                    >
                                        {isCancelling ? '...' : <XCircle className="h-4 w-4" />}
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewOrderDetail(order._id)}
                                    className="flex-1 sm:flex-none"
                                >
                                    Xem chi tiết
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Lịch sử đơn hàng</h1>
                        <p className="text-gray-500 mt-1">Quản lý và theo dõi trạng thái đơn hàng của bạn</p>
                    </div>
                    {/* Optional: Add Stats or Main Action here if needed */}
                </div>

                {/* Filters & Search - Redesigned */}
                <div className="bg-white rounded-xl border shadow-sm p-4 mb-8 space-y-4">
                    {/* Top Row: Search & Main Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Tìm kiếm theo mã đơn, tên sản phẩm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10"
                            />
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                             <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                                <SelectTrigger className="w-[180px] h-10">
                                    <SelectValue placeholder="Thanh toán" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả thanh toán</SelectItem>
                                    <SelectItem value="cod">Thanh toán khi nhận (COD)</SelectItem>
                                    <SelectItem value="vnpay">VNPay</SelectItem>
                                </SelectContent>
                            </Select>

                             <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                <SelectTrigger className="w-[160px] h-10">
                                    <SelectValue placeholder="Sắp xếp" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={handleSortToggle}
                                className="h-10 w-10 shrink-0"
                                title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                            >
                                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Secondary Row: Date Range & Clear */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="hidden sm:inline">Thời gian:</span>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-auto h-9 text-xs"
                            />
                            <span>-</span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-auto h-9 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            {(searchTerm || paymentTypeFilter !== 'all' || dateFrom || dateTo) && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Xóa bộ lọc
                                </Button>
                            )}
                            
                             <Select
                                value={itemsPerPage.toString()}
                                onValueChange={(value) => setItemsPerPage(parseInt(value))}
                            >
                                <SelectTrigger className="w-[70px] h-8 text-xs border-none shadow-none bg-gray-50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5 / trang</SelectItem>
                                    <SelectItem value="10">10 / trang</SelectItem>
                                    <SelectItem value="20">20 / trang</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Tabs & Order List */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <TabsList className="bg-transparent p-0 w-full overflow-x-auto flex justify-start border-b border-gray-200 h-auto gap-4 md:gap-8">
                        {Object.entries(ORDER_STATUS_MAP).map(([key, info]) => {
                            const isActive = activeTab === key;
                            return (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className={`
                                        rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 font-medium text-gray-500 hover:text-gray-700
                                        data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none
                                        transition-colors duration-200
                                    `}
                                >
                                    <span className="flex items-center gap-2">
                                        <info.icon className="h-4 w-4" />
                                        <span className="whitespace-nowrap">{info.label}</span>
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {Object.keys(ORDER_STATUS_MAP).map((status) => (
                        <TabsContent key={status} value={status} className="m-0 focus-visible:outline-none focus-visible:ring-0">
                             {loading ? (
                                <div className="flex flex-col justify-center items-center py-20 bg-white rounded-lg border border-dashed">
                                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                                    <span className="text-gray-500 font-medium">Đang tải đơn hàng...</span>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-lg border border-dashed">
                                    <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Package className="h-10 w-10 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Chưa có đơn hàng nào
                                    </h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-8">
                                        {`Bạn chưa có đơn hàng nào trong trạng thái "${
                                            getOrderStatusInfo(status).label
                                        }". Hãy khám phá thêm các sản phẩm khác nhé!`}
                                    </p>
                                    <Button onClick={() => router.push('/products')} className="px-8">
                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                        Mua sắm ngay
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {orders.map(renderOrderCard)}
                                    </div>

                                    {/* Pagination */}
                                    {pagination && pagination.totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                                            <div className="text-sm text-gray-500 order-2 sm:order-1">
                                                Hiển thị <span className="font-medium text-gray-900">{(pagination.currentPage - 1) * pagination.limit + 1}</span> - <span className="font-medium text-gray-900">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}</span> trong tổng số <span className="font-medium text-gray-900">{pagination.totalCount}</span> đơn hàng
                                            </div>
                                            
                                            <div className="flex items-center gap-1 order-1 sm:order-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                    disabled={!pagination.hasPrevPage}
                                                    className="h-9 w-9"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>

                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                        // Smart pagination logic to show relevant pages
                                                        let pageNum = pagination.currentPage;
                                                        if (pagination.totalPages <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (pagination.currentPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                                            pageNum = pagination.totalPages - 4 + i;
                                                        } else {
                                                            pageNum = pagination.currentPage - 2 + i;
                                                        }

                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={pageNum === pagination.currentPage ? 'default' : 'ghost'}
                                                                size="sm"
                                                                onClick={() => handlePageChange(pageNum)}
                                                                className={`h-9 w-9 font-normal ${pageNum === pagination.currentPage ? 'pointer-events-none' : ''}`}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                    disabled={!pagination.hasNextPage}
                                                    className="h-9 w-9"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Cancel Dialog */}
            {showCancelDialog && orderToCancel && (
                <AlertDialog
                    open={showCancelDialog}
                    onOpenChange={(open) => {
                        if (!open) {
                            setShowCancelDialog(false);
                            setOrderToCancel(null);
                            setCancelCountdown(5);
                            setCanCancel(false);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-500" />
                                Xác nhận hủy đơn hàng
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                                <p>Bạn có chắc chắn muốn hủy đơn hàng này không?</p>
                                <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                                    <p className="font-medium">
                                        Mã đơn hàng: #{(orderToCancel._id || '').slice(-8) || 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Shop: {orderToCancel.shop_name || 'Unknown Shop'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Tổng tiền:{' '}
                                        {formatPrice(orderToCancel.price_to_payment || 0)}
                                    </p>
                                </div>
                                <p className="text-sm text-red-600">
                                    ⚠️ Hành động này không thể hoàn tác.
                                </p>
                                {!canCancel && (
                                    <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                        🕐 Vui lòng đợi {cancelCountdown} giây để xác nhận hủy đơn
                                        hàng.
                                    </p>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={() => {
                                    setShowCancelDialog(false);
                                    setOrderToCancel(null);
                                    setCancelCountdown(5);
                                    setCanCancel(false);
                                }}
                                disabled={cancellingOrderId === orderToCancel._id}
                            >
                                Không, giữ đơn hàng
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleCancelOrder(orderToCancel._id)}
                                disabled={cancellingOrderId === orderToCancel._id || !canCancel}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                            >
                                {cancellingOrderId === orderToCancel._id ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Đang hủy...
                                    </>
                                ) : !canCancel ? (
                                    <>
                                        <Clock className="h-4 w-4 mr-2" />
                                        Chờ {cancelCountdown}s
                                    </>
                                ) : (
                                    'Có, hủy đơn hàng'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Payment Modal */}
            {showPaymentModal && orderToPayFor && (
                <VNPayPaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setOrderToPayFor(null);
                    }}
                    order={orderToPayFor}
                    onPaymentSuccess={() => {
                        fetchOrders(); // Refresh orders after successful payment
                    }}
                />
            )}
        </div>
    );
}
