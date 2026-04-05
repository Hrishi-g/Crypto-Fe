import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import './UserDashboard.css';

const UserDashboard = ({ user }: { user: any }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/get-secure-image', {
          credentials: 'include' // Needed to send cookies with fetch
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setImages(data);
      } catch (err) {
        console.error('Failed to fetch images', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  return (
    <div className="album-layout">
      <div className="album-banner">
        <h1>Hello, {user.firstName || user.username}! ✨</h1>
        <p>Welcome to our beautiful memories</p>
      </div>

      <div className="album-section">
        <div className="section-header">
          <Heart className="icon-inline" size={28} color="#ffffff" fill="#ffffff" />
          <h2>Our Photo Album</h2>
        </div>
        
        {loading ? (
          <div className="loading-state">Loading your gallery...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : images.length > 0 ? (
          <div className="photo-grid">
            {images.map((url, index) => (
              <div 
                key={index} 
                className="photo-card" 
                onClick={() => setSelectedImage(url)}
                role="button"
                tabIndex={0}
              >
                <img src={url} alt={`Memory ${index + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No images in your album yet.</div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedImage(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close image">
            <X size={32} />
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Expanded view" className="lightbox-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;