import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const AlertSeverityBorder = ({ severity }: { severity: string }) => {
  const borderClasses = {
    'danger': 'border-red-500',
    'warning': 'border-yellow-500',
    'info': 'border-blue-500'
  };

  return borderClasses[severity as keyof typeof borderClasses] || borderClasses.info;
};

const ActiveAlerts = () => {
  const [_, setLocation] = useLocation();
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts?status=active');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm flex flex-col h-[635px]">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Aktif Uyarılar</h3>
            <button className="text-gray-500 hover:text-gray-700">
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
                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" 
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="border-l-4 border-gray-300 pl-3 py-2 animate-pulse">
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-10"></div>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t mt-auto">
          <div className="h-6 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col h-[635px]">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Aktif Uyarılar</h3>
          <button className="text-gray-500 hover:text-gray-700">
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
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" 
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {alerts && alerts.length > 0 ? (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={cn("border-l-4 pl-3 py-2", AlertSeverityBorder({ severity: alert.severity }))}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium">{alert.message}</h4>
                  <p className="text-xs text-gray-500">
                    Uyarı ID: {alert.id} - Cihaz ID: {alert.device_id}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: tr })}
                </span>
              </div>
              {/* Butonlar kaldırıldı - yalnızca listeleme yapılıyor */}
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-10 w-10 mx-auto text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Aktif uyarı yok</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t mt-auto">
        <button 
          className="w-full py-2 text-sm text-center text-primary hover:underline"
          onClick={() => setLocation('/alerts')}
        >
          Tüm Uyarıları Görüntüle
        </button>
      </div>
    </div>
  );
};

export default ActiveAlerts;