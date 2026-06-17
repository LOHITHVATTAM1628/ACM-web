import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Quiz.css';

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [canRetake, setCanRetake] = useState(false);
  const [retakeRequested, setRetakeRequested] = useState(false);

  useEffect(() => {
    fetchQuizQuestions();
    checkRetakePermission();
  }, [id]);

  const checkRetakePermission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_progress')
        .select('can_retake')
        .eq('user_id', user.id)
        .eq('topic_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCanRetake(data?.can_retake || false);
    } catch (error) {
      console.error('Error checking retake permission:', error);
    }
  };

  const fetchQuizQuestions = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('title')
        .eq('id', id)
        .single();

      if (topicError) throw topicError;
      setTopicTitle(topicData.title);

      // Fetch quiz questions for this topic
      const { data: questionsData, error: questionsError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('topic_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Parse the JSONB options field
      const parsedQuestions = questionsData.map(q => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
        correctAnswer: q.correct_answer
      }));

      setQuizData(parsedQuestions);
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveQuizProgress = async () => {
    if (!currentUser) {
      console.log('User not logged in, skipping progress save');
      return;
    }

    try {
      setSaving(true);
      
      const xpEarned = score * 100; // 100 XP per correct answer
      const quizTotal = quizData.length;

      // Upsert user progress (insert or update if exists)
      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: currentUser.id,
          topic_id: id,
          status: 'completed',
          quiz_score: score,
          quiz_total: quizTotal,
          xp_earned: xpEarned,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          can_retake: false // Reset retake permission after completing quiz
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (progressError) throw progressError;

      // Log activity
      const { error: activityError } = await supabase
        .from('activity_log')
        .insert({
          user_id: currentUser.id,
          topic_id: id,
          activity_type: 'quiz_completed',
          activity_details: {
            topic_title: topicTitle,
            score: score,
            total: quizTotal,
            percentage: Math.round((score / quizTotal) * 100),
            xp_earned: xpEarned
          }
        });

      if (activityError) throw activityError;

      // Update retake permission state
      setCanRetake(false);
      console.log('Progress saved successfully!');
    } catch (error) {
      console.error('Error saving quiz progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOptionSelect = (index) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === quizData[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Save progress before showing results
      await saveQuizProgress();
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  };

  const handleRequestRetake = async () => {
    if (!currentUser) return;
    
    setRetakeRequested(true);
    // In a real app, you might send a notification to admin
    // For now, we just show feedback to the user
    alert('Retake request submitted. Please wait for admin approval.');
  };

  if (loading) {
    return (
      <div className="quiz-page animate-fade-in">
        <div className="quiz-card card">
          <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
            Loading quiz...
          </div>
        </div>
      </div>
    );
  }

  if (quizData.length === 0) {
    return (
      <div className="quiz-page animate-fade-in">
        <div className="quiz-card card">
          <h2>No Quiz Available</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>
            There are no quiz questions for this topic yet.
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link to="/topics" className="btn btn-primary">
              <ArrowRight size={18} /> Back to Topics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quizData.length) * 100);
    const xpEarned = score * 100;

    return (
      <div className="quiz-page animate-fade-in">
        <div className="quiz-card card results-card">
          <h2>Quiz Complete!</h2>
          <div className="score-display">
            <div className="score-circle">
              <span className="score-text">{score}/{quizData.length}</span>
            </div>
          </div>
          <p className="feedback-text">
            {score === quizData.length ? 'Perfect score! You are a SQL master.' : 
             score > 0 ? 'Good job! Review the notes to perfect your knowledge.' : 
             'Keep learning and try again!'}
          </p>
          {currentUser && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem' }}>
              You earned <strong style={{ color: 'var(--primary)' }}>{xpEarned} XP</strong>!
            </p>
          )}
          <div className="results-actions">
            {currentUser && canRetake ? (
              <button onClick={restartQuiz} className="btn btn-outline">
                <RotateCcw size={18} /> Retake Quiz
              </button>
            ) : currentUser && !canRetake ? (
              <button 
                onClick={handleRequestRetake} 
                className="btn btn-outline"
                disabled={retakeRequested}
              >
                {retakeRequested ? 'Request Submitted' : 'Request Retake'}
              </button>
            ) : (
              <button onClick={restartQuiz} className="btn btn-outline">
                <RotateCcw size={18} /> Retake Quiz
              </button>
            )}
            <Link to="/topics" className="btn btn-primary">
              <ArrowRight size={18} /> Next Topic
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page animate-fade-in">
      <div className="quiz-card card">
        <div className="quiz-header">
          <span className="question-count">Question {currentQuestion + 1} of {quizData.length}</span>
          <div className="quiz-progress">
            <div 
              className="fill" 
              style={{ width: `${((currentQuestion + 1) / quizData.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="question-section">
          <h2 className="question-text">{quizData[currentQuestion].question}</h2>
        </div>

        <div className="options-section">
          {quizData[currentQuestion].options.map((option, index) => {
            let optionClass = 'option';
            if (isAnswered) {
              if (index === quizData[currentQuestion].correctAnswer) {
                optionClass += ' correct';
              } else if (index === selectedOption) {
                optionClass += ' incorrect';
              }
            } else if (index === selectedOption) {
              optionClass += ' selected';
            }

            return (
              <button 
                key={index} 
                className={optionClass}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswered}
              >
                <span>{option}</span>
                {isAnswered && index === quizData[currentQuestion].correctAnswer && <CheckCircle size={20} />}
                {isAnswered && index === selectedOption && index !== quizData[currentQuestion].correctAnswer && <XCircle size={20} />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="quiz-footer animate-fade-in">
            <button onClick={nextQuestion} className="btn btn-primary next-btn">
              {currentQuestion === quizData.length - 1 ? 'Finish' : 'Next Question'} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
