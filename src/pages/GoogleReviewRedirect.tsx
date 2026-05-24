import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DataStore } from '../dataStore';

export function GoogleReviewRedirect() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    const doRedirect = async () => {
      let placeId = 'ChIJr8E2CJK3sw0R6xzRrlNWF64';
      try {
        const profile = await DataStore.getProfile(restaurantId);
        if (profile?.googleReviewUrl) {
          const match = profile.googleReviewUrl.match(/[?&]placeid=([^&]+)/);
          if (match) placeId = match[1];
        }
      } catch {
        setError(true);
      }
      window.location.replace(`https://search.google.com/local/writereview?placeid=${placeId}`);
    };
    doRedirect();
  }, [restaurantId]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      background: '#0a0a0a',
      color: '#888',
    }}>
      <Loader2 size={32} className="animate-spin" style={{ color: '#E2B36B' }} />
      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>
        {error ? 'Erreur de redirection' : 'Redirection vers Google\u00a0Maps…'}
      </p>
    </div>
  );
}
