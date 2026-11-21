import { Outlet } from 'react-router-dom';

/** Ram runt kitets flöden (boka, beställ, catering, juridik) på Anars bakgrund. */
export default function KitPage() {
  return (
    <main className="kit-page">
      <div className="kit-panel">
        <Outlet />
      </div>
    </main>
  );
}
