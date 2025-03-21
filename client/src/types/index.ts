export interface Device {
  id: number;
  name: string;
  ip_address: string;
  type: string;
  location?: string;
  maintenance_mode?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: number;
  device_id: number;
  type: string;
  config: any;
  enabled: boolean;
  interval: number;
  created_at: string;
  updated_at: string;
}

export interface MonitorResult {
  id: number;
  monitor_id: number;
  timestamp: string;
  status: string;
  response_time?: number;
  details?: any;
}

export interface Alert {
  id: number;
  device_id: number;
  monitor_id: number;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface DashboardSummary {
  devices: {
    total: number;
    online: number;
    percentage: number;
  };
  web_services: {
    total: number;
    online: number;
    percentage: number;
  };
  active_alerts: number;
  average_response_time: number;
}

export interface DeviceWithStatus extends Device {
  status?: string;
  response_time?: number;
  last_check?: string;
}

export interface DeviceWithMonitors extends Device {
  monitors?: Monitor[];
  total_monitors?: number;
  active_monitors?: number;
  status?: 'online' | 'offline' | 'warning' | 'unknown';
}

export interface DeviceTypeIcon {
  [key: string]: JSX.Element;
}

export interface DeviceTypeLabel {
  [key: string]: string;
}
