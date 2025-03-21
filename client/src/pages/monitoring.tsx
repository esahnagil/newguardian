import React, { useState } from "react";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device, Monitor } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Monitor type definitions
const monitorTypes = [
  { value: 'icmp' as const, label: 'ICMP (Ping)' },
  { value: 'snmp' as const, label: 'SNMP' },
  { value: 'http' as const, label: 'HTTP' },
  { value: 'tcp' as const, label: 'TCP Port' }
];

type MonitorType = 'icmp' | 'snmp' | 'http' | 'tcp';

// Base monitor schema
const baseMonitorSchema = z.object({
  deviceId: z.coerce.number().min(1, { message: "Please select a device" }),
  type: z.string().min(1, { message: "Please select a monitor type" }),
  enabled: z.boolean().default(true),
  interval: z.coerce.number().min(10, { message: "Interval must be at least 10 seconds" }).default(60)
});

// ICMP monitor schema
const icmpMonitorSchema = baseMonitorSchema.extend({
  type: z.literal("icmp"),
  config: z.object({
    timeout: z.coerce.number().min(1).default(5),
    packetSize: z.coerce.number().min(1).default(56),
    count: z.coerce.number().min(1).default(3)
  })
});

// SNMP monitor schema
const snmpMonitorSchema = baseMonitorSchema.extend({
  type: z.literal("snmp"),
  config: z.object({
    community: z.string().default("public"),
    version: z.enum(["1", "2c", "3"]).default("2c"),
    port: z.coerce.number().default(161),
    oids: z.array(z.string()).min(1, { message: "At least one OID is required" })
  })
});

// HTTP monitor schema
const httpMonitorSchema = baseMonitorSchema.extend({
  type: z.literal("http"),
  config: z.object({
    url: z.string().url({ message: "Please enter a valid URL" }),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
    headers: z.string().optional(),
    body: z.string().optional(),
    expectedStatus: z.coerce.number().min(100).max(599).default(200),
    timeout: z.coerce.number().min(1).default(5),
    validateSSL: z.boolean().default(true)
  })
});

// TCP monitor schema
const tcpMonitorSchema = baseMonitorSchema.extend({
  type: z.literal("tcp"),
  config: z.object({
    port: z.coerce.number().min(1).max(65535),
    timeout: z.coerce.number().min(1).default(5)
  })
});

// Combined monitor schema
const monitorSchema = z.discriminatedUnion("type", [
  icmpMonitorSchema,
  snmpMonitorSchema,
  httpMonitorSchema,
  tcpMonitorSchema
]);

// Form tipi güncelleniyor
type MonitorFormValues = z.infer<typeof monitorSchema> & {
  id?: number; // İzleyici güncelleme için ID alanı eklendi
};

// Helper for transforming form data
const transformFormData = (data: any): any => {
  // Önce veriyi kopyalayalım
  const transformed = { ...data };
  
  // İsim eşleştirmelerini yapalım (frontend'de camelCase, backend'de snake_case)
  transformed.device_id = transformed.deviceId;
  delete transformed.deviceId;
  
  // Transform headers string to object for HTTP monitors
  if (transformed.type === 'http' && transformed.config.headers) {
    try {
      const headersObj = JSON.parse(transformed.config.headers);
      transformed.config.headers = headersObj;
    } catch (e) {
      // If parsing fails, leave as string and let backend handle it
    }
  }

  // Handle SNMP OIDs
  if (transformed.type === 'snmp' && typeof transformed.config.oids === 'string') {
    transformed.config.oids = transformed.config.oids.split('\n').map((oid: string) => oid.trim()).filter(Boolean);
  }

  return transformed;
};

const MonitorTypeIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    'icmp': (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    'snmp': (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-purple-500"
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
    ),
    'http': (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
    'tcp': (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    )
  };

  return icons[type] || (
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
        d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  );
};

