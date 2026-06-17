import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Topics from './pages/Topics';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TopicDetail from './pages/TopicDetail';
import Quiz from './pages/Quiz';
import Auth from './pages/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role || 'student');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('student'); // Default to student if error
    } finally {
      setLoading(false);
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading...
        </div>
      );
    }

    // Require authentication
    if (requireAuth && !session) {
      return <Navigate to="/auth" replace />;
    }

    // Require admin role - ONLY block students, allow admins
    if (requireAdmin && userRole === 'student') {
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  return (
    <Router>
      <Navbar session={session} userRole={userRole} />
      <div className="container" style={{ paddingTop: '100px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topic/:id" element={<TopicDetail />} />
          <Route path="/quiz/:id" element={<Quiz />} />
          
          {/* Protected Routes - Require Authentication */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requireAuth={true}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin-Only Route */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAuth={true} requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;