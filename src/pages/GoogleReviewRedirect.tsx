import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function GoogleReviewRedirect() {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  useEffect(() => {
    const TEST_PLACE_ID = 'ChIJr8E2CJK3sw0R6xzRrlNWF64';
    const placeId = TEST_PLACE_ID;
    window.location.replace(`https://search.google.com/local/writereview?placeid=${placeId}`);
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
      <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Redirection vers Google&nbsp;Maps…</p>
    </div>
  );
}
