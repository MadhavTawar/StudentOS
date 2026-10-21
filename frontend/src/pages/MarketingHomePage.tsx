import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: <CheckCircle2 size={19} />,
    title: 'Your work, in one place',
    description: 'Plan coursework, track dates, and keep your next steps visible.',
  },
  {
    icon: <Sparkles size={19} />,
    title: 'AI that assists, not decides',
    description: 'Turn messages into reviewable ideas and keep control of every change.',
  },
  {
    icon: <BookOpen size={19} />,
    title: 'A library you can trust',
    description: 'Keep personal references private or publish resources to a shared workspace.',
  },
];

export const MarketingHomePage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && isAuthenticated) return <Navigate to="/app" replace />;

  return (
  <main style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
    <header style={{
      maxWidth: 1120,
      margin: '0 auto',
      padding: '1.5rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 800 }}>
        Student<span style={{ color: 'var(--accent-primary)' }}>OS</span>
      </Link>
      <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', padding: '0.65rem' }}>Sign in</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Get started <ArrowRight size={15} /></Link>
      </nav>
    </header>

    <section style={{
      maxWidth: 1120,
      margin: '0 auto',
      padding: 'clamp(3rem, 9vw, 7rem) 1.25rem 5rem',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))',
      alignItems: 'center',
      gap: '3rem',
    }}>
      <div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--accent-primary)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          <Sparkles size={15} /> Your personal study system
        </span>
        <h1 style={{
          fontSize: 'clamp(2.7rem, 6vw, 5rem)',
          lineHeight: 1.02,
          letterSpacing: '-0.055em',
          margin: '1rem 0',
          maxWidth: 680,
        }}>
          Make room for the work that matters.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 590 }}>
          StudentOS brings coursework, deadlines, and study support into one calm, private workspace.
          Start on your own, then share a resource library with a team when you need to.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
          <Link to="/register" className="btn btn-primary">Create a free account <ArrowRight size={16} /></Link>
          <Link to="/login" className="btn btn-outline">I already have an account</Link>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '1rem' }}>
          No institution email required. Your personal study data stays private to your account.
        </p>
      </div>

      <div className="card" style={{
        padding: '1.5rem',
        background: 'linear-gradient(145deg, var(--bg-card), rgba(211, 131, 91, 0.08))',
        borderColor: 'var(--border-card)',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', letterSpacing: '0.12em' }}>YOUR STUDY DESK</span>
            <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.35rem' }}>A little more clarity</h2>
          </div>
          <div style={{ color: 'var(--accent-primary)', background: 'rgba(211, 131, 91, 0.12)', borderRadius: 14, padding: 11 }}>
            <LockKeyhole size={20} />
          </div>
        </div>
        {[
          ['Today', 'Finish biology reading', '40 min · In progress'],
          ['Tomorrow', 'Submit design reflection', 'Due at 5:00 PM'],
          ['This week', 'Review your study plan', '3 tasks on track'],
        ].map(([label, title, detail]) => (
          <div key={title} style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr',
            gap: '0.9rem',
            padding: '1rem 0',
            borderTop: '1px solid var(--border-card)',
          }}>
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
            <div>
              <strong style={{ fontSize: '0.92rem' }}>{title}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>{detail}</div>
            </div>
          </div>
        ))}
        <div style={{
          display: 'flex',
          gap: '0.55rem',
          alignItems: 'center',
          marginTop: '0.75rem',
          padding: '0.85rem',
          borderRadius: 12,
          background: 'rgba(16, 185, 129, 0.08)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}>
          <Users size={16} color="#34d399" />
          Personal by default. Share a workspace library only when you choose.
        </div>
      </div>
    </section>

    <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 1.25rem 5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
        {features.map((feature) => (
          <article key={feature.title} className="card" style={{ padding: '1.3rem' }}>
            <div style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>{feature.icon}</div>
            <h2 style={{ fontSize: '1rem', margin: '0 0 0.45rem' }}>{feature.title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', lineHeight: 1.6, margin: 0 }}>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  </main>
  );
};
