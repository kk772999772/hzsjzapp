const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'd:/jizhang';
const WORKER_DIR = path.join(ROOT_DIR, 'worker');

function getFormattedDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function runBackup() {
  const dateStr = getFormattedDate();
  const outputFile = path.join(ROOT_DIR, `backup_${dateStr}.sql`);
  
  console.log(`Starting backup of jizhang-db to ${outputFile}...`);
  
  try {
    // Run wrangler from the worker directory where wrangler.toml exists
    const cmd = `npx wrangler d1 export jizhang-db --remote -y --output="${outputFile}"`;
    execSync(cmd, { cwd: WORKER_DIR, stdio: 'inherit' });
    console.log(`Backup exported successfully to ${outputFile}`);
    
    cleanOldBackups();
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

function cleanOldBackups() {
  console.log('Checking for old backups to clean...');
  const files = fs.readdirSync(ROOT_DIR);
  const now = Date.now();
  const MAX_AGE_MS = 35 * 24 * 60 * 60 * 1000; // 35 days
  
  files.forEach(file => {
    if (file.startsWith('backup_') && file.endsWith('.sql')) {
      const filePath = path.join(ROOT_DIR, file);
      try {
        const datePart = file.slice(7, 15); // YYYYMMDD
        if (datePart.length === 8) {
          const year = parseInt(datePart.slice(0, 4));
          const month = parseInt(datePart.slice(4, 6)) - 1;
          const day = parseInt(datePart.slice(6, 8));
          
          const backupDate = new Date(year, month, day);
          const age = now - backupDate.getTime();
          
          if (age > MAX_AGE_MS) {
            console.log(`Deleting old backup: ${file} (Age: ${Math.round(age / (24*3600*1000))} days)`);
            fs.unlinkSync(filePath);
          }
        }
      } catch (err) {
        console.error(`Failed to process or delete file ${file}:`, err);
      }
    }
  });
}

runBackup();
