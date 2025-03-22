#!/usr/bin/env node

/**
 * Bu script, veritabanını sıfırlamak ve yeniden doldurmak için kullanılır.
 * server/seed.ts içindeki aynı seed fonksiyonunu çağırır.
 * 
 * Bu script, npm run db:seed komutu ile çalıştırılır.
 */

const { spawn } = require('child_process');

console.log('Veritabanı seed işlemi başlatılıyor...');

// Çalıştırma ortamını hazırla
const env = { ...process.env, SEED_FORCE: 'true' };

// server/seed.ts dosyasını çalıştır
const seedProcess = spawn('ts-node', ['server/seed.ts'], { 
  env, 
  stdio: 'inherit',
  shell: true 
});

seedProcess.on('close', (code) => {
  if (code === 0) {
    console.log('Veritabanı seed işlemi başarıyla tamamlandı.');
  } else {
    console.error(`Veritabanı seed işlemi başarısız oldu. Çıkış kodu: ${code}`);
    process.exit(code);
  }
});