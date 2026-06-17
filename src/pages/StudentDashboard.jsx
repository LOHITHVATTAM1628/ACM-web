import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Award, Clock, TrendingUp, CheckCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    topicsCompleted: 0,
    totalTopics: 0,
    totalXP: 0,
    avgQuizScore: 0,
    learningTime: '0 hrs'
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [inProgressTopic, setInProgressTopic] = useState(null);
  const [recommendedTopics, setRecommendedTopics] = useState([]);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      setCurrentUser(user);
      
      // Fetch all data in parallel
      await Promise.all([
        fetchStats(user.id),
        fetchRecentActivities(user.id),
        fetchInProgressTopic(user.id),
        fetchRecommendedTopics(user.id)
      ]);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userId) => {
    try {
      // Get total topics count
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('id');
      
      if (topicsError) throw topicsError;
      const totalTopics = topicsData?.length || 0;

      // Get user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (progressError) throw progressError;

      // Calculate stats
      const completedTopics = progressData?.filter(p => p.status === 'completed').length || 0;
      const totalXP = progressData?.reduce((sum, p) => sum + (p.xp_earned || 0), 0) || 0;
      
      // Calculate average quiz score
      const quizzesWithScores = progressData?.filter(p => p.quiz_total > 0) || [];
      const avgQuizScore = quizzesWithScores.length > 0
        ? Math.round(quizzesWithScores.reduce((sum, p) => sum + (p.quiz_score / p.quiz_total * 100), 0) / quizzesWithScores.length)
        : 0;

      // Calculate learning time (estimate: 5 minutes per activity)
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select('id')
        .eq('user_id', userId);
      
      if (activityError) throw activityError;
      const totalMinutes = (activityData?.length || 0) * 5;
      const learningTime = totalMinutes >= 60 
        ? `${(totalMinutes / 60).toFixed(1)} hrs` 
        : `${totalMinutes} mins`;

      setStats({
        topicsCompleted: completedTopics,
        totalTopics,
        totalXP,
        avgQuizScore,
        learningTime
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivities = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchInProgressTopic = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('topic_id, topics(id, title, duration)')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setInProgressTopic(data);
    } catch (error) {
      console.error('Error fetching in-progress topic:', error);
    }
  };

  const fetchRecommendedTopics = async (userId) => {
    try {
      // Get user's completed topics
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('topic_id')
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      if (progressError) throw progressError;
      
      const completedIds = progressData?.map(p => p.topic_id) || [];

      // Get topics not yet completed
      let query = supabase
        .from('topics')
        .select('*')
        .order('order_index', { ascending: true })
        .limit(2);
      
      if (completedIds.length > 0) {
        query = query.not('id', 'in', `(${completedIds.join(',')})`);
      }

      const { data: topicsData, error: topicsError } = await query;
      
      if (topicsError) throw topicsError;
      setRecommendedTopics(topicsData || []);
    } catch (error) {
      console.error('Error fetching recommended topics:', error);
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'quiz_completed':
        return <CheckCircle size={16} />;
      case 'video_watched':
        return <PlayCircle size={16} />;
      case 'notes_read':
        return <BookOpen size={16} />;
      default:
        return <CheckCircle size={16} />;
    }
  };

  const getActivityIconClass = (activityType) => {
    return activityType === 'quiz_completed' ? 'success' : 'info';
  };

  const formatActivityText = (activity) => {
    const details = activity.activity_details || {};
    
    switch (activity.activity_type) {
      case 'quiz_completed':
        return {
          text: `Completed quiz: ${details.topic_title || 'Quiz'}`,
          meta: `Score: ${details.percentage || 0}%`
        };
      case 'video_watched':
        return {
          text: `Watched video: ${details.topic_title || 'Video'}`,
          meta: ''
        };
      case 'notes_read':
        return {
          text: `Read notes: ${details.topic_title || 'Notes'}`,
          meta: ''
        };
      default:
        return {
          text: details.topic_title || 'Activity',
          meta: ''
        };
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return activityDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="dashboard-page animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Student Dashboard</h1>
            <p className="page-subtitle">Loading your progress...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {currentUser?.email?.split('@')[0] || 'Student'}!</h1>
          <p className="page-subtitle">Here's an overview of your SQL learning progress.</p>
        </div>
      </div>

      <div className="stats-grid grid">
        <div className="stat-card card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.topicsCompleted}/{stats.totalTopics}</span>
            <span className="stat-label">Topics Completed</span>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Award size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalXP}</span>
            <span className="stat-label">Total XP</span>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.learningTime}</span>
            <span className="stat-label">Learning Time</span>
          </div>
        </div>
        
        <div className="stat-card card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.avgQuizScore}%</span>
            <span className="stat-label">Avg. Quiz Score</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content grid">
        <div className="continue-learning card">
          <div className="card-header">
            <h3>Continue Learning</h3>
          </div>
          
          {inProgressTopic ? (
            <div className="current-topic glass-panel">
              <div className="topic-info">
                <span className="badge-small">In Progress</span>
                <h4>{inProgressTopic.topics?.title || 'Topic'}</h4>
                <div className="progress-container">
                  <div className="progress-bar"><div className="fill" style={{ width: '40%' }}></div></div>
                  <span>40% Complete</span>
                </div>
              </div>
              <Link to={`/topic/${inProgressTopic.topics?.id}`} className="btn btn-primary btn-icon">
                <PlayCircle size={20} /> Resume
              </Link>
            </div>
          ) : (
            <div className="current-topic glass-panel">
              <div className="topic-info">
                <h4>No topic in progress</h4>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Start learning from the recommended topics below</p>
              </div>
              <Link to="/topics" className="btn btn-primary btn-icon">
                <PlayCircle size={20} /> Browse Topics
              </Link>
            </div>
          )}
          
          <h4 className="section-subtitle">Recommended Next</h4>
          <div className="recommended-list">
            {recommendedTopics.length > 0 ? (
              recommendedTopics.map(topic => (
                <div key={topic.id} className="recommended-item">
                  <div className="rec-icon"><BookOpen size={16} /></div>
                  <div className="rec-details">
                    <h5>{topic.title}</h5>
                    <span>{topic.duration} • {topic.level}</span>
                  </div>
                  <Link to={`/topic/${topic.id}`} className="btn btn-outline btn-sm">Start</Link>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                No recommendations available
              </div>
            )}
          </div>
        </div>

        <div className="recent-activity card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Link to="/activity" className="text-link">View All</Link>
          </div>
          <ul className="activity-list">
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => {
                const formatted = formatActivityText(activity);
                return (
                  <li key={activity.id} className="activity-item">
                    <div className={`activity-icon ${getActivityIconClass(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="activity-details">
                      <p dangerouslySetInnerHTML={{ __html: formatted.text }} />
                      <span className="activity-time">
                        {formatTimeAgo(activity.created_at)}
                        {formatted.meta && ` • ${formatted.meta}`}
                      </span>
                    </div>
                  </li>
                );
              })
            ) : (
              <li style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No activity yet. Start learning to see your progress here!
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
