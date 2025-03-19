import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Form doğrulama şemaları güncellendi
const generalSettingsSchema = z.object({
  refreshInterval: z.coerce.number().min(5, {
    message: "Yenileme aralığı en az 5 saniye olmalıdır",
  }).max(3600, {
    message: "Yenileme aralığı en fazla 3600 saniye olmalıdır",
  }),
  autoAcknowledge: z.boolean().default(false),
  autoResolve: z.boolean().default(false),
  retryCount: z.coerce.number().min(1, {
    message: "En az 1 deneme yapılmalıdır"
  }).max(10, {
    message: "En fazla 10 deneme yapılabilir"
  }),
});

const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().default(false),
  emailRecipients: z.string().optional(),
  slackEnabled: z.boolean().default(false),
  slackWebhook: z.string().url({ message: "Lütfen geçerli bir URL girin" }).optional().or(z.literal('')),
  severity: z.enum(["all", "warning", "danger"]).default("all"),
});

type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;

const Settings = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // General settings form
  const generalForm = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      refreshInterval: 60,
      autoAcknowledge: false,
      autoResolve: false,
      retryCount: 3,
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailEnabled: false,
      emailRecipients: "",
      slackEnabled: false,
      slackWebhook: "",
      severity: "all",
    },
  });

  // Form submission handlers
  // Toast bildirim mesajları güncellendi
  const onGeneralSubmit = (data: GeneralSettingsValues) => {
    console.log("General settings:", data);
    toast({
      title: "Ayarlar Güncellendi",
      description: "Genel ayarlar başarıyla kaydedildi.",
    });
  };

  const onNotificationSubmit = (data: NotificationSettingsValues) => {
    console.log("Notification settings:", data);
    toast({
      title: "Ayarlar Güncellendi",
      description: "Bildirim ayarları başarıyla kaydedildi.",
    });
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Ayarlar</h2>
        <p className="text-gray-600">Uygulama ayarlarını yapılandırın</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>
                Sistem genelindeki izleme ayarlarını yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                  <FormField
                    control={generalForm.control}
                    name="refreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gösterge Paneli Yenileme Aralığı (saniye)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Gösterge panelinin ne sıklıkla güncelleneceği
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="retryCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İzleme Yeniden Deneme Sayısı</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Bir servis çalışmadığında kaç kez yeniden denenecek
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="autoAcknowledge"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Otomatik Uyarı Onaylama</FormLabel>
                            <FormDescription>
                              Belirli bir süre sonra uyarıları otomatik olarak onayla
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
                      control={generalForm.control}
                      name="autoResolve"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Otomatik Uyarı Çözümleme</FormLabel>
                            <FormDescription>
                              Servis düzeldiğinde uyarıları otomatik olarak çözümle
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
                  </div>

                  <Button type="submit">Genel Ayarları Kaydet</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Ayarları</CardTitle>
              <CardDescription>
                Uyarı ve bildirim tercihlerinizi yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Uyarı Önem Seviyesi</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Önem seviyesi seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Tüm Uyarılar</SelectItem>
                            <SelectItem value="warning">Uyarı ve Kritik</SelectItem>
                            <SelectItem value="danger">Sadece Kritik</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Hangi önem seviyesindeki uyarılar için bildirim alacağınızı seçin
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">E-posta Bildirimleri</FormLabel>
                            <FormDescription>
                              Bildirimleri e-posta ile alın
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

                    {notificationForm.watch("emailEnabled") && (
                      <FormField
                        control={notificationForm.control}
                        name="emailRecipients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-posta Alıcıları</FormLabel>
                            <FormControl>
                              <Input placeholder="ornek@mail.com, diger@mail.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Virgülle ayrılmış e-posta adresleri listesi
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="slackEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Slack Bildirimleri</FormLabel>
                            <FormDescription>
                              Bildirimleri Slack üzerinden alın
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

                    {notificationForm.watch("slackEnabled") && (
                      <FormField
                        control={notificationForm.control}
                        name="slackWebhook"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slack Webhook URL'i</FormLabel>
                            <FormControl>
                              <Input placeholder="https://hooks.slack.com/services/..." {...field} />
                            </FormControl>
                            <FormDescription>
                              Slack gelen webhook entegrasyonu için URL
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Button type="submit">Bildirim Ayarlarını Kaydet</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </main>
  );
};

export default Settings;