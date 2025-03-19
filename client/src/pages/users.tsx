import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Pencil, Trash2, UserPlus } from "lucide-react";

// Kullanıcı türleri
interface User {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "admin" | "operator" | "viewer";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences | null;
}

interface UserPreferences {
  theme: string;
  language: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  dashboardLayout: string[];
}

// Form doğrulama şemaları
const createUserSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
    .regex(/[a-z]/, "En az bir küçük harf içermelidir")
    .regex(/[0-9]/, "En az bir rakam içermelidir"),
  fullName: z.string().min(3, "Ad soyad en az 3 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  role: z.enum(["admin", "operator", "viewer"]),
  isActive: z.boolean().default(true),
});

const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
    .regex(/[a-z]/, "En az bir küçük harf içermelidir")
    .regex(/[0-9]/, "En az bir rakam içermelidir")
    .optional().or(z.literal(''))
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type UpdateUserValues = z.infer<typeof updateUserSchema>;

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Kullanıcıları getir
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Kullanıcı oluşturma formu
  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "viewer",
      isActive: true,
    },
  });

  // Kullanıcı düzenleme formu
  const editForm = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "viewer",
      isActive: true,
    },
  });

  // Kullanıcı oluşturma mutasyonu
  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserValues) => {
      return apiRequest('/api/users', {
        method: 'POST',
        body: values,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Kullanıcı Oluşturuldu",
        description: "Yeni kullanıcı başarıyla oluşturuldu.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kullanıcı oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Kullanıcı güncelleme mutasyonu
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: UpdateUserValues }) => {
      return apiRequest(`/api/users/${id}`, {
        method: 'PUT',
        body: values,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Kullanıcı Güncellendi",
        description: "Kullanıcı bilgileri başarıyla güncellendi.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kullanıcı güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Kullanıcı durumu güncelleme mutasyonu
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      return apiRequest(`/api/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Durum Güncellendi",
        description: "Kullanıcı durumu başarıyla güncellendi.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kullanıcı durumu güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Kullanıcı silme mutasyonu
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/users/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Kullanıcı Silindi",
        description: "Kullanıcı başarıyla silindi.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kullanıcı silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  // Form işleyicileri
  const onCreateSubmit = (values: CreateUserValues) => {
    createUserMutation.mutate(values);
  };

  const onEditSubmit = (values: UpdateUserValues) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, values });
    }
  };

  const onDeleteConfirm = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      fullName: user.fullName || "",
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
      password: "", // Şifreyi sıfırla, yeni şifre girilmediyse değiştirilmeyecek
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleStatusChange = (user: User, isActive: boolean) => {
    updateUserStatusMutation.mutate({ id: user.id, isActive });
  };

  // Rol badge'ı için renk belirle
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "operator":
        return "default";
      case "viewer":
      default:
        return "secondary";
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Kullanıcı Yönetimi</h2>
          <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus size={16} />
              <span>Yeni Kullanıcı</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
              <DialogDescription>
                Sisteme erişim sağlayacak yeni bir kullanıcı hesabı oluşturun.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kullanıcı Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="kullanici_adi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>
                        En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam içermelidir.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Soyad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ahmet Yılmaz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="ahmet@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kullanıcı Rolü</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bir rol seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Yönetici</SelectItem>
                          <SelectItem value="operator">Operatör</SelectItem>
                          <SelectItem value="viewer">İzleyici</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Kullanıcı rolleri erişim seviyelerini belirler.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Aktif Hesap</FormLabel>
                        <FormDescription>
                          Bu kullanıcı hesabının aktif olup olmadığını belirler.
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
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">İptal</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Kullanıcı Oluştur
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcılar</CardTitle>
          <CardDescription>
            Sistem kullanıcılarını ve erişim rollerini görüntüleyin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>Henüz hiç kullanıcı bulunmuyor.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Kullanıcı Ekle
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı Adı</TableHead>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Son Giriş</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role === "admin" ? "Yönetici" :
                            user.role === "operator" ? "Operatör" : "İzleyici"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(isActive) => handleStatusChange(user, isActive)}
                            disabled={updateUserStatusMutation.isPending}
                          />
                          <span className="ml-2">
                            {user.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt 
                          ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR") 
                          : "Hiç giriş yapmadı"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kullanıcı Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini ve erişim seviyesini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Değiştirmek için yeni şifre girin" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Boş bırakırsanız şifre değişmeyecektir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad Soyad</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Rolü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Bir rol seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Yönetici</SelectItem>
                        <SelectItem value="operator">Operatör</SelectItem>
                        <SelectItem value="viewer">İzleyici</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Aktif Hesap</FormLabel>
                      <FormDescription>
                        Bu kullanıcı hesabının aktif olup olmadığını belirler.
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
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">İptal</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Değişiklikleri Kaydet
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Kullanıcı Silme Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem kullanıcıyı kalıcı olarak silecektir. Bu işlem geri alınamaz.
              {selectedUser && (
                <p className="mt-2 font-semibold">
                  "{selectedUser.username}" kullanıcısını silmek istediğinize emin misiniz?
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}