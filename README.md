# NewGuardian - Sistem İzleme Aracı

Web tabanlı, açık kaynaklı sistem ve ağ izleme uygulaması.

## Özellikler

- Web arayüzü ile kolay kullanım
- Gerçek zamanlı monitörleme (WebSockets)
- ICMP, SNMP, HTTP ve TCP protokolleri desteği
- Alarm ve bildirim sistemi
- Roller bazlı erişim kontrolü
- Mobil uyumlu tasarım

## Kurulum

### Gereksinimler

- Node.js 16+
- PostgreSQL veritabanı

### Adımlar

1. Depoyu klonlayın:
```bash
git clone https://github.com/yourusername/newguardian.git
cd newguardian
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. PostgreSQL veritabanı oluşturun.

4. `.env` dosyasını oluşturun:
```
DATABASE_URL=postgresql://username:password@localhost:5432/newguardian
```

5. Veritabanını oluşturun ve test verileriyle doldurun:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

6. Uygulamayı başlatın:
```bash
npm run dev
```

7. Web tarayıcısından `http://localhost:5000` adresine gidin.

## Replit'te Kullanım

Replit'te otomatik olarak kurulum yapmak için:

1. Uygulamayı başlatın.
2. Uygulama otomatik olarak veritabanı tablolarını oluşturacaktır.

Eğer veritabanını sıfırlamak ve test verileriyle yeniden doldurmak isterseniz:

```bash
./scripts/setup.sh
```

komutunu çalıştırabilirsiniz.

## Giriş Bilgileri

- Kullanıcı Adı: `admin`
- Şifre: `admin123`

## Katkıda Bulunma

Katkılarınızı, önerilerinizi ve hata raporlarınızı GitHub üzerinden iletebilirsiniz.

## Lisans

MIT