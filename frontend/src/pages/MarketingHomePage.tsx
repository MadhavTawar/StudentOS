import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

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
  <main className="marketing-page">
    <header className="marketing-header">
      <Link to="/" className="marketing-logo">
        Student<span className="marketing-accent">OS</span>
      </Link>
      <nav className="marketing-nav">
        <Link to="/login" className="marketing-nav-link">Sign in</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Get started <ArrowRight size={15} /></Link>
      </nav>
    </header>

    <section className="marketing-hero">
      <div className="marketing-hero-text">
        <span className="marketing-eyebrow">
          <Sparkles size={15} /> Your personal study system
        </span>
        <h1 className="marketing-title">Make room for the work that matters.</h1>
        <p className="marketing-description">
          StudentOS brings coursework, deadlines, and study support into one calm, private workspace.
          Start on your own, then share a resource library with a team when you need to.
        </p>
        <div className="marketing-hero-actions">
          <Link to="/register" className="btn btn-primary">Create a free account <ArrowRight size={16} /></Link>
          <Link to="/login" className="btn btn-outline">I already have an account</Link>
        </div>
        <p className="marketing-footer-note">
          No institution email required. Your personal study data stays private to your account.
        </p>
      </div>

      <div className="card marketing-desk">
        <div className="marketing-desk-header">
          <div>
            <span className="marketing-desk-eyebrow">YOUR STUDY DESK</span>
            <h2 className="marketing-desk-title">A little more clarity</h2>
          </div>
          <div className="marketing-desk-icon">
            <LockKeyhole size={20} />
          </div>
        </div>
        {[
          ['Today', 'Finish biology reading', '40 min · In progress'],
          ['Tomorrow', 'Submit design reflection', 'Due at 5:00 PM'],
          ['This week', 'Review your study plan', '3 tasks on track'],
        ].map(([label, title, detail]) => (
          <div key={title} className="marketing-desk-item">
            <span className="marketing-desk-label">{label}</span>
            <div>
              <strong className="marketing-desk-task">{title}</strong>
              <div className="marketing-desk-detail">{detail}</div>
            </div>
          </div>
        ))}
        <div className="marketing-desk-note">
          <Users size={16} className="marketing-desk-note-icon" />
          Personal by default. Share a workspace library only when you choose.
        </div>
      </div>
    </section>

    <section className="marketing-features">
      <div className="marketing-features-grid">
        {features.map((feature) => (
          <article key={feature.title} className="card marketing-feature-card">
            <div className="marketing-feature-icon">{feature.icon}</div>
            <h2 className="marketing-feature-title">{feature.title}</h2>
            <p className="marketing-feature-description">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  </main>
  );
};
