import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página no encontrada">La dirección solicitada no existe.</PageHeader>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </>
  );
}
