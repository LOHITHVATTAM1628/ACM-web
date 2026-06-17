import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Database, BookOpen, Award, ArrowRight } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home animate-fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="badge glass-panel">🚀 Master SQL from Zero to Hero</div>
          <h1 className="hero-title">
            The Ultimate <span className="text-gradient">SQL Learning</span> Platform
          </h1>
          <p className="hero-subtitle">
            Interactive lessons, curated YouTube resources, practical quizzes, and progress tracking to help you become a database master.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="btn btn-primary btn-lg">
              Start Learning <ArrowRight size={20} />
            </Link>
            <Link to="/auth" className="btn btn-outline btn-lg">
              Admin Portal
            </Link>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="visual-card glass-panel floating-1">
            <Database size={40} className="icon-primary" />
            <div className="visual-info">
              <h4>Advanced Queries</h4>
              <div className="progress-bar"><div className="fill" style={{ width: '75%' }}></div></div>
            </div>
          </div>
          <div className="visual-card glass-panel floating-2">
            <Award size={40} className="icon-secondary" />
            <div className="visual-info">
              <h4>SQL Master Badge</h4>
              <p>Unlocked!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-header">
          <h2>Why Learn With Us?</h2>
          <p>Everything you need to master SQL in one place.</p>
        </div>
        
        <div className="features-grid grid">
          <div className="feature-card card">
            <div className="feature-icon-wrapper">
              <Play size={24} className="feature-icon" />
            </div>
            <h3>Curated Videos</h3>
            <p>Learn from the best SQL tutorials on YouTube, hand-picked and organized by topic.</p>
          </div>
          
          <div className="feature-card card">
            <div className="feature-icon-wrapper">
              <BookOpen size={24} className="feature-icon" />
            </div>
            <h3>Comprehensive Notes</h3>
            <p>Detailed notes, syntax examples, and explanations for every SQL concept.</p>
          </div>
          
          <div className="feature-card card">
            <div className="feature-icon-wrapper">
              <Award size={24} className="feature-icon" />
            </div>
            <h3>Interactive Quizzes</h3>
            <p>Test your knowledge after every topic with practical SQL quizzes and challenges.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
