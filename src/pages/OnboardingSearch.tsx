import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, MapPin, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import './OnboardingSearch.css';

export function OnboardingSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ placeId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/.netlify/functions/get-place-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue');
        return;
      }
      setResult(data);
    } catch {
      setError('Erreur réseau — vérifiez votre connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <button className="onboarding-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>

        <div className="onboarding-icon">
          <MapPin size={28} />
        </div>
        <h1 className="onboarding-title">{t('onboarding_title', 'Trouver votre établissement')}</h1>
        <p className="onboarding-subtitle">
          {t('onboarding_desc', 'Entrez le nom et la ville de votre restaurant pour récupérer son identifiant Google Place.')}
        </p>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="onboarding-field">
            <label>{t('onboarding_name', 'Nom du restaurant')}</label>
            <input
              type="text"
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              placeholder="Ex: Le Petit Bouchon"
              required
              disabled={loading}
            />
          </div>

          <div className="onboarding-field">
            <label>{t('onboarding_city', 'Ville')}</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Ex: Marrakech"
              required
              disabled={loading}
            />
          </div>

          <button className="onboarding-submit" type="submit" disabled={loading || !restaurantName || !city}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? t('onboarding_searching', 'Recherche…') : t('onboarding_search', 'Chercher')}
          </button>
        </form>

        {result && (
          <div className="onboarding-result success">
            <CheckCircle size={20} />
            <div>
              <strong>{t('onboarding_found', 'Place ID trouvé')}</strong>
              <code>{result.placeId}</code>
            </div>
          </div>
        )}

        {error && (
          <div className="onboarding-result error">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
