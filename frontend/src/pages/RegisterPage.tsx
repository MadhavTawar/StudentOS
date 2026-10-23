import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Button } from '../components/common/Button';
import { api } from '../lib/api';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, fullName);
      const inviteToken = searchParams.get('invite');
      if (inviteToken) {
        await api.acceptWorkspaceInvitation(inviteToken);
        navigate('/app/workspaces');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="card login-card animate-fade-in register-card">
        {/* Brand Header */}
        <div className="login-brand register-brand">
          <div className="login-logo">
            <GraduationCap size={28} />
          </div>
          <h1 className="login-title register-title">
            Create your <span className="login-accent">StudentOS</span> account
          </h1>
          <p className="login-subtitle register-subtitle">
            Start with a private workspace. Invite a team whenever you need one.
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="label" htmlFor="fullName">
              Full Name
            </label>
            <div className="login-input-wrapper">
              <input
                id="fullName"
                type="text"
                required
                className="input login-input"
                placeholder="Alex Student"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <User size={16} className="login-input-icon" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <div className="login-input-wrapper">
              <input
                id="email"
                type="email"
                required
                className="input login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={16} className="login-input-icon" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password (min. 8 characters)
            </label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type="password"
                required
                minLength={8}
                className="input login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={16} className="login-input-icon" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="login-submit-btn"
          >
            Create Free Account <ArrowRight size={16} />
          </Button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            Already registered?{' '}
            <Link to="/login" className="login-footer-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
