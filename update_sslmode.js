const fs = require('fs');
const files = ['.env', 'apps/web/.env', 'apps/web/.env.local', 'packages/database/.env'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/).map(line => {
      if (line.startsWith('DATABASE_URL=') && !line.includes('sslmode=')) {
        if (line.endsWith('"')) {
          return line.slice(0, -1) + '&sslmode=require"';
        } else if (line.endsWith("'")) {
          return line.slice(0, -1) + "&sslmode=require'";
        } else {
          return line + '&sslmode=require';
        }
      }
      return line;
    });
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Updated', file);
  }
});
