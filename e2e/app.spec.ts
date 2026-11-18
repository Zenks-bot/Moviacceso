import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Estas pruebas se ejecutan contra una compilación SIN Supabase (ver .env.e2e).
 * Verifican la interfaz, el motor de rutas en el navegador, la accesibilidad automática
 * y que el sistema NO simule guardados cuando no hay base de datos (Prueba 12).
 * La persistencia real (Prueba 6) se verifica en supabase/tests y en la guía manual.
 */

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target.join(' ')}`);
}

test('Prueba 1: la plataforma muestra el sector piloto con su mapa y listas', async ({ page }) => {
  await page.goto('/mapa');
  await expect(page.getByRole('heading', { level: 1, name: 'Explorar mapa' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(26);
  await expect(page.getByText('Datos de demostración locales').first()).toBeVisible();
  await page.getByRole('button', { name: 'Paradero demo 2 (no oficial)' }).click();
  const detail = page.getByRole('region', { name: 'Información de accesibilidad' });
  await expect(detail.getByText('Barrera verificada')).toBeVisible();
  await expect(detail.getByText('Datos de demostración', { exact: false }).first()).toBeVisible();
});

test('Prueba 2 y 4: trayecto válido; la ruta adaptada evita la barrera', async ({ page }) => {
  await page.goto('/trayecto');
  await page.getByLabel('Origen').selectOption('p-plaza');
  await page.getByLabel('Destino').selectOption('p-salud');
  await page.getByLabel(/Trayecto general/).check();
  await page.getByRole('button', { name: 'Buscar trayecto' }).click();
  await expect(page.getByText('Incluye barreras', { exact: true })).toBeVisible();
  await expect(page.getByText(/Información referencial\. Las condiciones físicas pueden cambiar/)).toBeVisible();

  await page.getByLabel(/Adaptado a movilidad reducida/).check();
  await page.getByRole('button', { name: 'Buscar trayecto' }).click();
  await expect(page.getByText('Ruta demostrativa (no auditada)')).toBeVisible();
  await expect(page.getByRole('region', { name: /Descripción de los tramos/ }).getByText('Barrera verificada')).toHaveCount(0);
});

test('Prueba 3 y 5: sin trayecto verificado se muestra el mensaje exigido y no se dibuja ruta', async ({ page }) => {
  await page.goto('/trayecto?o=p-plaza&d=p-salud&p=estricto&demo=0');
  await expect(page.getByText('No encontramos un trayecto con accesibilidad verificada entre estos puntos. Esto no significa necesariamente que no exista, sino que faltan datos suficientes.')).toBeVisible();
  await expect(page.getByText('Detalle del trayecto')).toBeVisible();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);

  await page.goto('/trayecto?o=p-plaza&d=p-aislado&p=general&demo=1');
  await expect(page.getByText('Sin trayecto registrado')).toBeVisible();
});

test('origen y destino iguales muestran un error comprensible', async ({ page }) => {
  await page.goto('/trayecto');
  await page.getByLabel('Origen').selectOption('p-plaza');
  await page.getByLabel('Destino').selectOption('p-plaza');
  await page.getByRole('button', { name: 'Buscar trayecto' }).click();
  await expect(page.getByText('El origen y el destino son iguales. Elija un destino diferente.')).toBeVisible();
});

test('Prueba 7 y 12: el formulario valida y, sin base de datos, NO simula un guardado', async ({ page }) => {
  await page.goto('/reportar');
  await expect(page.getByText('Los reportes no se pueden guardar en este momento')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'Revise' });
  await expect(summary).toContainText('Seleccione la ubicación');
  await expect(summary).toContainText('Elija el tipo de problema');
  await expect(summary).toContainText('al menos 10 caracteres');
  await expect(summary).toContainText('condiciones de uso');

  await page.getByLabel(/Elegir un tramo de la lista/).selectOption('e-h-r2c2');
  await page.getByLabel('Tipo de problema').selectOption('rampa_obstruida');
  await page.getByLabel('Descripción').fill('Rampa bloqueada por un vehículo estacionado en la esquina.');
  await page.getByLabel('4 — Grave').check();
  await page.getByLabel(/Acepto las condiciones/).check();
  await page.waitForTimeout(3100); // control anti-bots: tiempo mínimo de llenado
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByText('El reporte NO se guardó')).toBeVisible();
  await expect(page.getByText(/no está configurado/).first()).toBeVisible();
  await expect(page.getByText('Reporte registrado correctamente')).toHaveCount(0);
});

test('Prueba 9 (interfaz): la administración no es accesible sin backend ni sesión', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByText('Administración no disponible')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprobar publicación' })).toHaveCount(0);
});

test('Prueba 10: las funciones esenciales se pueden usar con teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'La navegación por teclado se prueba en escritorio');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused();
  await page.goto('/trayecto');
  await page.getByLabel('Origen').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Destino')).toBeFocused();
  await page.getByLabel('Origen').selectOption('p-paradero-1');
  await page.getByLabel('Destino').selectOption('p-mercado');
  await page.getByRole('button', { name: 'Buscar trayecto' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Accesibilidad no confirmada')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Detalle del trayecto' })).toBeFocused();

  await page.goto('/mapa');
  const tab = page.getByRole('tab', { name: /Lugares/ });
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Tramos/ })).toBeFocused();
  await expect(page.getByRole('tab', { name: /Tramos/ })).toHaveAttribute('aria-selected', 'true');
});

test('Prueba 11: las pantallas principales no desbordan horizontalmente', async ({ page }) => {
  for (const url of ['/', '/mapa', '/trayecto?o=p-plaza&d=p-salud&p=movilidad_reducida&demo=1', '/reportar', '/estadisticas', '/acerca', '/admin']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `desbordamiento horizontal en ${url}`).toBeLessThanOrEqual(1);
  }
});

test('comprobación automática de accesibilidad (axe-core, WCAG 2.2 A/AA)', async ({ page }) => {
  for (const url of ['/', '/mapa', '/trayecto?o=p-plaza&d=p-salud&p=movilidad_reducida&demo=1', '/reportar', '/seguimiento', '/estadisticas', '/admin', '/acerca', '/privacidad']) {
    await page.goto(url);
    await page.waitForTimeout(600);
    expect(await axeViolations(page), `violaciones en ${url}`).toEqual([]);
  }
});
