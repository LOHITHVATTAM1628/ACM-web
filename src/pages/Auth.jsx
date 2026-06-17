import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' or 'admin'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchUserRoleAndRedirect = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const actualRole = data?.role || 'student';
      
      // ROUTING LOGIC BASED ON SELECTED ROLE AND ACTUAL ROLE
      
      // Case 1: Student trying to access Admin portal
      if (selectedRole === 'admin' && actualRole === 'student') {
        showMessage('🚫 Access Denied: You do not have admin privileges.', 'error');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      
      // Case 2: Admin selected Admin portal -> Go to Admin Dashboard
      if (selectedRole === 'admin' && actualRole === 'admin') {
        navigate('/admin');
        return;
      }
      
      // Case 3: Admin selected Student portal -> Go to Student Dashboard (Allow preview)
      if (selectedRole === 'student' && actualRole === 'admin') {
        navigate('/dashboard');
        return;
      }
      
      // Case 4: Student selected Student portal -> Go to Student Dashboard
      if (selectedRole === 'student' && actualRole === 'student') {
        navigate('/dashboard');
        return;
      }
      
      // Fallback (should not reach here)
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error fetching user role:', error);
      showMessage('Error verifying user role. Please try again.', 'error');
      setLoading(false);
    }
  };

  const handleAuthentication = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        
        // Fetch role and apply security check for login
        if (data?.user) {
          await fetchUserRoleAndRedirect(data.user.id);
        }
        
      } else {
        // --- SIGNUP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        
        // New users are ALWAYS students (admin signup is not allowed via UI)
        // No need to fetch from profiles table - avoid race condition with trigger
        // Simply navigate to student dashboard directly
        if (data?.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            // User already exists
            showMessage('❌ This email is already registered. Please login instead.', 'error');
            setLoading(false);
          } else {
            // Successful signup - navigate directly to student dashboard
            navigate('/dashboard');
          }
        } else {
          showMessage('✅ Signup Successful! Please check your email for verification.', 'success');
          setLoading(false);
        }
      }
    } catch (error) {
      showMessage('❌ Error: ' + error.message, 'error');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '450px', 
      margin: '50px auto', 
      padding: '30px', 
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#fff' }}>
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>
      <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '25px' }}>
        {isLogin ? 'Sign in to continue your learning journey' : 'Start your SQL mastery journey today'}
      </p>

      {/* Role Selection Tabs */}
      {isLogin && (
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '25px',
          padding: '5px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px'
        }}>
          <button
            type="button"
            onClick={() => setSelectedRole('student')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: selectedRole === 'student' ? '#3b82f6' : 'transparent',
              color: selectedRole === 'student' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
            }}
          >
            👨‍🎓 Student Login
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setIsLogin(true); // Force login mode for admin
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: selectedRole === 'admin' ? '#8b5cf6' : 'transparent',
              color: selectedRole === 'admin' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
            }}
          >
            👨‍💼 Admin Login
          </button>
        </div>
      )}
      
      <form onSubmit={handleAuthentication} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Your Email" 
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            padding: '12px 15px', 
            borderRadius: '8px', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border 0.3s ease'
          }}
          onFocus={(e) => e.target.style.border = '1px solid #3b82f6'}
          onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          style={{ 
            padding: '12px 15px', 
            borderRadius: '8px', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            transition: 'border 0.3s ease'
          }}
          onFocus={(e) => e.target.style.border = '1px solid #3b82f6'}
          onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '12px', 
            backgroundColor: loading ? '#666' : '#3b82f6',
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 4px 15px 0 rgba(59, 130, 246, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.target.style.backgroundColor = '#3b82f6';
          }}
        >
          {loading ? 'Processing...' : (isLogin ? `Login as ${selectedRole === 'admin' ? 'Admin' : 'Student'}` : 'Create Account')}
        </button>
      </form>

      {/* Message Display */}
      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '12px 15px',
          borderRadius: '8px',
          background: messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${messageType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          color: messageType === 'error' ? '#f87171' : '#34d399',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {/* Toggle Between Login/Signup - Hidden for Admin role */}
      {selectedRole !== 'admin' && (
        <p style={{ marginTop: '25px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
              setSelectedRole('student');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#8b5cf6', 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {isLogin ? 'Sign Up here' : 'Login here'}
          </button>
        </p>
      )}

      {/* Admin-only message */}
      {selectedRole === 'admin' && (
        <p style={{ 
          marginTop: '25px', 
          textAlign: 'center', 
          color: 'rgba(139, 92, 246, 0.8)', 
          fontSize: '13px',
          fontStyle: 'italic'
        }}>
          🔒 Admin accounts cannot be created. Contact system administrator.
        </p>
      )}
    </div>
  );
}