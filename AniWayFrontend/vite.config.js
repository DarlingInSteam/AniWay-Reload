import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": new URL('./src', import.meta.url).pathname,
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0',
        hmr: false,
        proxy: {
            '/api': {
                target: 'http://gateway-service:8080',
                changeOrigin: true,
                secure: false,
                ws: true,
                timeout: 60000,
                proxyTimeout: 60000,
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, _res) {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', function (proxyReq, req, _res) {
                        console.log('Sending Request to the Target:', req.method, req.url);
                    });
                    proxy.on('proxyRes', function (proxyRes, req, _res) {
                        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
                    });
                },
            },
            '/ws': {
                target: 'ws://manga-service:8081',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
