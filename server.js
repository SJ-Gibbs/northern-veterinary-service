const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = './Northern Veterinary Service';

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    let filePath;
    
    // Serve index.html at root
    if (req.url === '/' || req.url === '') {
        filePath = path.join(BASE_DIR, 'index.html');
    } else {
        // SECURITY: Properly join and normalize path to prevent directory traversal
        filePath = path.normalize(path.join(BASE_DIR, req.url));
    }

    // SECURITY: Resolve absolute paths and verify the file is within BASE_DIR
    const resolvedBase = path.resolve(BASE_DIR);
    const resolvedPath = path.resolve(filePath);
    
    // Check if the resolved path starts with the base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
        console.warn(`⚠️  Path traversal attempt blocked: ${req.url}`);
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - Forbidden</h1><p>Access denied.</p>', 'utf-8');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1><p>Could not find: ' + req.url + '</p>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`  Northern Veterinary Service Website`);
    console.log(`========================================`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}/`);
    
    // If running on Replit, show the public URL
    if (process.env.REPLIT_DEV_DOMAIN) {
        console.log(`\n🌐 PUBLIC URL (Replit):`);
        console.log(`   https://${process.env.REPLIT_DEV_DOMAIN}`);
        console.log(`\n   👆 Use this URL to access your website!`);
    }
    
    console.log(`\nPress Ctrl+C to stop the server\n`);
});

