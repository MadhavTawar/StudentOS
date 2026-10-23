import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { Button } from '../components/common/Button';
import { api } from '../lib/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      const inviteToken = searchParams.get('invite');
      if (inviteToken) {
        await api.acceptWorkspaceInvitation(inviteToken);
        navigate('/app/workspaces');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="card login-card animate-fade-in">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo">
            <GraduationCap size={28} />
          </div>
          <h1 className="login-title">
            Welcome back to Student<span className="login-accent">OS</span>
          </h1>
          <p className="login-subtitle">Sign in to your personal workspace</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
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
              Password
            </label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type="password"
                required
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
            Sign In <ArrowRight size={16} />
          </Button>
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="login-footer-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
