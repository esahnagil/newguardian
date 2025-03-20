#!/usr/bin/env node

/**
 * Network Monitoring Tool - Otomatik Kurulum Betiği
 * 
 * Bu betik, Node.js kullanarak proje bağımlılıklarını 
 * ve veritabanı yapılandırmasını otomatikleştirir.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

// Terminal renkli çıktıları
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m', 
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Girdi/çıktı için readline arayüzü
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Soru sorma yardımcı fonksiyonu
function askQuestion(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Komut çalıştırma yardımcı fonksiyonu
function executeCommand(command, options = {}) {
  try {
    console.log(`${colors.blue}Çalıştırılıyor: ${command}${colors.reset}`);
    execSync(command, { stdio: options.silent ? 'ignore' : 'inherit' });
    return true;
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`${colors.red}Komut başarısız oldu: ${command}${colors.reset}`);
      console.error(error.message);
    }
    return false;
  }
}

// Ana kurulum sürecini çalıştır
async function main() {
  console.log(`
${colors.magenta}${colors.bright}================================================
      Network Monitoring Tool - Kurulum
================================================${colors.reset}
  `);

  // 1. Node.js ve NPM sürümlerini kontrol et
  console.log(`${colors.yellow}[1/6]${colors.reset} Node.js ve NPM sürümleri kontrol ediliyor...`);
  try {
    const nodeVersion = execSync('node -v').toString().trim();
    const npmVersion = execSync('npm -v').toString().trim();
    console.log(`${colors.green}✓ Node.js: ${nodeVersion}${colors.reset}`);
    console.log(`${colors.green}✓ NPM: ${npmVersion}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Node.js veya NPM kurulu değil!${colors.reset}`);
    console.error(`Lütfen Node.js'i kurun: https://nodejs.org/`);
    process.exit(1);
  }

  // 2. Bağımlılıkları yükle
  console.log(`\n${colors.yellow}[2/6]${colors.reset} Proje bağımlılıkları yükleniyor...`);
  if (!executeCommand('npm install')) {
    const retry = await askQuestion(`${colors.yellow}Bağımlılık yüklemesi başarısız oldu. Tekrar denemek ister misiniz? (e/h)${colors.reset} `);
    if (retry.toLowerCase() === 'e') {
      if (!executeCommand('npm install --force')) {
        console.error(`${colors.red}✗ Bağımlılıklar yüklenemedi!${colors.reset}`);
        process.exit(1);
      }
    } else {
      console.error(`${colors.red}✗ Bağımlılıklar yüklenemedi!${colors.reset}`);
      process.exit(1);
    }
  }
  console.log(`${colors.green}✓ Bağımlılıklar başarıyla yüklendi.${colors.reset}`);

  // 3. Veritabanı yapılandırması
  console.log(`\n${colors.yellow}[3/6]${colors.reset} Veritabanı yapılandırması...`);
  
  // Çevre değişkenlerini kontrol et
  let useDatabase = true;
  if (!process.env.DATABASE_URL) {
    const useDbAnswer = await askQuestion(`${colors.yellow}Veritabanı bağlantısı bulunamadı. PostgreSQL veritabanı yapılandırmak ister misiniz? (e/h)${colors.reset} `);
    useDatabase = useDbAnswer.toLowerCase() === 'e';
    
    if (useDatabase) {
      console.log(`\n${colors.magenta}PostgreSQL veritabanı yapılandırması:${colors.reset}`);
      const dbHost = await askQuestion('Veritabanı sunucusu (örn: localhost): ');
      const dbPort = await askQuestion('Veritabanı portu (örn: 5432): ');
      const dbName = await askQuestion('Veritabanı adı: ');
      const dbUser = await askQuestion('Veritabanı kullanıcısı: ');
      const dbPassword = await askQuestion('Veritabanı şifresi: ');
      
      // .env dosyasına yapılandırmayı kaydet
      const envContent = `DATABASE_URL=postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}
PGHOST=${dbHost}
PGPORT=${dbPort}
PGDATABASE=${dbName}
PGUSER=${dbUser}
PGPASSWORD=${dbPassword}
`;
      
      fs.writeFileSync('.env', envContent);
      console.log(`${colors.green}✓ .env dosyası oluşturuldu.${colors.reset}`);
      
      // Çevre değişkenlerini mevcut işlem için ayarla
      process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
      process.env.PGHOST = dbHost;
      process.env.PGPORT = dbPort;
      process.env.PGDATABASE = dbName;
      process.env.PGUSER = dbUser;
      process.env.PGPASSWORD = dbPassword;
    } else {
      console.log(`${colors.yellow}! Veritabanı yapılandırılmadı. In-memory depolama kullanılacak (geliştirme modu).${colors.reset}`);
    }
  } else {
    console.log(`${colors.green}✓ Veritabanı bağlantısı algılandı.${colors.reset}`);
  }

  // 4. Veritabanı bağlantısını test et
  if (useDatabase && process.env.DATABASE_URL) {
    console.log(`\n${colors.yellow}[4/6]${colors.reset} Veritabanı bağlantısı test ediliyor...`);
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      await client.connect();
      console.log(`${colors.green}✓ Veritabanı bağlantısı başarılı.${colors.reset}`);
      await client.end();
    } catch (err) {
      console.error(`${colors.red}✗ Veritabanı bağlantısı başarısız: ${err.message}${colors.reset}`);
      
      const skipDb = await askQuestion(`${colors.yellow}Veritabanı bağlantısı olmadan devam etmek ister misiniz? (e/h)${colors.reset} `);
      if (skipDb.toLowerCase() !== 'e') {
        process.exit(1);
      } else {
        useDatabase = false;
      }
    }
  } else {
    console.log(`\n${colors.yellow}[4/6]${colors.reset} Veritabanı bağlantısı adımı atlandı.`);
  }

  // 5. Veritabanı şemasını oluştur
  if (useDatabase && process.env.DATABASE_URL) {
    console.log(`\n${colors.yellow}[5/6]${colors.reset} Veritabanı şeması oluşturuluyor...`);
    
    if (executeCommand('npx drizzle-kit push', { ignoreError: true })) {
      console.log(`${colors.green}✓ Veritabanı şeması başarıyla oluşturuldu.${colors.reset}`);
    } else {
      console.error(`${colors.red}! Veritabanı şeması oluşturulamadı.${colors.reset}`);
      const continueAnyway = await askQuestion(`${colors.yellow}Devam etmek ister misiniz? (e/h)${colors.reset} `);
      if (continueAnyway.toLowerCase() !== 'e') {
        process.exit(1);
      }
    }
  } else {
    console.log(`\n${colors.yellow}[5/6]${colors.reset} Veritabanı şeması adımı atlandı.`);
  }

  // 6. Kurulumu tamamla
  console.log(`\n${colors.yellow}[6/6]${colors.reset} Kurulum tamamlanıyor...`);
  
  // package.json'daki dev script'ini kontrol et
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.scripts || !packageJson.scripts.dev) {
      console.log(`${colors.yellow}! package.json'da 'dev' script'i bulunamadı.${colors.reset}`);
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.dev = 'tsx server/index.ts';
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      console.log(`${colors.green}✓ 'dev' script'i package.json'a eklendi.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}! package.json okunamadı veya güncellenemedi.${colors.reset}`);
  }

  console.log(`\n${colors.green}${colors.bright}================================================
      Kurulum Başarıyla Tamamlandı!
================================================${colors.reset}
  `);
  
  console.log(`Uygulamayı başlatmak için: ${colors.blue}npm run dev${colors.reset}`);
  
  if (!useDatabase) {
    console.log(`\n${colors.yellow}NOT: Şu anda in-memory depolama kullanılıyor (geliştirme modu).${colors.reset}`);
    console.log(`${colors.yellow}Üretim ortamı için bir PostgreSQL veritabanı yapılandırmanız önerilir.${colors.reset}`);
  }
  
  rl.close();
}

// Hataları yakala
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Beklenmeyen Hata: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});

// Ana işlevi çalıştır
main().catch(error => {
  console.error(`${colors.red}Hata: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});