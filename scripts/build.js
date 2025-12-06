const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const distDir = path.resolve(__dirname, '../dist');

async function build() {
  await fs.promises.rm(distDir, { recursive: true, force: true });
  await fs.promises.mkdir(distDir, { recursive: true });
  await copyDir(srcDir, distDir);
  console.log('Static assets ready. Deploy the dist/ folder with nginx or any static host.');
}

async function copyDir(from, to) {
  const entries = await fs.promises.readdir(from, { withFileTypes: true });

  await fs.promises.mkdir(to, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
