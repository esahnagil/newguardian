#!/bin/bash

# Hata durumunda scripti durdur
set -e

echo "NewGuardian Kurulum Scripti"
echo "-------------------------"

# Bağımlılıkları yükle
echo "🔧 Bağımlılıkları yükleniyor..."
npm install

# Veritabanı tablolarını oluştur
echo "🔧 Veritabanı tabloları oluşturuluyor..."
cat migrations/init.sql | psql $DATABASE_URL

# Seed verilerini ekle
echo "🔧 Test verileri yükleniyor..."
npx tsx scripts/seed.ts

echo "✅ Kurulum tamamlandı!"
echo "🚀 Uygulamayı başlatmak için: npm run dev"