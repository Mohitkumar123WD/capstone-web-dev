import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main style={{ padding: '36px 24px', textAlign: 'center' }}>
      <h1>Public Transport Tracker</h1>
      <p style={{ maxWidth: 560, margin: '16px auto', color: 'var(--text)' }}>
        Track public vehicles in real time, visualize routes on a live map,
        and optimize the best itinerary between two stops.
      </p>
      <Link
        to="/map"
        style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '14px 24px',
          borderRadius: 9999,
          background: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Open Tracker & Optimizer
      </Link>
    </main>
  );
}
