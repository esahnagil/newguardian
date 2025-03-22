#!/bin/bash

# Bu script doğrudan veritabanı seed işlemini çalıştırır
# Kullanım: ./db-seed.sh

echo "Veritabanı seed işlemi başlatılıyor..."

# Ortam değişkenini ayarla ve seed işlemini başlat
SEED_FORCE=true node scripts/utils/db-seed.js