# Network Monitoring Tool - Proje Bağımlılıkları ve Kurulum

Bu belge, Network Monitoring Tool projesinin bağımlılıklarını ve kurulum adımlarını içerir. Projeyi yeni bir ortama kurmanız gerektiğinde, bu adımları takip etmelisiniz.

## Gerekli Bağımlılıklar

### Node.js Paketi Bağımlılıkları
```
@hookform/resolvers
@jridgewell/trace-mapping
@neondatabase/serverless
@nestjs/common
@nestjs/config
@nestjs/core
@nestjs/platform-express
@nestjs/platform-socket.io
@nestjs/websockets
@radix-ui/react-* (UI bileşenleri)
@replit/* (Replit plugins)
@tailwindcss/typography
@tanstack/react-query
axios
class-variance-authority
clsx
cmdk
connect-pg-simple
date-fns
drizzle-kit
drizzle-orm
drizzle-zod
embla-carousel-react
esbuild
express
express-session
framer-motion
memorystore
passport
passport-local
postgres
react
react-dom
react-hook-form
react-icons
recharts
socket.io
tailwindcss
tailwindcss-animate
typescript
vite
wouter
ws
zod
zod-validation-error
```

### Çevre Değişkenleri
Aşağıdaki çevre değişkenleri yapılandırılmalıdır:

- `DATABASE_URL`: PostgreSQL bağlantı URL'i
- `PGUSER`: PostgreSQL kullanıcı adı
- `PGPASSWORD`: PostgreSQL şifresi
- `PGDATABASE`: PostgreSQL veritabanı adı
- `PGHOST`: PostgreSQL sunucu adresi
- `PGPORT`: PostgreSQL port numarası (varsayılan: 5432)

## Kurulum Adımları

### 1. Node.js ve NPM Kurulumu
Node.js'in en son LTS sürümü kurulu olmalıdır. [Node.js resmi web sitesi](https://nodejs.org/) üzerinden indirebilirsiniz.

### 2. Projeyi Klonlama
Projeyi GitHub'dan veya diğer bir kaynaktan klonlayın:

```bash
git clone <proje-url>
cd network-monitoring-tool
```

### 3. Bağımlılıkları Yükleme
Proje dizininde aşağıdaki komutu çalıştırın:

```bash
npm install
```

### 4. Veritabanı Kurulumu
PostgreSQL veritabanı kurulumu ve yapılandırması:

```bash
# Veritabanını oluşturun (PostgreSQL'in kurulu olduğu varsayılarak)
createdb network_monitoring

# Çevre değişkenlerini ayarlayın (örnek)
export DATABASE_URL="postgresql://user:password@localhost:5432/network_monitoring"
export PGUSER="user"
export PGPASSWORD="password"
export PGDATABASE="network_monitoring"
export PGHOST="localhost"
export PGPORT="5432"
```

### 5. Veritabanı Şeması Oluşturma
Drizzle ORM kullanarak veritabanı şemasını oluşturun:

```bash
npx drizzle-kit push
```

### 6. Uygulamayı Başlatma
Uygulamayı geliştirme modunda başlatın:

```bash
npm run dev
```

## Otomatik Kurulum

Tüm kurulum adımlarını otomatikleştirmek için, projenin kök dizininde bulunan `setup.sh` betiğini kullanabilirsiniz:

```bash
chmod +x setup.sh
./setup.sh
```

Bu betik:
- Sistem bağımlılıklarını kontrol eder
- Node.js ve NPM'in doğru sürümlerinin kurulu olduğunu doğrular
- Proje bağımlılıklarını yükler
- Veritabanı bağlantısını test eder
- Veritabanı şemasını oluşturur

## Geliştirme Notları

- Uygulama varsayılan olarak 5000 portunda çalışır
- Geliştirme sırasında, veritabanı bağlantısı yoksa in-memory depolama kullanılır
- Üretim ortamında, veritabanı bağlantısı gereklidir
- WebSocket sunucusu `/ws/monitoring` yolunda hizmet verir

## Performans İpuçları

- Monitör sonuçları için maksimum 100 kayıt tutulur (bellek optimizasyonu için)
- RAM kullanımını azaltmak için veritabanı depolama kullanılması önerilir
- Yüksek miktarda cihaz izleme durumunda, izleme aralıklarını artırın