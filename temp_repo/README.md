# Network Monitoring Tool

Ağ izleme ve cihaz durumu takip sistemi. Bu araç ile ağınızdaki cihazları izleyebilir, durum değişikliklerini takip edebilir ve sorunlara hızlıca müdahale edebilirsiniz.

## Özellikler

- **Gerçek zamanlı izleme**: Cihazların durumunu WebSocket bağlantısı üzerinden gerçek zamanlı olarak takip edin
- **ICMP, HTTP, TCP, SNMP izleme**: Farklı protokoller ile cihazları izleme
- **Alarm sistemi**: Durum değişikliklerinde otomatik alarm oluşturma ve yönetimi
- **Veritabanı desteği**: PostgreSQL veritabanı veya in-memory depolama seçenekleri
- **Responsive tasarım**: Mobil cihazlarda da kullanılabilir arayüz

## Kurulum

### Kolay Kurulum

Otomatik kurulum için:

```bash
npm install
node install.js
```

Bu komut, gerekli tüm bağımlılıkları yükleyecek ve veritabanı yapılandırması için size rehberlik edecektir.

### Manuel Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Veritabanı bağlantısını yapılandırın (isteğe bağlı):
   ```bash
   # .env dosyası oluşturun
   echo "DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/veritabani" > .env
   
   # Veritabanı şemasını oluşturun
   npx drizzle-kit push
   ```

3. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

## Kullanım

- Tarayıcınızda `http://localhost:5000` adresine gidin
- Dashboard sayfasında ağınızın genel durumunu görüntüleyin
- Cihazlar sayfasında yeni cihazlar ekleyin
- Her cihaz için özel izleme yapılandırması oluşturun

## Bağımlılıklar ve Detaylı Bilgi

Projenin bağımlılıkları ve teknik detayları hakkında daha fazla bilgi için `PROJECT_DEPENDENCIES.md` dosyasına bakın.

## Katkıda Bulunma

1. Bu depoyu fork edin
2. Özellik dalı oluşturun (`git checkout -b yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: xyz eklendi'`)
4. Dalınıza push yapın (`git push origin yeni-ozellik`)
5. Pull request oluşturun

## Lisans

MIT Lisansı altında yayınlanmıştır.