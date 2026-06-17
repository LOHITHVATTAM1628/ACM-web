import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlayCircle, FileText, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './TopicDetail.css';

const TopicDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('video'); // 'video' or 'notes'
  const [topic, setTopic] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [videoLesson, setVideoLesson] = useState(null);
  const [notesLesson, setNotesLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTopics, setAllTopics] = useState([]);
  const [userProgress, setUserProgress] = useState({});

  useEffect(() => {
    fetchTopicDetails();
  }, [id]);

  const fetchTopicDetails = async () => {
    try {
      setLoading(true);

      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('*')
        .eq('id', id)
        .single();

      if (topicError) throw topicError;
      setTopic(topicData);

      // Fetch lessons for this topic
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('topic_id', id)
        .order('order_index', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData);

      // Separate video and notes lessons
      const video = lessonsData.find(lesson => lesson.lesson_type === 'video');
      const notes = lessonsData.find(lesson => lesson.lesson_type === 'notes');
      
      setVideoLesson(video);
      setNotesLesson(notes);

      // Fetch all topics for sidebar navigation
      const { data: allTopicsData, error: allTopicsError } = await supabase
        .from('topics')
        .select('id, title, order_index')
        .order('order_index', { ascending: true });

      if (allTopicsError) throw allTopicsError;
      setAllTopics(allTopicsData);

      // Get current user and their progress
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('topic_id, status')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        const progressMap = progressData.reduce((acc, item) => {
          acc[item.topic_id] = item.status;
          return acc;
        }, {});

        setUserProgress(progressMap);
      }

    } catch (error) {
      console.error('Error fetching topic details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract YouTube video ID from URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    
    // If it's already just an ID
    if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
      return `https://www.youtube.com/embed/${url}`;
    }
    
    // Extract ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : url;
    
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (allTopics.length === 0) return 0;
    const completedCount = allTopics.filter(t => userProgress[t.id] === 'completed').length;
    return Math.round((completedCount / allTopics.length) * 100);
  };

  // Get lesson status for sidebar
  const getLessonStatus = (topicId) => {
    if (userProgress[topicId] === 'completed') return 'completed';
    if (topicId === id) return 'active';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="topic-detail-page animate-fade-in">
        <Link to="/topics" className="back-link">
          <ArrowLeft size={16} /> Back to Topics
        </Link>
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Loading topic details...
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="topic-detail-page animate-fade-in">
        <Link to="/topics" className="back-link">
          <ArrowLeft size={16} /> Back to Topics
        </Link>
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Topic not found
        </div>
      </div>
    );
  }

  return (
    <div className="topic-detail-page animate-fade-in">
      <Link to="/topics" className="back-link">
        <ArrowLeft size={16} /> Back to Topics
      </Link>
      
      <div className="topic-header">
        <div>
          <h1 className="page-title">{topic.title}</h1>
          <p className="page-subtitle">{topic.description}</p>
        </div>
        <Link to={`/quiz/${topic.id}`} className="btn btn-primary">
          <CheckCircle size={18} /> Take Quiz
        </Link>
      </div>

      <div className="topic-content-layout">
        <div className="main-content">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
            >
              <PlayCircle size={18} /> Video Lesson
            </button>
            <button 
              className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={18} /> Notes & Syntax
            </button>
          </div>

          <div className="tab-content card">
            {activeTab === 'video' ? (
              <div className="video-container">
                {videoLesson && videoLesson.video_url ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={getYouTubeEmbedUrl(videoLesson.video_url)} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No video available for this topic yet
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="notes-container"
                dangerouslySetInnerHTML={{ __html: notesLesson?.notes_content || '<p>No notes available for this topic yet</p>' }}
              />
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="card course-progress">
            <h3>Module Progress</h3>
            <div className="progress-bar-container">
              <div className="progress-bar"><div className="fill" style={{width: `${calculateProgress()}%`}}></div></div>
              <span className="progress-text">{Object.values(userProgress).filter(s => s === 'completed').length}/{allTopics.length} Completed</span>
            </div>
            
            <ul className="lesson-list">
              {allTopics.slice(0, 3).map((t, index) => {
                const status = getLessonStatus(t.id);
                return (
                  <li key={t.id} className={`lesson-item ${status}`}>
                    {status === 'completed' && <CheckCircle size={16} className="text-success" />}
                    {status === 'active' && <PlayCircle size={16} className="text-primary" />}
                    {status === 'pending' && <div className="circle-empty"></div>}
                    <span>{t.title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetail;