// Not: data-replit-metadata otomatik olarak ekleniyor, ancak uyarılara neden oluyor
const Monitoring = () => {
  const { toast } = useToast();
  const [isAddMonitorOpen, setIsAddMonitorOpen] = useState(false);
  const [selectedMonitorType, setSelectedMonitorType] = useState<"icmp" | "snmp" | "http" | "tcp" | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false); // Added state for Add Device dialog

  // Fetch devices
  const { data: devices } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });
  

  // Cihaz schema tanımı
  const deviceSchema = z.object({
    name: z.string().min(1, "Cihaz adı girilmelidir"),
    ipAddress: z.string().ip("Geçerli bir IP adresi girin"),
    type: z.string().min(1, "Cihaz türü seçilmelidir")
  });
  
  // Cihaz tipi için form değişkeni
  type DeviceFormValues = z.infer<typeof deviceSchema>;

  // Cihaz ekleme için ayrı bir form instance'ı
  const deviceForm = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: '',
      ipAddress: '',
      type: 'server'
    }
  });

  // Fetch monitors
  const { data: monitors, isLoading: isLoadingMonitors } = useQuery<Monitor[]>({
    queryKey: ['/api/monitors'],
  });

  // Sadece genişletilmiş cihazın ID'sini tutacak state
  const [expandedDeviceId, setExpandedDeviceId] = useState<number | null>(null);

  // Genişlet/daralt toggle fonksiyonu
  const toggleDeviceExpanded = (deviceId: number) => {
    setExpandedDeviceId(prev => prev === deviceId ? null : deviceId);
  };

  // Cihaz ayarları panelini aç
  const handleDeviceSettings = (
    device: Device, 
    monitorTab: boolean = false, 
    e?: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedDevice(device);
    setActiveTab(monitorTab ? "monitors" : "info");
    setIsDeviceSheetOpen(true);
  };

  // Determine the default form values based on the selected monitor type
  const getDefaultValues = () => {
    const baseDefaults = {
      deviceId: 0,
      enabled: true,
      interval: 60,
    };

    switch (selectedMonitorType) {
      case 'icmp':
        return {
          ...baseDefaults,
          type: 'icmp',
          config: {
            timeout: 5,
            packetSize: 56,
            count: 3
          }
        };
      case 'snmp':
        return {
          ...baseDefaults,
          type: 'snmp',
          config: {
            community: 'public',
            version: '2c',
            port: 161,
            oids: []
          }
        };
      case 'http':
        return {
          ...baseDefaults,
          type: 'http',
          config: {
            url: '',
            method: 'GET',
            headers: '',
            body: '',
            expectedStatus: 200,
            timeout: 5,
            validateSSL: true
          }
        };
      case 'tcp':
        return {
          ...baseDefaults,
          type: 'tcp',
          config: {
            port: 80,
            timeout: 5
          }
        };
      default:
        return baseDefaults;
    }
  };

  // Create form with correct typing
  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      deviceId: 0,
      type: "tcp",
      enabled: true,
      interval: 60,
      config: {
        port: 80,
        timeout: 5
      }
    } as any
  });

  // Watch the monitor type to dynamically update form fields
  const watchMonitorType = form.watch("type");

  // Reset form when monitor type changes
  const handleMonitorTypeChange = (value: "icmp" | "snmp" | "http" | "tcp") => {
    setSelectedMonitorType(value);

    // Tip hatalarını önlemek için uygun tipleri kullanın ve defaultValues kullanmayın
    if (value === "icmp") {
      form.reset({
        deviceId: 0,
        type: "icmp",
        enabled: true,
        interval: 60,
        config: {
          timeout: 5,
          packetSize: 56,
          count: 3
        }
      } as any);
    } else if (value === "snmp") {
      form.reset({
        deviceId: 0,
        type: "snmp",
        enabled: true,
        interval: 60,
        config: {
          community: "public",
          version: "2c",
          port: 161,
          oids: []
        }
      } as any);
    } else if (value === "http") {
      form.reset({
        deviceId: 0,
        type: "http",
        enabled: true,
        interval: 60,
        config: {
          url: "",
          method: "GET",
          headers: "",
          body: "",
          expectedStatus: 200,
          timeout: 5,
          validateSSL: true
        }
      } as any);
    } else if (value === "tcp") {
      form.reset({
        deviceId: 0,
        type: "tcp",
        enabled: true,
        interval: 60,
        config: {
          port: 80,
          timeout: 5
        }
      } as any);
    }
  };

  // İzleyici oluşturma işlemi
  const createMonitorMutation = useMutation({
    mutationFn: async (values: MonitorFormValues) => {
      const transformedData = transformFormData(values);
      // deviceId -> device_id dönüşümünü yaparak API ile uyumlu hale getiriyoruz
      const payload = {
        device_id: transformedData.deviceId || transformedData.device_id,
        type: transformedData.type,
        config: transformedData.config,
        enabled: transformedData.enabled,
        interval: transformedData.interval
      };
      console.log("API payload:", payload);
      
      // PayLoad'u doğrudan göndermek yerine, method ve URL ile birlikte gönderiyoruz
      return await apiRequest('POST', '/api/monitors', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitors'] });
      toast({
        title: "İzleyici Eklendi",
        description: "İzleyici başarıyla eklendi.",
      });
      // Form boş değerlerle sıfırla
      if (selectedMonitorType === "tcp") {
        form.reset({
          deviceId: 0,
          type: "tcp",
          enabled: true,
          interval: 60,
          config: {
            port: 80,
            timeout: 5
          }
        } as any);
      } else {
        // Diğer tipler için aynı şekilde yap
        setSelectedMonitorType(null);
      }
      setIsAddMonitorOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `İzleyici eklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  // İzleyici durumunu değiştirme işlemi
  const toggleMonitorMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      return await apiRequest('PUT', `/api/monitors/${id}`, { body: { enabled } });
    },
    onSuccess: (data, variables) => {
      // Otomatik olarak sorguyu yenileme - bu durum değişikliğini önlüyor
      // queryClient.invalidateQueries({ queryKey: ['/api/monitors'] });

      toast({
        title: "İzleyici Güncellendi",
        description: "İzleyici durumu güncellendi.",
      });

      // API yanıtıyla cache'i manuel olarak güncelle
      const currentMonitors = queryClient.getQueryData(['/api/monitors']) as Monitor[] | undefined;
      if (currentMonitors) {
        const updatedMonitors = currentMonitors.map(monitor =>
          monitor.id === variables.id
            ? { ...monitor, enabled: variables.enabled }
            : monitor
        );
        queryClient.setQueryData(['/api/monitors'], updatedMonitors);
      }

      // Eğer drawer açıksa ve seçili bir izleyici varsa, o izleyiciyi de güncelle
      //  Drawer removed, this condition is always false now.
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `İzleyici güncellenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  // İzleyici silme işlemi
  const deleteMonitorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/monitors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitors'] });
      toast({
        title: "İzleyici Silindi",
        description: "İzleyici başarıyla silindi.",
      });
      // setIsDrawerOpen(false); // Drawer removed
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `İzleyici silinemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: MonitorFormValues) => {
    createMonitorMutation.mutate(values);
  };

  // Get device name by ID
  const getDeviceName = (deviceId: number) => {
    return devices?.find(d => d.id === deviceId)?.name || 'Unknown Device';
  };

  // Configure the appropriate form sections based on the monitor type
  const renderMonitorConfigFields = () => {
    switch (watchMonitorType) {
      case 'icmp':
        return (
          <>
            <FormField
              control={form.control}
              name="config.timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Yanıt bekleme süresi
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.packetSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paket Boyutu (byte)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ping Sayısı (adet)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Gönderilecek ping paket sayısı
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'snmp':
        return (
          <>
            <FormField
              control={form.control}
              name="config.community"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topluluk Adı</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SNMP Versiyonu</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="SNMP versiyonu seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Versiyon 1</SelectItem>
                      <SelectItem value="2c">Versiyon 2c</SelectItem>
                      <SelectItem value="3">Versiyon 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port Numarası</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="65535" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.oids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OID Listesi (her OID ayrı satırda)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder=".1.3.6.1.2.1.1.3.0"
                      onChange={(e) => field.onChange(e.target.value.split('\n').map(oid => oid.trim()).filter(Boolean))}
                    />
                  </FormControl>
                  <FormDescription>
                    OID'leri her birini ayrı satıra girin (örneğin, sistem çalışma süresi: .1.3.6.1.2.1.1.3.0)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'http':
        return (
          <>
            <FormField
              control={form.control}
              name="config.url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Adresi</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Metodu</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="HTTP metodu seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP Başlıkları (JSON formatında)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder='{"Content-Type": "application/json"}'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Başlıkları JSON formatında girin (isteğe bağlı)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İstek Gövdesi</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="İstek gövdesi içeriği (gerekirse)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    İstek gövdesi içeriğini girin (isteğe bağlı)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.expectedStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beklenen Durum Kodu</FormLabel>
                  <FormControl>
                    <Input type="number" min="100" max="599" {...field} />
                  </FormControl>
                  <FormDescription>
                    Başarılı HTTP durum kodunu belirtin (varsayılan: 200)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.validateSSL"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>SSL Doğrulama</FormLabel>
                    <FormDescription>
                      SSL sertifikalarını doğrula
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        );
      case 'tcp':
        return (
          <>
            <FormField
              control={form.control}
              name="config.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port Numarası</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="65535" {...field} />
                  </FormControl>
                  <FormDescription>
                    İzlenecek TCP portu (örneğin, HTTP için 80, SSH için 22)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="config.timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      default:
        return null;
    }
  };

  // Group monitors by device
  const monitorsByDevice = monitors?.reduce((acc, monitor) => {
    const deviceId = monitor.deviceId;
    if (!acc[deviceId]) {
      acc[deviceId] = [];
    }
    acc[deviceId].push(monitor);
    return acc;
  }, {} as Record<number, Monitor[]>) || {};

  // Handle toggle monitor status
  const handleToggleMonitor = (id: number, currentStatus: boolean) => {
    // Arayüzü hemen güncelle (optimistic update)
    const updatedMonitors = monitors?.map(m =>
      m.id === id ? { ...m, enabled: !currentStatus } : m
    );

    // Optimistically update the query cache
    queryClient.setQueryData(['/api/monitors'], updatedMonitors);

    // Arkada API isteğini yap
    toggleMonitorMutation.mutate({ id, enabled: !currentStatus });
  };

  // Add Device related schema and mutation
  const deviceTypes = [
    { value: 'server', label: 'Sunucu' },
    { value: 'router', label: 'Yönlendirici' },
    { value: 'switch', label: 'Anahtar' },
    { value: 'firewall', label: 'Güvenlik Duvarı' },
    { value: 'workstation', label: 'İş İstasyonu' },
    { value: 'printer', label: 'Yazıcı' },
    { value: 'camera', label: 'Kamera' },
    { value: 'webserver', label: 'Web Sunucusu' },
    { value: 'database', label: 'Veritabanı' },
    { value: 'cloudservice', label: 'Bulut Servisi' },
    { value: 'other', label: 'Diğer' }
  ];

  // DeviceFormValues tipi zaten yukarıda tanımlandı
  
  const createDeviceMutation = useMutation({
    mutationFn: async (data: DeviceFormValues) => {
      return await apiRequest('POST', '/api/devices', { body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({ title: 'Cihaz Eklendi', description: 'Cihaz başarıyla eklendi.' });
      setIsAddDeviceOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Hata',
        description: `Cihaz eklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        variant: 'destructive'
      });
    }
  });

  const handleDeviceSubmit = (values: DeviceFormValues) => {
    createDeviceMutation.mutate(values);
  };


  // Update monitor mutation
  const updateMonitorMutation = useMutation({
    mutationFn: async (values: MonitorFormValues) => {
      if (!values.id) throw new Error("Monitor ID is required");
      const transformedData = transformFormData(values);
      return await apiRequest('PUT', `/api/monitors/${values.id}`, { body: JSON.stringify(transformedData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/monitors'] });
      toast({
        title: "İzleyici Güncellendi",
        description: "İzleyici başarıyla güncellendi.",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: `İzleyici güncellenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        variant: "destructive",
      });
    }
  });

  // Form reset function for monitor update
  const resetMonitorForm = (monitor: Monitor) => {
    form.reset({
      id: monitor.id,
      deviceId: monitor.deviceId,
      type: monitor.type as any,
      enabled: monitor.enabled,
      interval: monitor.interval,
      config: monitor.config
    });
  };

  // Handle monitor update
  const onUpdateMonitor = (values: MonitorFormValues) => {
    updateMonitorMutation.mutate(values);
  };

  // Get monitor type label
  const getMonitorTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'icmp': 'ICMP (Ping)',
      'snmp': 'SNMP',
      'http': 'HTTP',
      'tcp': 'TCP Port'
    };
    return labels[type] || type;
  };

  // ... diğer yardımcı fonksiyonlar

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">İzleme</h2>
          <p className="text-gray-600">İzleme kontrollerini yapılandırın ve yönetin</p>
        </div>
        <div>
          <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
            <DialogTrigger asChild>
              <Button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Cihaz Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Cihaz Ekle</DialogTitle>
              </DialogHeader>
              <Form {...deviceForm}>
                <form onSubmit={deviceForm.handleSubmit(handleDeviceSubmit)} className="space-y-4">
                  <FormField
                    control={deviceForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cihaz Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Cihaz adını girin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}                  />
                  <FormField
                    control={deviceForm.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IP Adresi</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deviceForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cihaz Türü</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Cihaz türü seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {deviceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createDeviceMutation.isPending}
                    >
                      {createDeviceMutation.isPending ? "Ekleniyor..." : "Cihaz Ekle"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          {/* İzleyici ekle diyaloğu kaldırıldı */}
        </div>
      </div>

      {/* Cihaz Ayarları Sheet */}
      <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Cihaz Ayarları</SheetTitle>
            <SheetDescription>
              {selectedDevice?.name} ({selectedDevice?.ipAddress})
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <Tabs defaultValue={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="info">Bilgiler</TabsTrigger>
                <TabsTrigger value="settings">Ayarlar</TabsTrigger>
                <TabsTrigger value="monitors">İzleyiciler</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">Cihaz Adı</h3>
                      <p>{selectedDevice?.name}</p>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">IP Adresi</h3>
                      <p>{selectedDevice?.ipAddress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">Cihaz Türü</h3>
                      <p>{selectedDevice?.type}</p>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">Ekleme Tarihi</h3>
                      <p>{new Date(selectedDevice?.createdAt || '').toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">Cihaz Adı</h3>
                      <Input
                        placeholder="Cihaz adı"
                        defaultValue={selectedDevice?.name}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">IP Adresi</h3>
                      <Input
                        placeholder="IP adresi"
                        defaultValue={selectedDevice?.ipAddress}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-medium text-gray-700">Cihaz Türü</h3>
                      <Select defaultValue={selectedDevice?.type}>
                        <SelectTrigger>
                          <SelectValue placeholder="Cihaz türü seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeviceSheetOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button
                      onClick={() => {
                        toast({
                          title: "Bilgilendirme",
                          description: "Bu özellik henüz geliştirme aşamasındadır.",
                        });
                      }}
                    >
                      Değişiklikleri Kaydet
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="monitors" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">İzleyiciler</h3>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (selectedDevice) {
                          form.setValue("deviceId", selectedDevice.id);
                          setIsAddMonitorOpen(true);
                        }
                      }}
                    >
                      İzleyici Ekle
                    </Button>
                  </div>
                  {selectedDevice && monitorsByDevice[selectedDevice.id]?.map((monitor) => (
                    <Accordion
                      key={monitor.id}
                      type="single"
                      collapsible
                      className="w-full"
                    >
                      <AccordionItem value={`monitor-${monitor.id}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-4">
                            <MonitorTypeIcon type={monitor.type} />
                            <div>
                              <h4 className="font-medium">{getMonitorTypeLabel(monitor.type)}</h4>
                              <p className="text-sm text-gray-500">
                                Her {monitor.interval} saniyede bir kontrol
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={monitor.enabled}
                              onCheckedChange={(checked) => handleToggleMonitor(monitor.id, monitor.enabled)}
                            />
                            <AccordionTrigger onClick={() => resetMonitorForm(monitor)}>
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </AccordionTrigger>
                          </div>
                        </div>
                        <AccordionContent>
                          <div className="p-4 space-y-4">
                            <Form {...form}>
                              <form onSubmit={form.handleSubmit(onUpdateMonitor)} className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="type"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>İzleyici Tipi</FormLabel>
                                      <FormControl>
                                        <Input value={getMonitorTypeLabel(field.value)} disabled />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="enabled"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                      <div className="space-y-0.5">
                                        <FormLabel>Etkin</FormLabel>
                                        <FormDescription>
                                          İzleyiciyi etkinleştir veya devre dışı bırak
                                        </FormDescription>
                                      </div>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="interval"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Kontrol Aralığı (saniye)</FormLabel>
                                      <FormControl>
                                        <Input type="number" min="10" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        İzleyicinin ne sıklıkla kontrol yapacağı
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Tip bazlı form alanları */}
                                {watchMonitorType === 'http' && (
                                  <>
                                    <FormField
                                      control={form.control}
                                      name="config.url"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>URL</FormLabel>
                                          <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.method"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>HTTP Metodu</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="HTTP metodu seçin" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="GET">GET</SelectItem>
                                              <SelectItem value="POST">POST</SelectItem>
                                              <SelectItem value="PUT">PUT</SelectItem>
                                              <SelectItem value="DELETE">DELETE</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.headers"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>HTTP Başlıkları (JSON formatında)</FormLabel>
                                          <FormControl>
                                            <textarea
                                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              placeholder='{"Content-Type": "application/json"}'
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormDescription>
                                            Başlıkları JSON formatında girin (isteğe bağlı)
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.body"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>İstek Gövdesi</FormLabel>
                                          <FormControl>
                                            <textarea
                                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              placeholder="İstek gövdesi içeriği (gerekirse)"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormDescription>
                                            İstek gövdesi içeriğini girin (isteğe bağlı)
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.expectedStatus"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Beklenen Durum Kodu</FormLabel>
                                          <FormControl>
                                            <Input type="number" min="100" max="599" {...field} />
                                          </FormControl>
                                          <FormDescription>
                                            Başarılı HTTP durum kodunu belirtin (varsayılan: 200)
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.timeout"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                                          <FormControl>
                                            <Input type="number" min="1" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.validateSSL"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                          <div className="space-y-0.5">
                                            <FormLabel>SSL Doğrulama</FormLabel>
                                            <FormDescription>
                                              SSL sertifikalarını doğrula
                                            </FormDescription>
                                          </div>
                                          <FormControl>
                                            <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </>
                                )}

                                {watchMonitorType === 'tcp' && (
                                  <>
                                    <FormField
                                      control={form.control}
                                      name="config.port"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Port Numarası</FormLabel>
                                          <FormControl>
                                            <Input type="number" min="1" max="65535" {...field} />
                                          </FormControl>
                                          <FormDescription>
                                            İzlenecek TCP portu (örneğin, HTTP için 80, SSH için 22)
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="config.timeout"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                                          <FormControl>
                                            <Input type="number" min="1" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </>
                                )}

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    type="submit"
                                    disabled={updateMonitorMutation.isPending}
                                  >
                                    {updateMonitorMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative w-full overflow-auto">
          {isLoadingMonitors || !devices ? (
            <div className="flex justify-center items-center h-24">
              <div className="flex justify-center items-center space-x-2">
                <svg
                  className="animate-spin h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Yükleniyor...</span>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-400 mb-3"
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
              <p>Henüz cihaz bulunmuyor. Önce cihaz eklemelisiniz.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[200px]">Cihaz</TableHead>
                  <TableHead>IP Adresi</TableHead>
                  <TableHead>İzleyici Durumu</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  // Cihaza ait tüm izleyicileri bul
                  const deviceMonitors = monitors?.filter(m => m.deviceId === device.id) || [];
                  const totalMonitors = deviceMonitors.length;
                  const activeMonitors = deviceMonitors.filter(m => m.enabled).length;
                  const isExpanded = expandedDeviceId === device.id;

                  // Cihazın genel durumunu belirle (en az bir izleyici varsa)
                  let overallStatus = 'unknown';
                  if (totalMonitors > 0) {
                    // İzleyicilerin çoğu aktifse "online" olarak kabul et
                    // (burada daha karmaşık bir mantık da uygulanabilir)
                    overallStatus = activeMonitors > 0 ? 'online' : 'offline';
                  }

                  return (
                    <div key={device.id.toString()}>
                      {/* Ana cihaz satırı */}
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-gray-50",
                          isExpanded && "bg-gray-50"
                        )}
                        onClick={() => toggleDeviceExpanded(device.id)}
                      >
                        <TableCell>
                          <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {/* Cihaz türüne göre ikon göster */}
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
                            <span>{device.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{device.ipAddress}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {activeMonitors > 0 && (
                              <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                {activeMonitors}
                              </div>
                            )}
                            {(totalMonitors - activeMonitors) > 0 && (
                              <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                {totalMonitors - activeMonitors}
                              </div>
                            )}
                            {activeMonitors === 0 && (totalMonitors - activeMonitors) === 0 && (
                              <div className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                                0
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeviceSettings(device, false, e);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Ayarlar
                            </Button>

                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Genişletilmiş cihaz izleyicileri - Kart şeklinde */}
                      {isExpanded && (
                        <TableRow key={`${device.id}-monitors`} className="bg-gray-50 animate-fadeIn">
                          <TableCell></TableCell>
                          <TableCell colSpan={4} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slideDown">
                              {deviceMonitors.map(monitor => (
                                <div
                                  key={`${device.id}-${monitor.id}`}
                                  className="border rounded-lg shadow-sm bg-white relative cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => {
                                    // Önce cihaz ayarları sayfasını aç ve izleyiciler sekmesini seç
                                    handleDeviceSettings(device, true);
                                    // Seçili izleyiciyi düzenleme için ayarla
                                    setSelectedMonitorType(monitor.type as any);
                                  }}
                                >
                                  {/* Aç/Kapat switch'i sağ tarafta ortalı */}
                                  <div className="absolute top-0 right-3 bottom-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                    <Switch
                                      checked={monitor.enabled}
                                      onCheckedChange={() => handleToggleMonitor(monitor.id, monitor.enabled)}
                                      className={cn(
                                        "data-[state=checked]:bg-green-500",
                                        "data-[state=unchecked]:bg-gray-200"
                                      )}
                                    />
                                  </div>

                                  <div className="p-4 h-full flex items-center">
                                    {/* İzleyici başlığı ve tipi */}
                                    <div className="flex items-center space-x-2">
                                      <MonitorTypeIcon type={monitor.type} />
                                      <span className="font-medium">
                                        {monitorTypes.find(t => t.value === monitor.type)?.label || monitor.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Eğer cihazın izleyicisi yoksa ve genişletilmişse bilgi mesajı göster */}
                      {isExpanded && deviceMonitors.length === 0 && (
                        <TableRow className="bg-gray-50 animate-fadeIn">
                          <TableCell colSpan={5} className="text-center py-4">
                            <p className="text-gray-500">Bu cihaz için henüz izleyici bulunmuyor.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </div>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* İzleyici Ekleme Diyaloğu */}
      <Dialog open={isAddMonitorOpen} onOpenChange={setIsAddMonitorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni İzleyici Ekle</DialogTitle>
            <DialogDescription>
              {selectedDevice ? `"${selectedDevice.name}" cihazı için yeni bir izleyici ekleyin.` : 'Yeni bir izleyici ekleyin.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İzleyici Tipi</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedMonitorType(value as "icmp" | "snmp" | "http" | "tcp");
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="İzleyici türü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="icmp">ICMP (Ping)</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="tcp">TCP Port</SelectItem>
                        <SelectItem value="snmp">SNMP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Etkin</FormLabel>
                      <FormDescription>
                        İzleyiciyi oluşturulduğunda etkinleştir
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontrol Aralığı (saniye)</FormLabel>
                    <FormControl>
                      <Input type="number" min="10" {...field} />
                    </FormControl>
                    <FormDescription>
                      İzleyicinin ne sıklıkla kontrol yapacağı
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedMonitorType === 'http' && (
                <>
                  <FormField
                    control={form.control}
                    name="config.url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="config.method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTTP Metodu</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="HTTP metodu seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="config.timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {selectedMonitorType === 'tcp' && (
                <>
                  <FormField
                    control={form.control}
                    name="config.port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port Numarası</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="65535" {...field} />
                        </FormControl>
                        <FormDescription>
                          İzlenecek TCP portu (örneğin, HTTP için 80, SSH için 22)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="config.timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zaman Aşımı (saniye)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddMonitorOpen(false)}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMonitorMutation.isPending}
                >
                  {createMonitorMutation.isPending ? "Ekleniyor..." : "İzleyici Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

const getMonitorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'icmp': 'ICMP (Ping)',
    'snmp': 'SNMP',
    'http': 'HTTP',
    'tcp': 'TCP Port'
  };
  return labels[type] || type;
};

// onUpdateMonitor fonksiyonu yukarıda zaten tanımlandı

export default Monitoring;