import React, { useState, useEffect } from 'react';
import { Users, BookOpen, CheckSquare, TrendingUp, Search, Plus, Edit2, Trash2, X, HelpCircle, UserCheck, Award } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    quizzesTaken: 0
  });
  const [topics, setTopics] = useState([]);
  const [lessonCounts, setLessonCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [editingTopic, setEditingTopic] = useState(null);
  const [selectedTopicForQuiz, setSelectedTopicForQuiz] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  
  // Student management state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProgress, setStudentProgress] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [updatingXP, setUpdatingXP] = useState(false);
  const [newXP, setNewXP] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'Beginner',
    duration: '',
    videoUrl: '',
    notesContent: ''
  });

  // Quiz form state
  const [quizFormData, setQuizFormData] = useState({
    question: '',
    options: '',
    correctAnswer: '',
    explanation: ''
  });

  useEffect(() => {
    console.log('🚀 Admin Dashboard mounted - initializing...');
    fetchAdminData();
    fetchStudents();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscriptions on unmount
      console.log('👋 Admin Dashboard unmounting - cleaning up...');
      supabase.channel('admin-realtime').unsubscribe();
    };
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPlatformStats(),
        fetchTopicsWithLessons()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      // Count ACTUAL students from profiles table where role = 'student'
      const { count: studentsCount, error: studentsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      
      if (studentsError) throw studentsError;
      console.log('✅ Total Students Count:', studentsCount);
      
      // Count total topics (active courses)
      const { count: topicsCount, error: topicsError } = await supabase
        .from('topics')
        .select('*', { count: 'exact', head: true });
      
      if (topicsError) throw topicsError;
      console.log('✅ Total Topics Count:', topicsCount);

      // Count total quiz completions from user_progress where status = 'completed'
      const { count: quizzesCount, error: quizzesError } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      if (quizzesError) throw quizzesError;
      console.log('✅ Total Quizzes Taken:', quizzesCount);

      setStats({
        totalStudents: studentsCount || 0,
        activeCourses: topicsCount || 0,
        quizzesTaken: quizzesCount || 0
      });
    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
    }
  };

  const fetchTopicsWithLessons = async () => {
    try {
      // Fetch all topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (topicsError) throw topicsError;
      console.log('✅ Topics fetched:', topicsData?.length || 0, 'topics');

      // Fetch lesson counts
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('topic_id');
      
      if (lessonsError) throw lessonsError;
      console.log('✅ Lessons fetched:', lessonsData?.length || 0, 'lessons');

      // Count lessons per topic
      const counts = lessonsData?.reduce((acc, lesson) => {
        acc[lesson.topic_id] = (acc[lesson.topic_id] || 0) + 1;
        return acc;
      }, {}) || {};

      setTopics(topicsData || []);
      setLessonCounts(counts);
    } catch (error) {
      console.error('❌ Error fetching topics:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to changes in user_progress and activity_log tables
    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress'
        },
        (payload) => {
          console.log('Real-time update detected:', payload);
          // Refresh stats when data changes
          fetchPlatformStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_log'
        },
        (payload) => {
          console.log('Real-time activity update:', payload);
          // Refresh stats when new activity is logged
          fetchPlatformStats();
        }
      )
      .subscribe();

    console.log('Real-time subscriptions activated for Admin Dashboard');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuizInputChange = (e) => {
    const { name, value } = e.target;
    setQuizFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      level: 'Beginner',
      duration: '',
      videoUrl: '',
      notesContent: ''
    });
    setModalMessage('');
    setEditingTopic(null);
  };

  const resetQuizForm = () => {
    setQuizFormData({
      question: '',
      options: '',
      correctAnswer: '',
      explanation: ''
    });
  };

  const handleEditTopic = async (topic) => {
    setEditingTopic(topic);
    
    // Pre-fill form with topic data
    setFormData({
      title: topic.title,
      description: topic.description,
      level: topic.level,
      duration: topic.duration,
      videoUrl: '',
      notesContent: ''
    });

    // Fetch lessons for this topic
    try {
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('topic_id', topic.id);

      if (error) throw error;

      // Pre-fill video and notes
      const videoLesson = lessonsData?.find(l => l.lesson_type === 'video');
      const notesLesson = lessonsData?.find(l => l.lesson_type === 'notes');

      setFormData(prev => ({
        ...prev,
        videoUrl: videoLesson?.video_url || '',
        notesContent: notesLesson?.notes_content || ''
      }));
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }

    setShowModal(true);
  };

  const handleManageQuizzes = async (topic) => {
    setSelectedTopicForQuiz(topic);
    setShowQuizModal(true);
    await fetchQuizzes(topic.id);
  };

  const fetchQuizzes = async (topicId) => {
    try {
      setLoadingQuizzes(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('topic_id', topicId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalMessage('');

    try {
      if (editingTopic) {
        // UPDATE EXISTING TOPIC
        const { error: topicError } = await supabase
          .from('topics')
          .update({
            title: formData.title,
            description: formData.description,
            level: formData.level,
            duration: formData.duration
          })
          .eq('id', editingTopic.id);

        if (topicError) throw topicError;

        // Update or create video lesson
        const { data: existingVideo } = await supabase
          .from('lessons')
          .select('id')
          .eq('topic_id', editingTopic.id)
          .eq('lesson_type', 'video')
          .single();

        if (formData.videoUrl) {
          if (existingVideo) {
            // Update existing video lesson
            const { error: videoUpdateError } = await supabase
              .from('lessons')
              .update({
                video_url: formData.videoUrl,
                title: `${formData.title} - Video Lesson`
              })
              .eq('id', existingVideo.id);

            if (videoUpdateError) throw videoUpdateError;
          } else {
            // Create new video lesson
            const { error: videoInsertError } = await supabase
              .from('lessons')
              .insert({
                topic_id: editingTopic.id,
                title: `${formData.title} - Video Lesson`,
                lesson_type: 'video',
                video_url: formData.videoUrl,
                order_index: 1
              });

            if (videoInsertError) throw videoInsertError;
          }
        } else if (existingVideo) {
          // Remove video lesson if URL is empty
          await supabase.from('lessons').delete().eq('id', existingVideo.id);
        }

        // Update or create notes lesson
        const { data: existingNotes } = await supabase
          .from('lessons')
          .select('id')
          .eq('topic_id', editingTopic.id)
          .eq('lesson_type', 'notes')
          .single();

        if (formData.notesContent) {
          if (existingNotes) {
            // Update existing notes lesson
            const { error: notesUpdateError } = await supabase
              .from('lessons')
              .update({
                notes_content: formData.notesContent,
                title: `${formData.title} - Notes`
              })
              .eq('id', existingNotes.id);

            if (notesUpdateError) throw notesUpdateError;
          } else {
            // Create new notes lesson
            const { error: notesInsertError } = await supabase
              .from('lessons')
              .insert({
                topic_id: editingTopic.id,
                title: `${formData.title} - Notes`,
                lesson_type: 'notes',
                notes_content: formData.notesContent,
                order_index: 2
              });

            if (notesInsertError) throw notesInsertError;
          }
        } else if (existingNotes) {
          // Remove notes lesson if content is empty
          await supabase.from('lessons').delete().eq('id', existingNotes.id);
        }

        setModalMessage('✅ Topic updated successfully!');
      } else {
        // INSERT NEW TOPIC
        // Get the current max order_index
        const { data: existingTopics, error: fetchError } = await supabase
          .from('topics')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const nextOrderIndex = (existingTopics?.[0]?.order_index || 0) + 1;

        // Step 1: Insert topic
        const { data: topicData, error: topicError } = await supabase
          .from('topics')
          .insert({
            title: formData.title,
            description: formData.description,
            level: formData.level,
            duration: formData.duration,
            order_index: nextOrderIndex
          })
          .select()
          .single();

        if (topicError) throw topicError;

        const topicId = topicData.id;

        // Step 2: Insert video lesson
        if (formData.videoUrl) {
          const { error: videoError } = await supabase
            .from('lessons')
            .insert({
              topic_id: topicId,
              title: `${formData.title} - Video Lesson`,
              lesson_type: 'video',
              video_url: formData.videoUrl,
              order_index: 1
            });

          if (videoError) throw videoError;
        }

        // Step 3: Insert notes lesson
        if (formData.notesContent) {
          const { error: notesError } = await supabase
            .from('lessons')
            .insert({
              topic_id: topicId,
              title: `${formData.title} - Notes`,
              lesson_type: 'notes',
              notes_content: formData.notesContent,
              order_index: 2
            });

          if (notesError) throw notesError;
        }

        setModalMessage('✅ Topic and lessons added successfully!');
      }

      // Success - refresh data
      await fetchAdminData();
      
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 1500);

    } catch (error) {
      console.error('Error saving topic:', error);
      setModalMessage('❌ Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to delete this topic?\n\n' +
      'This will permanently delete:\n' +
      '• The topic\n' +
      '• All lessons\n' +
      '• All quizzes\n' +
      '• All student progress for this topic\n\n' +
      'This action CANNOT be undone!'
    );
    
    if (!confirmed) {
      console.log('❌ Topic deletion cancelled by user');
      return;
    }

    try {
      console.log('🗑️ Deleting topic and related data for topic_id:', topicId);
      console.log('⏳ Step 1/4: Deleting lessons...');
      
      // Step 1: Delete all lessons associated with this topic
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('topic_id', topicId);

      if (lessonsError) {
        console.error('❌ Error deleting lessons:', lessonsError);
        throw lessonsError;
      }
      console.log('✅ Lessons deleted successfully');

      console.log('⏳ Step 2/4: Deleting quizzes...');
      // Step 2: Delete all quizzes associated with this topic
      const { error: quizzesError } = await supabase
        .from('quizzes')
        .delete()
        .eq('topic_id', topicId);

      if (quizzesError) {
        console.error('❌ Error deleting quizzes:', quizzesError);
        throw quizzesError;
      }
      console.log('✅ Quizzes deleted successfully');

      console.log('⏳ Step 3/4: Deleting user progress...');
      // Step 3: Delete user_progress entries for this topic
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('topic_id', topicId);

      if (progressError) {
        console.error('❌ Error deleting user progress:', progressError);
        throw progressError;
      }
      console.log('✅ User progress deleted successfully');

      console.log('⏳ Step 4/4: Deleting topic...');
      // Step 4: Finally, delete the topic itself
      const { error: topicError } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (topicError) {
        console.error('❌ Error deleting topic:', topicError);
        throw topicError;
      }
      console.log('✅ Topic deleted successfully');

      // Refresh data
      console.log('🔄 Refreshing dashboard data...');
      await fetchAdminData();
      alert('✅ Topic and all related data deleted successfully!');
      console.log('🎉 Deletion completed successfully');
    } catch (error) {
      console.error('❌ Error deleting topic:', error);
      console.error('❌ Error details:', error.message);
      alert('❌ Error deleting topic: ' + error.message + '\n\nCheck console for details.');
    }
  };

  const handleAddQuiz = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Parse options from comma-separated string to array
      const optionsArray = quizFormData.options
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);

      if (optionsArray.length < 2) {
        alert('Please provide at least 2 options separated by commas.');
        setSubmitting(false);
        return;
      }

      // Find the index of the correct answer
      const correctAnswerIndex = optionsArray.findIndex(
        opt => opt.toLowerCase() === quizFormData.correctAnswer.toLowerCase()
      );

      if (correctAnswerIndex === -1) {
        alert('Correct answer must match one of the options exactly.');
        setSubmitting(false);
        return;
      }

      // Get next order_index
      const { data: existingQuizzes } = await supabase
        .from('quizzes')
        .select('order_index')
        .eq('topic_id', selectedTopicForQuiz.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = (existingQuizzes?.[0]?.order_index || 0) + 1;

      // Insert quiz
      const { error } = await supabase
        .from('quizzes')
        .insert({
          topic_id: selectedTopicForQuiz.id,
          question: quizFormData.question,
          options: optionsArray,
          correct_answer: correctAnswerIndex,
          order_index: nextOrderIndex
        });

      if (error) throw error;

      // Refresh quizzes
      await fetchQuizzes(selectedTopicForQuiz.id);
      resetQuizForm();
      alert('✅ Quiz question added successfully!');

    } catch (error) {
      console.error('Error adding quiz:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz question?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      // Refresh quizzes
      await fetchQuizzes(selectedTopicForQuiz.id);
      console.log('Quiz deleted successfully');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Error deleting quiz: ' + error.message);
    }
  };

  // ========== STUDENT MANAGEMENT FUNCTIONS ==========
  
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      console.log('🔍 Fetching students from profiles table...');
      console.log('📍 Current user authenticated?', await supabase.auth.getUser());
      
      // Fetch all students with their profile data
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('email', { ascending: true });

      // Detailed error handling
      if (studentsError) {
        console.error('❌ Error fetching students:', studentsError);
        console.error('❌ Error code:', studentsError.code);
        console.error('❌ Error message:', studentsError.message);
        
        // Check for RLS policy issues
        if (studentsError.code === '42501' || studentsError.message?.includes('policy')) {
          console.error('⚠️ RLS POLICY ISSUE DETECTED!');
          console.error('⚠️ The admin user may not have permission to read profiles table.');
          console.error('⚠️ Please check RLS policies in Supabase for the profiles table.');
          alert('⚠️ Permission Error: Unable to fetch students. This may be due to Row Level Security (RLS) policies. Please check Supabase RLS settings for the profiles table.');
        }
        
        throw studentsError;
      }

      console.log('✅ Students fetched:', studentsData?.length || 0, 'students found');
      console.log('📋 Students data (first 3):', studentsData?.slice(0, 3));
      
      // Early return if no students
      if (!studentsData || studentsData.length === 0) {
        console.log('ℹ️ No students found in database');
        setStudents([]);
        return;
      }

      // Fetch progress for all students
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, topic_id, quiz_score, quiz_total, xp_earned, can_retake, topics(title)');

      if (progressError) {
        console.error('❌ Error fetching progress:', progressError);
        console.warn('⚠️ Continuing without progress data...');
        // Don't throw - continue with empty progress
      }

      console.log('✅ Progress data fetched:', progressData?.length || 0, 'progress records');

      // Calculate total XP for each student
      const studentsWithXP = (studentsData || []).map(student => {
        const userProgress = (progressData || []).filter(p => p.user_id === student.id);
        const totalXP = userProgress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
        
        return {
          ...student,
          totalXP,
          progressCount: userProgress.length
        };
      });

      console.log('✅ Students with XP calculated:', studentsWithXP.length);
      console.log('📊 Sample student data:', studentsWithXP[0]);
      
      // Force state update
      setStudents(studentsWithXP);
      console.log('✅ State updated with students');
      
    } catch (error) {
      console.error('❌ Error in fetchStudents:', error);
      console.error('❌ Stack trace:', error.stack);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
      console.log('✅ fetchStudents completed');
    }
  };

  const handleManageStudent = async (student) => {
    console.log('👤 Managing student:', student);
    setSelectedStudent(student);
    setNewXP(student.totalXP.toString());
    setShowStudentModal(true);

    try {
      console.log('🔍 Fetching detailed progress for student:', student.id);
      // Fetch detailed progress for this student
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, topics(id, title)')
        .eq('user_id', student.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching student progress:', error);
        throw error;
      }
      
      console.log('✅ Student progress fetched:', data?.length || 0, 'records');
      console.log('📋 Progress data:', data);
      setStudentProgress(data || []);
    } catch (error) {
      console.error('❌ Error in handleManageStudent:', error);
      setStudentProgress([]);
    }
  };

  const handleUpdateStudentXP = async () => {
    if (!selectedStudent) return;

    try {
      setUpdatingXP(true);
      const xpValue = parseInt(newXP) || 0;
      console.log('💰 Updating XP for student:', selectedStudent.email, 'New XP:', xpValue);

      // Calculate the difference
      const currentTotal = selectedStudent.totalXP;
      const difference = xpValue - currentTotal;
      console.log('📊 Current XP:', currentTotal, 'Difference:', difference);

      if (difference === 0) {
        alert('No change in XP value');
        return;
      }

      // We'll distribute the difference across the student's progress records
      // Or create a new "adjustment" record in user_progress
      
      // For simplicity, let's update the first progress record or create one
      const { data: progressRecords, error: fetchError } = await supabase
        .from('user_progress')
        .select('id, xp_earned, topic_id')
        .eq('user_id', selectedStudent.id)
        .limit(1);

      if (fetchError) {
        console.error('❌ Error fetching progress records:', fetchError);
        throw fetchError;
      }

      console.log('📋 Progress records found:', progressRecords?.length || 0);

      if (progressRecords && progressRecords.length > 0) {
        // Update existing record
        const record = progressRecords[0];
        const newXPEarned = (record.xp_earned || 0) + difference;
        console.log('✏️ Updating record:', record.id, 'New xp_earned:', newXPEarned);
        
        const { error } = await supabase
          .from('user_progress')
          .update({
            xp_earned: newXPEarned,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);

        if (error) {
          console.error('❌ Error updating XP:', error);
          throw error;
        }
        
        console.log('✅ XP updated successfully');
      } else {
        // No progress records - can't update XP directly without a topic
        console.warn('⚠️ No progress records found for student');
        alert('This student has no quiz progress yet. XP is calculated from quiz completions.');
        setUpdatingXP(false);
        return;
      }

      alert('✅ Student XP updated successfully!');
      
      // Refresh data
      console.log('🔄 Refreshing student data...');
      await fetchStudents();
      await handleManageStudent({ ...selectedStudent, totalXP: xpValue });
      
    } catch (error) {
      console.error('❌ Error updating student XP:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setUpdatingXP(false);
    }
  };

  const handleToggleRetake = async (progressId, currentValue, topicTitle) => {
    try {
      const newValue = !currentValue;
      console.log('🔄 Toggling retake for:', topicTitle, 'From:', currentValue, 'To:', newValue);
      
      const { error } = await supabase
        .from('user_progress')
        .update({ 
          can_retake: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', progressId);

      if (error) {
        console.error('❌ Error toggling retake:', error);
        throw error;
      }

      console.log('✅ Retake toggled successfully');
      alert(`✅ Retake ${newValue ? 'enabled' : 'disabled'} for "${topicTitle}"`);
      
      // Refresh student progress
      console.log('🔄 Refreshing student progress...');
      await handleManageStudent(selectedStudent);
      
    } catch (error) {
      console.error('❌ Error in handleToggleRetake:', error);
      alert('❌ Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-page animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Loading platform data...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage courses, students, and content.</p>
        </div>
      </div>

      <div className="admin-stats grid">
        <div className="admin-stat-card card">
          <div className="stat-header">
            <h4 className="stat-title">Total Students</h4>
            <div className="stat-icon-sm" style={{ color: 'var(--primary)' }}><Users size={18} /></div>
          </div>
          <div className="stat-value-large">{stats.totalStudents}</div>
          <div className="stat-trend">
            Real-time tracking
          </div>
        </div>
        
        <div className="admin-stat-card card">
          <div className="stat-header">
            <h4 className="stat-title">Active Courses</h4>
            <div className="stat-icon-sm" style={{ color: 'var(--accent)' }}><BookOpen size={18} /></div>
          </div>
          <div className="stat-value-large">{stats.activeCourses}</div>
          <div className="stat-trend">
            Published topics
          </div>
        </div>
        
        <div className="admin-stat-card card">
          <div className="stat-header">
            <h4 className="stat-title">Quizzes Taken</h4>
            <div className="stat-icon-sm" style={{ color: 'var(--success)' }}><CheckSquare size={18} /></div>
          </div>
          <div className="stat-value-large">{stats.quizzesTaken}</div>
          <div className="stat-trend positive">
            <TrendingUp size={14} /> Live updates
          </div>
        </div>
      </div>

      <div className="admin-content grid">
        <div className="admin-panel card full-width">
          <div className="panel-header">
            <h3>Manage Topics</h3>
            <div className="panel-actions">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Search topics..." />
              </div>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => setShowModal(true)}
              >
                <Plus size={16} /> Add Topic
              </button>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Topic Name</th>
                  <th>Level</th>
                  <th>Lessons</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topics.length > 0 ? (
                  topics.map(topic => (
                    <tr key={topic.id}>
                      <td>{topic.title}</td>
                      <td>
                        <span className={`badge-level ${topic.level.toLowerCase()}`}>
                          {topic.level}
                        </span>
                      </td>
                      <td>{lessonCounts[topic.id] || 0}</td>
                      <td>
                        <span className="badge-status active">Published</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon-only"
                            onClick={() => handleEditTopic(topic)}
                            title="Edit Topic"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-icon-only"
                            onClick={() => handleManageQuizzes(topic)}
                            title="Manage Quizzes"
                            style={{ color: '#f59e0b' }}
                          >
                            <HelpCircle size={16} />
                          </button>
                          <button 
                            className="btn-icon-only text-danger"
                            onClick={() => handleDeleteTopic(topic.id)}
                            title="Delete Topic"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>No topics found</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add your first topic to get started</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel card">
          <div className="panel-header">
            <h3>Student Profiles</h3>
            <div className="panel-actions">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Search students..." />
              </div>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Total XP</th>
                  <th>Completed Topics</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Loading students...
                    </td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map(student => (
                    <tr key={student.id}>
                      <td>{student.full_name || 'N/A'}</td>
                      <td>{student.email}</td>
                      <td>
                        <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                          {student.totalXP} XP
                        </span>
                      </td>
                      <td>{student.progressCount}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon-only"
                            onClick={() => handleManageStudent(student)}
                            title="Manage Student"
                          >
                            <UserCheck size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                      <div style={{ fontSize: '1rem', fontWeight: '500' }}>No students have registered yet</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Students will appear here once they sign up</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '8px', color: '#ffc107' }}>
                        ⚠️ If students exist but aren't showing: Check RLS policies in Supabase for the profiles table
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel card">
          <div className="panel-header">
            <h3>Recent User Feedback</h3>
          </div>
          <div className="feedback-list">
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Feedback feature coming soon
            </div>
          </div>
        </div>
      </div>

      {/* Add Topic Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#fff', margin: 0 }}>
                {editingTopic ? 'Edit Topic' : 'Add New Topic'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Topic Name */}
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Topic Name *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Introduction to SQL"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Brief description of the topic..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Level and Duration Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Level *
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Duration *
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 1 hour"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  YouTube Video URL
                </label>
                <input
                  type="text"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  placeholder="e.g., https://www.youtube.com/watch?v=..."
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Notes Content */}
              <div>
                <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                  Notes & Syntax Content (HTML supported)
                </label>
                <textarea
                  name="notesContent"
                  value={formData.notesContent}
                  onChange={handleInputChange}
                  placeholder="<h2>Topic Overview</h2><p>Description...</p>"
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              {/* Message Display */}
              {modalMessage && (
                <div style={{
                  padding: '12px 15px',
                  borderRadius: '8px',
                  background: modalMessage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${modalMessage.includes('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: modalMessage.includes('✅') ? '#34d399' : '#f87171',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {modalMessage}
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting ? '#666' : '#3b82f6',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 4px 15px 0 rgba(59, 130, 246, 0.4)'
                  }}
                >
                  {submitting ? 'Saving...' : (editingTopic ? 'Update Topic' : 'Add Topic')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quiz Manager Modal */}
      {showQuizModal && selectedTopicForQuiz && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            padding: '30px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#fff', margin: 0 }}>Manage Quizzes</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '5px' }}>
                  {selectedTopicForQuiz.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuizModal(false);
                  setSelectedTopicForQuiz(null);
                  resetQuizForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Existing Quizzes List */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>
                Existing Questions ({quizzes.length})
              </h3>
              {loadingQuizzes ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', padding: '20px' }}>
                  Loading quizzes...
                </div>
              ) : quizzes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quizzes.map((quiz, index) => (
                    <div key={quiz.id} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#fff', fontWeight: '600', marginBottom: '8px' }}>
                            Q{index + 1}: {quiz.question}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
                            {(Array.isArray(quiz.options) ? quiz.options : JSON.parse(quiz.options)).map((opt, i) => (
                              <span key={i} style={{ 
                                color: i === quiz.correct_answer ? '#34d399' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '13px'
                              }}>
                                {i === quiz.correct_answer && '✓ '}{opt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '5px'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', padding: '20px', border: '1px dashed rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>
                  No quizzes yet. Add your first question below.
                </div>
              )}
            </div>

            {/* Add New Quiz Form */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>
                Add New Question
              </h3>
              <form onSubmit={handleAddQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Question */}
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Question *
                  </label>
                  <textarea
                    name="question"
                    value={quizFormData.question}
                    onChange={handleQuizInputChange}
                    required
                    placeholder="What is SELECT used for in SQL?"
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Options */}
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Options (comma-separated) *
                  </label>
                  <input
                    type="text"
                    name="options"
                    value={quizFormData.options}
                    onChange={handleQuizInputChange}
                    required
                    placeholder="Insert data, Update data, Delete data, Retrieve data"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    Separate each option with a comma
                  </small>
                </div>

                {/* Correct Answer */}
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    name="correctAnswer"
                    value={quizFormData.correctAnswer}
                    onChange={handleQuizInputChange}
                    required
                    placeholder="Retrieve data"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                    Must match one of the options exactly
                  </small>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting ? '#666' : '#3b82f6',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 4px 15px 0 rgba(59, 130, 246, 0.4)',
                    marginTop: '10px'
                  }}
                >
                  {submitting ? 'Adding...' : 'Add Question'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Management Modal */}
      {showStudentModal && selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            padding: '30px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#fff', margin: 0 }}>Manage Student</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '5px' }}>
                  {selectedStudent.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedStudent(null);
                  setStudentProgress([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Student Stats Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '25px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px'
            }}>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginBottom: '5px' }}>
                  Full Name
                </div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {selectedStudent.full_name || 'Not Set'}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginBottom: '5px' }}>
                  Completed Topics
                </div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {selectedStudent.progressCount}
                </div>
              </div>
            </div>

            {/* Update Total XP */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: 'var(--primary)' }} />
                Update Total XP
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginBottom: '5px', display: 'block' }}>
                    Total XP
                  </label>
                  <input
                    type="number"
                    value={newXP}
                    onChange={(e) => setNewXP(e.target.value)}
                    placeholder="Enter new XP value"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  onClick={handleUpdateStudentXP}
                  disabled={updatingXP}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: updatingXP ? '#666' : '#3b82f6',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: updatingXP ? 'not-allowed' : 'pointer',
                    boxShadow: updatingXP ? 'none' : '0 4px 15px 0 rgba(59, 130, 246, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {updatingXP ? 'Updating...' : 'Update XP'}
                </button>
              </div>
              <small style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Current XP: {selectedStudent.totalXP}
              </small>
            </div>

            {/* Quiz Progress & Retake Management */}
            <div>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px' }}>
                Quiz Progress & Retake Management
              </h3>
              {studentProgress.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {studentProgress.map((progress) => (
                    <div key={progress.id} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '5px' }}>
                            {progress.topics?.title || 'Unknown Topic'}
                          </h4>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            <span>
                              Score: <strong style={{ color: progress.quiz_score === progress.quiz_total ? '#34d399' : '#f59e0b' }}>
                                {progress.quiz_score}/{progress.quiz_total}
                              </strong>
                            </span>
                            <span>
                              XP: <strong style={{ color: 'var(--primary)' }}>{progress.xp_earned || 0}</strong>
                            </span>
                            <span>
                              Status: <strong style={{ color: progress.can_retake ? '#34d399' : 'rgba(255, 255, 255, 0.6)' }}>
                                {progress.can_retake ? 'Can Retake' : 'Locked'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleRetake(progress.id, progress.can_retake, progress.topics?.title)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: `1px solid ${progress.can_retake ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                          background: progress.can_retake ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: progress.can_retake ? '#f87171' : '#34d399',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {progress.can_retake ? '🔓 Disable Retake' : '🔒 Enable Retake'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  padding: '30px', 
                  border: '1px dashed rgba(255, 255, 255, 0.2)', 
                  borderRadius: '8px' 
                }}>
                  This student has not completed any quizzes yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
