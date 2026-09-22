/**
 * Startup file pro cPanel "Setup Node.js App" (Passenger).
 * O Passenger carrega o arquivo com require(), e o server é ESM ("type":"module"),
 * então este wrapper CommonJS só importa o server de verdade.
 */
import('./server/index.js').catch(err => {
  console.error('[app.cjs] Falha ao iniciar o server:', err)
  process.exit(1)
})
