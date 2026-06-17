import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Filter, Search, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Topics.css';

const Topics = () => {
  const [topics, setTopics] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchTopicsAndProgress();
  }, []);

  const fetchTopicsAndProgress = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch topics ordered by order_index
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('order_index', { ascending: true });

      if (topicsError) throw topicsError;

      // Fetch lessons count for each topic
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('topic_id');

      if (lessonsError) throw lessonsError;

      // Count lessons per topic
      const lessonCounts = lessonsData.reduce((acc, lesson) => {
        acc[lesson.topic_id] = (acc[lesson.topic_id] || 0) + 1;
        return acc;
      }, {});

      // If user is logged in, fetch their progress
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('topic_id, status')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        // Create a map of topic progress
        const progressMap = progressData.reduce((acc, item) => {
          acc[item.topic_id] = item.status;
          return acc;
        }, {});

        setUserProgress(progressMap);
      }

      // Combine topics with lesson counts
      const enrichedTopics = topicsData.map(topic => ({
        ...topic,
        lessonCount: lessonCounts[topic.id] || 0,
        completed: userProgress[topic.id] === 'completed'
      }));

      setTopics(enrichedTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="topics-page animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Explore SQL Topics</h1>
            <p className="page-subtitle">Master database concepts step by step.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Loading topics...
        </div>
      </div>
    );
  }

  return (
    <div className="topics-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Explore SQL Topics</h1>
          <p className="page-subtitle">Master database concepts step by step.</p>
        </div>
        <div className="header-actions">
          <div className="search-bar glass-panel">
            <Search size={20} className="text-muted" />
            <input type="text" placeholder="Search topics..." />
          </div>
          <button className="btn btn-outline"><Filter size={18} /> Filter</button>
        </div>
      </div>

      <div className="topics-grid grid">
        {topics.map((topic) => (
          <div key={topic.id} className="topic-card card">
            <div className="topic-card-header">
              <span className={`difficulty-badge ${topic.level.toLowerCase()}`}>{topic.level}</span>
              {topic.completed && <span className="status-badge">Completed</span>}
            </div>
            <div className="topic-icon">
              <Database size={32} />
            </div>
            <h3 className="topic-title">{topic.title}</h3>
            <div className="topic-meta">
              <span><BookOpen size={16} /> {topic.lessonCount} Lessons</span>
              <span>•</span>
              <span>{topic.duration}</span>
            </div>
            <div className="topic-actions">
              <Link to={`/topic/${topic.id}`} className="btn btn-primary w-100">
                {topic.completed ? 'Review Topic' : 'Start Learning'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Topics;
