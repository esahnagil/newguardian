#!/bin/bash
set -e

echo "NewGuardian Kurulum Scripti"
echo "--------------------------"

echo "PostgreSQL veritabanı kontrol ediliyor..."
if [[ -z $DATABASE_URL ]]; then
  echo "HATA: DATABASE_URL çevre değişkeni bulunamadı."
  exit 1
fi

# Veritabanı tablolarını sıfırla
echo "Veritabanı tablolarını sıfırlama..."
echo "CREATE OR REPLACE FUNCTION truncate_tables() RETURNS void AS \$\$
DECLARE
    truncate_statement TEXT;
BEGIN
    SELECT 'TRUNCATE ' || string_agg(quote_ident(tablename), ', ') || ' CASCADE;'
    INTO truncate_statement
    FROM pg_tables
    WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%' 
      AND tablename NOT LIKE 'drizzle_%';

    IF truncate_statement IS NOT NULL THEN
        EXECUTE truncate_statement;
    END IF;
END;
\$\$ LANGUAGE plpgsql;

SELECT truncate_tables();" | psql $DATABASE_URL

# İlk kurulum için init.sql varsa çalıştır
if [ -f "migrations/init.sql" ]; then
  echo "Veritabanı şemasını oluşturma..."
  cat migrations/init.sql | psql $DATABASE_URL
fi

# Test verileri ekleme
echo "Test verileri ekleniyor..."
npx tsx scripts/seed.ts

echo "--------------------------"
echo "Kurulum tamamlandı!"
echo "Uygulamayı başlatmak için: npm run dev"