# NewGuardian - Ağ İzleme Aracı

Bu proje, ağ cihazlarını izlemek ve uyarılar oluşturmak için kullanılan bir web uygulamasıdır.

## Özellikler

- Cihaz yönetimi (router, switch, server, access point vb.)
- ICMP, HTTP, TCP ve SNMP protokolleri ile izleme
- Gerçek zamanlı izleme ve bildirimler
- Dashboard ile genel sistem durumu takibi
- Alarm yönetimi

## Kurulum Adımları

### Ön Gereksinimler

- Node.js (v16 veya üzeri)
- PostgreSQL veritabanı

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/esahnagil/newguardian.git
cd newguardian
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Veritabanını Hazırlayın

PostgreSQL veritabanı oluşturun ve bağlantı bilgilerini .env dosyasına ekleyin:

```
DATABASE_URL=postgresql://username:password@localhost:5432/newguardian
```

Veritabanı tablolarını oluşturun:

```bash
cat migrations/init.sql | psql $DATABASE_URL
```

### 4. Test Verilerini Yükleyin

```bash
npx tsx scripts/seed.ts
```

### 5. Uygulamayı Başlatın

```bash
npm run dev
```

Uygulama http://localhost:5000 adresinde çalışacaktır.

## Hızlı Kurulum

Tüm kurulum adımlarını otomatikleştirmek için aşağıdaki komutu çalıştırabilirsiniz:

```bash
./scripts/setup.sh
```

## Kullanıcı Bilgileri

Varsayılan olarak aşağıdaki kullanıcı oluşturulur:

- Kullanıcı adı: admin
- Şifre: password

İlk girişten sonra şifrenizi değiştirmeniz önerilir.

## Teknolojiler

- Frontend: React, Tailwind CSS, shadcn/ui, React Query
- Backend: Express.js, Drizzle ORM
- Veritabanı: PostgreSQL
- WebSocket: Socket.io