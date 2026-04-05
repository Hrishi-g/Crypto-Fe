import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Mail, Lock, Calendar, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import './Signup.css';

interface SignupFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  dob: string;
  password: string;
  confirmPassword: string;
  role: 'USER' | 'ADMIN' | 'MANAGER';
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSignupSuccess, setIsSignupSuccess] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupFormData>({
    mode: 'onSubmit',
    defaultValues: {
      role: 'USER'
    }
  });
  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        dob: data.dob,
        password: data.password,
        role: data.role
      };

      const response = await fetch('http://localhost:8080/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'include'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Account created successfully!' });
        setIsSignupSuccess(true);
      } else {
        let errorText = 'Signup failed. Please try again.';
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData) || errorText;
          } else {
            const textData = await response.text();
            errorText = textData || errorText;
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
        }
        
        setMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="logo-text">CRYPTX</div>
        
        {isSignupSuccess ? (
          <div className="success-screen">
            <div className="success-icon" style={{
              width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)',
              color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', margin: '0 auto 2rem'
            }}>✓</div>
            <h1 className="hero-title" style={{ fontSize: '2rem', textAlign: 'center' }}>Account Created!</h1>
            <p className="hero-desc" style={{ textAlign: 'center' }}>Welcome to the future of trading. You can now login to your secure dashboard.</p>
            <button 
              className="btn-main btn-primary-gradient auth-submit"
              onClick={() => navigate('/login')}
            >
              Go to Login <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
          </div>
        ) : (
          <>
            <header className="auth-header">
              <h1>Create Account</h1>
              <p>Join millions of traders worldwide</p>
            </header>

            {message && (
              <div className={`auth-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="auth-row">
                <div className="auth-group">
                  <label><User size={16} /> First Name</label>
                  <div className="auth-input-container">
                    <input {...register("firstName", { required: true })} placeholder="John" className={errors.firstName ? 'error' : ''} />
                  </div>
                </div>
                <div className="auth-group">
                  <label>Last Name</label>
                  <div className="auth-input-container">
                    <input {...register("lastName", { required: true })} placeholder="Doe" className={errors.lastName ? 'error' : ''} />
                  </div>
                </div>
              </div>

              <div className="auth-group">
                <label>Username</label>
                <div className="auth-input-container">
                  <input {...register("username", { required: true })} placeholder="johndoe123" className={errors.username ? 'error' : ''} />
                </div>
              </div>

              <div className="auth-group">
                <label><Mail size={16} /> Email Address</label>
                <div className="auth-input-container">
                  <input type="email" {...register("email", { 
                    required: true,
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email"
                    }
                  })} placeholder="john@example.com" className={errors.email ? 'error' : ''} />
                </div>
              </div>

              <div className="auth-group">
                <label><Calendar size={16} /> Date of Birth</label>
                <div className="auth-input-container">
                  <input type="date" {...register("dob", { required: true })} className={errors.dob ? 'error' : ''} />
                </div>
              </div> 

              <div className="auth-row">
                <div className="auth-group">
                  <label><Lock size={16} /> Password</label>
                  <div className="auth-input-container">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      {...register("password", { required: true, minLength: { value: 6, message: "Min 6 chars" } })} 
                      className={errors.password ? 'error' : ''}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-group">
                  <label><Lock size={16} /> Confirm</label>
                  <div className="auth-input-container">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      {...register("confirmPassword", { 
                        required: true,
                        validate: (value) => value === password || "Match fail"
                      })} 
                      className={errors.confirmPassword ? 'error' : ''}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-toggle">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-main btn-primary-gradient auth-submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Initialize Account'}
              </button>

              <footer className="auth-footer">
                <span>Already a member?</span>
                <button type="button" onClick={() => navigate('/login')} className="auth-link">
                  Login to your account
                </button>
              </footer>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;