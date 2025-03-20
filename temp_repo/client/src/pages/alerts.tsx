import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, Device } from "@/types";

// Uyarı durumları için tip tanımı
type AlertStatus = 'active' | 'acknowledged' | 'escalated' | 'resolved';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { RefreshCw, AlertTriangle, Filter, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses = {
    'active': 'bg-red-100 text-red-800',
    'acknowledged': 'bg-yellow-100 text-yellow-800',
    'escalated': 'bg-purple-100 text-purple-800',
    'resolved': 'bg-green-100 text-green-800'
  };

  const statusClass = statusClasses[status as keyof typeof statusClasses] || statusClasses.active;
  const statusText = {
    'active': 'Aktif',
    'acknowledged': 'Onaylandı',
    'escalated': 'Yükseltildi',
    'resolved': 'Çözüldü'
  }[status] || status;

  return (
    <Badge className={cn(statusClass)}>
      {statusText}
    </Badge>
  );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
  const severityClasses = {
    'danger': 'bg-red-100 text-red-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'info': 'bg-blue-100 text-blue-800'
  };

  const severityClass = severityClasses[severity as keyof typeof severityClasses] || severityClasses.info;
  const severityText = {
    'danger': 'Kritik',
    'warning': 'Uyarı',
    'info': 'Bilgi'
  }[severity] || severity;

  return (
    <Badge className={cn(severityClass)}>
      {severityText}
    </Badge>
  );
};

const ITEMS_PER_PAGE = 10;

const Alerts = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Uyarıları getir
  const { data: alerts, isLoading: isLoadingAlerts, refetch: refetchAlerts } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  // Cihazları getir
  const { data: devices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });
  
  // Her 60 saniyede bir otomatik yenileme
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAlerts();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [refetchAlerts]);
  
  // Sayfa yenileme işlevi
  const handleRefresh = () => {
    refetchAlerts();
  };

  // Uyarı durumunu güncelleme mutasyonu
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: AlertStatus }) => {
      return await apiRequest<void>('PUT', `/api/alerts/${id}/status`, { 
        body: { status } 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    }
  });

  // Uyarıları filtrele
  const filteredAlerts = alerts?.filter(alert => {
    let matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    let matchesDevice = !deviceFilter || alert.deviceId === deviceFilter;
    let matchesSearch = !searchQuery || 
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesDevice && matchesSearch;
  }) || [];

  // Sayfalama için uyarıları böl
  const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
  const paginatedAlerts = filteredAlerts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleDeviceChange = (deviceId: string) => {
    setDeviceFilter(deviceId === 'all' ? null : Number(deviceId));
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleAcknowledge = (alertId: number) => {
    updateAlertMutation.mutate({ id: alertId, status: 'acknowledged' });
  };

  const handleEscalate = (alertId: number) => {
    // Yükseltme için burada farklı bir durum değeri kullanabiliriz
    // veya özel bir endpoint çağrısı yapabiliriz
    // Şu an için 'escalated' olarak işaretleyelim (backend bu durumu işleyebilir)
    updateAlertMutation.mutate({ id: alertId, status: 'escalated' });
  };

  const handleResolve = (alertId: number) => {
    updateAlertMutation.mutate({ id: alertId, status: 'resolved' });
  };

  if (isLoadingAlerts) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Uyarılar</h2>
          <p className="text-gray-600">Sistem uyarılarını izleyin ve yönetin</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Yenile</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Uyarıları yenile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filtreleme Araçları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Durum Filtresi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="acknowledged">Onaylanmış</SelectItem>
            <SelectItem value="escalated">Yükseltilmiş</SelectItem>
            <SelectItem value="resolved">Çözülmüş</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={deviceFilter?.toString() || 'all'}
          onValueChange={handleDeviceChange}
        >
          <SelectTrigger className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-gray-500" />
            <SelectValue placeholder="Cihaz Filtresi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Cihazlar</SelectItem>
            {devices?.map(device => (
              <SelectItem key={device.id} value={device.id.toString()}>
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Mesaj içinde ara..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Uyarı Listesi */}
      <div className="space-y-4 mb-6">
        {paginatedAlerts.length > 0 ? (
          paginatedAlerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: tr })}
                  </span>
                </div>
                <p className="text-gray-900 mb-4">{alert.message}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Cihaz: {devices?.find(d => d.id === alert.deviceId)?.name || 'Bilinmeyen Cihaz'}
                  </div>
                  <div className="flex space-x-2">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={updateAlertMutation.isPending}
                        >
                          Onayla
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEscalate(alert.id)}
                          disabled={updateAlertMutation.isPending}
                        >
                          Yükselt
                        </Button>
                      </>
                    )}
                    {['active', 'acknowledged', 'escalated'].includes(alert.status as AlertStatus) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleResolve(alert.id)}
                        disabled={updateAlertMutation.isPending}
                      >
                        Çöz
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Filtrelenen kriterlere uygun uyarı bulunamadı</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => {
              const pageNumber = i + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= page - 1 && pageNumber <= page + 1)
              ) {
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => setPage(pageNumber)}
                      isActive={page === pageNumber}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (
                pageNumber === page - 2 ||
                pageNumber === page + 2
              ) {
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
};

export default Alerts;