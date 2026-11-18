import type { Bucket } from './api';

/** Gráfico de barras horizontal accesible: tabla con los valores en texto y una barra decorativa. */
export function BarList({ title, data, labelFor, emptyText }: { title: string; data: Bucket[]; labelFor?: (key: string) => string; emptyText: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <figure className="card">
      <figcaption className="mb-3 text-lg font-bold">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-slate">{emptyText}</p>
      ) : (
        <table className="w-full text-left">
          <thead className="sr-only"><tr><th>Categoría</th><th>Cantidad</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="align-middle">
                <th scope="row" className="w-2/5 py-1.5 pr-3 text-sm font-semibold">{labelFor ? labelFor(d.key) : d.key}</th>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div aria-hidden="true" className="h-5 rounded bg-ink" style={{ width: `${Math.max(4, (d.count / max) * 100)}%` }} />
                    <span className="font-bold tabular-nums">{d.count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
