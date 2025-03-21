import StatusOverview from "@/components/dashboard/status-overview";
import DeviceList from "@/components/dashboard/device-list";
import ActiveAlerts from "@/components/dashboard/active-alerts";
import PerformanceMetrics from "@/components/dashboard/performance-metrics";
import { useMonitoring } from "@/hooks/use-monitoring";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

const Dashboard = () => {
  const { isConnected, connect, lastEvent } = useMonitoring();
  const { toast } = useToast();

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // Notify on new alerts
  useEffect(() => {
    if (lastEvent?.type === 'alert') {
      toast({
        title: "Yeni Uyarı",
        description: lastEvent.data.message,
        variant: lastEvent.data.severity === 'danger' ? 'destructive' : 'default',
      });
      // Force refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
    }
    
    // Show connection status toasts
    if (lastEvent?.type === 'connected') {
      toast({
        title: "Bağlantı Kuruldu",
        description: "Gerçek zamanlı güncelleme bağlantısı kuruldu",
        variant: 'default',
      });
    }
    
    if (lastEvent?.type === 'disconnected') {
      toast({
        title: "Bağlantı Kesildi",
        description: "Gerçek zamanlı güncelleme bağlantısı kesildi",
        variant: 'destructive',
      });
    }
  }, [lastEvent, toast]);

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary">Gösterge Paneli</h2>
        <p className="text-gray-600">
          Sistemlerinizi izleyin ve yönetin
          {isConnected && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              <span className="h-2 w-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
              Canlı
            </span>
          )}
        </p>
      </div>

      {/* Status Overview */}
      <StatusOverview />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Device List */}
        <DeviceList />

        {/* Active Alerts */}
        <ActiveAlerts />
      </div>

      {/* Performance Metrics */}
      <PerformanceMetrics />
    </main>
  );
};

export default Dashboard;
