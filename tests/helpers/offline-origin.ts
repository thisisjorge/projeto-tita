import http from 'node:http';

/** Dedicated loopback origin: stopping it proves network loss without emulation.
 * Playwright WebKit 1.63 rejects SW navigation when setOffline is enabled (#42775).
 * This proxy serves the unchanged production build from the normal test server.
 */
export async function createOfflineOrigin(upstream: string) {
  const server = http.createServer((request, response) => {
    const forwarded = http.request(
      new URL(request.url ?? '/', upstream),
      { method: request.method },
      (source) => {
        response.writeHead(source.statusCode ?? 502, source.headers);
        source.pipe(response);
      },
    );
    forwarded.on('error', () => response.destroy());
    request.pipe(forwarded);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test origin');
  const url = `http://127.0.0.1:${address.port}`;
  const stop = async () => {
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  };
  return { url, stop };
}
