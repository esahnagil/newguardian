import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Device, DeviceWithStatus, MonitorResult, Monitor } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const DeviceIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    'router': (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 6h16M4 10h16M4 14h16M4 18h16" 
        />
      </svg>
    ),
    'switch': (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
        />
      </svg>
    ),
    'server': (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" 
        />
      </svg>
    ),
    'access_point': (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" 
        />
      </svg>
    ),
    'default': (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" 
        />
      </svg>
    )
  };

  return icons[type] || icons.default;
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses = {
    'online': 'bg-green-100 text-green-800',
    'warning': 'bg-yellow-100 text-yellow-800',
    'down': 'bg-red-100 text-red-800',
    'unknown': 'bg-gray-100 text-gray-800'
  };

  const statusClass = statusClasses[status as keyof typeof statusClasses] || statusClasses.unknown;

  return (
    <span className={cn("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", statusClass)}>
      {status === 'online' ? 'Çevrimiçi' : status === 'warning' ? 'Uyarı' : status === 'down' ? 'Çevrimdışı' : 'Bilinmiyor'}
    </span>
  );
};

const DeviceList = () => {
  const [page, setPage] = useState(1);
  const [perPage] = useState(5);

  const { data: devices, isLoading: isLoadingDevices, refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const { data: monitors, isLoading: isLoadingMonitors, refetch: refetchMonitors } = useQuery<Monitor[]>({
    queryKey: ['/api/monitors'],
  });

  // Get latest status for each device
  const devicesWithStatus = devices?.map(device => {
    const deviceMonitors = monitors?.filter(monitor => monitor.deviceId === device.id) || [];

    // Default values
    let worstStatus = 'unknown';
    let responseTime: number | undefined;
    let lastCheck: string | undefined;

    // Get the status priority from worst to best: down > warning > online > unknown
    const statusPriority = { 'down': 3, 'warning': 2, 'online': 1, 'unknown': 0 };

    // Check all monitors for this device and determine the worst status
    deviceMonitors.forEach(monitor => {
      const monitorResult = monitor.latestResult as MonitorResult | undefined;

      if (monitorResult) {
        const currentStatusPriority = statusPriority[monitorResult.status as keyof typeof statusPriority] || 0;
        const worstStatusPriority = statusPriority[worstStatus as keyof typeof statusPriority] || 0;

        // Update if the current status is worse
        if (currentStatusPriority > worstStatusPriority) {
          worstStatus = monitorResult.status;
        }

        // Capture response time from any ICMP monitor
        if (monitor.type === 'icmp' && monitorResult.responseTime) {
          responseTime = monitorResult.responseTime;
        }

        // Update last check time if newer
        if (!lastCheck || new Date(monitorResult.timestamp) > new Date(lastCheck)) {
          lastCheck = monitorResult.timestamp;
        }
      }
    });

    return {
      ...device,
      status: worstStatus,
      responseTime,
      lastCheck
    } as DeviceWithStatus;
  });

  const isLoading = isLoadingDevices || isLoadingMonitors;

  // Pagination calculations
  const totalDevices = devicesWithStatus?.length || 0;
  const totalPages = Math.ceil(totalDevices / perPage);
  const paginatedDevices = devicesWithStatus?.slice((page - 1) * perPage, page * perPage);

  const handleRefresh = async () => {
    await Promise.all([
      refetchDevices(),
      refetchMonitors()
    ]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm lg:col-span-2 flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">İzlenen Cihazlar</h3>
          <div className="flex space-x-2">
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={handleRefresh}
              title="Listeyi Yenile"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="min-w-full">
          {/* Fixed Header */}
          <div className="bg-gray-50 border-b">
            <div className="flex">
              <div className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cihaz</div>
              <div className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</div>
              <div className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yanıt Süresi</div>
              <div className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Kontrol</div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto" style={{ height: "calc(100% - 40px)" }}>
            {isLoading ? (
              Array(perPage).fill(0).map((_, idx) => (
                <div key={idx} className="flex w-full animate-pulse hover:bg-gray-50">
                  <div className="w-2/5 px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-32 mt-1"></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-1/5 px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-1/5 px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="w-1/5 px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))
            ) : paginatedDevices?.length ? (
              paginatedDevices.map(device => (
                <div key={device.id} className="flex w-full hover:bg-gray-50 border-b border-gray-200">
                  <div className="w-2/5 px-6 py-4">
                    <div className="flex items-center">
                      <DeviceIcon type={device.type} />
                      <div className="ml-2">
                        <div className="text-sm font-medium">{device.name}</div>
                        <div className="text-xs text-gray-500">{device.ipAddress}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-1/5 px-6 py-4">
                    <StatusBadge status={device.status || 'unknown'} />
                  </div>
                  <div className="w-1/5 px-6 py-4 text-sm">
                    {device.responseTime ? `${device.responseTime} ms` : '-'}
                  </div>
                  <div className="w-1/5 px-6 py-4 text-sm text-gray-500">
                    {device.lastCheck ? formatDistanceToNow(new Date(device.lastCheck), { addSuffix: true, locale: tr }) : 'Hiç'}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-sm text-gray-500">
                Cihaz bulunamadı
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalDevices} cihazdan {paginatedDevices?.length || 0} tanesi gösteriliyor
          </p>
          <div className="flex space-x-2">
            <button 
              className={cn("px-3 py-1 text-xs border rounded", {
                "hover:bg-gray-50": page > 1,
                "opacity-50 cursor-not-allowed": page <= 1
              })}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page <= 1}
            >
              Önceki
            </button>

            {[...Array(Math.min(totalPages, 3))].map((_, idx) => {
              const pageNumber = page <= 2 ? idx + 1 : page - 1 + idx;
              if (pageNumber > totalPages) return null;

              return (
                <button 
                  key={pageNumber}
                  className={cn("px-3 py-1 text-xs rounded", {
                    "bg-primary text-white": pageNumber === page,
                    "border hover:bg-gray-50": pageNumber !== page
                  })}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button 
              className={cn("px-3 py-1 text-xs border rounded", {
                "hover:bg-gray-50": page < totalPages,
                "opacity-50 cursor-not-allowed": page >= totalPages
              })}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceList;