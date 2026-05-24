export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Clé API Google Maps non configurée' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { restaurantName, city, country } = body;
  if (!restaurantName) {
    return new Response(JSON.stringify({ error: 'Champ restaurantName requis' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parts = [restaurantName, city, country].filter(Boolean);
  const textQuery = parts.join(' ');

  const googleRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({ textQuery }),
  });

  const data = await googleRes.json();

  if (!data.places || data.places.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucun lieu trouvé' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ placeId: data.places[0].id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
