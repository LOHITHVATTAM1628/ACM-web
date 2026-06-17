import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Database, BookOpen, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Navbar.css';

const Navbar = ({ session, userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <Database size={28} className="logo-icon" />
          <span className="text-gradient">SQLMastery</span>
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/topics" className={`nav-link ${isActive('/topics')}`}>
              <BookOpen size={18} /> Topics
            </Link>
          </li>
          {session && (
            <li>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
                <LayoutDashboard size={18} /> Dashboard
              </Link>
            </li>
          )}
          {session && userRole === 'admin' && (
            <li>
              <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                <Settings size={18} /> Admin
              </Link>
            </li>
          )}
        </ul>
        <div className="nav-actions">
          {session ? (
            <button onClick={handleSignOut} className="btn btn-primary">
              <LogOut size={18} /> Log Out
            </button>
          ) : (
            <Link to="/auth" className="btn btn-primary">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
