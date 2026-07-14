import { getLocales } from 'expo-localization';

const locale = getLocales()[0]?.languageCode ?? 'en';
export const isSpanish = locale === 'es';

const strings = {
  en: {
    // Onboarding
    skip: 'Skip',
    next: 'NEXT',
    letsGo: "LET'S GO 🤙",
    slide1Title: 'Find Your Spots',
    slide1Body: 'SpotKing maps every skatepark, street spot, surf break, and surf-skate zone near you. Tap any pin to see what the community has found.',
    slide2Title: 'Undiscovered Spots',
    slide2Body: 'Locked pins are spots no one has claimed yet. Find them in real life, add them to the map, and post the first photo to become King.',
    slide3Title: 'Heat Level System',
    slide3Body: 'Every spot has a 1–5 siren heat rating — how heavy is the authority presence? Know before you show up.',
    slide4Title: 'Battle for the Crown',
    slide4Body: 'Upload photos and videos to any spot. The community votes. The person with the most votes becomes King or Queen. Hold your crown or lose it.',
    slide5Title: 'Add Your Spots',
    slide5Body: 'Know a hidden ledge or a perfect wave? Drop a pin, tag it as Skate, Surf, or Surfskate, and set the heat level. Be the first to claim your local scene.',
    // Explore
    searchPlaceholder: 'Search spots...',
    undiscovered: 'UNDISCOVERED',
    claimedCount: (n) => `${n} claimed`,
    undiscoveredCount: (n) => `${n} to discover`,
    claimThisSpot: 'Claim This Spot 👑',
    illPass: "I'll pass 🤙",
    unclaimedTerritory: '👑 Unclaimed Territory',
    unclaimedBody: 'No one has claimed this spot yet. Be the first to add it to SpotKing and compete for the crown.',
    // Spot detail
    heatLevel: 'HEAT LEVEL',
    photos: 'PHOTOS',
    addPhoto: '+ ADD PHOTO',
    noPhotos: 'No photos yet. Be the first to drop one.',
    uploadHint: '📱 Upload from your camera roll — no need to be at the spot',
    reviews: 'REVIEWS',
    submitReview: 'POST REVIEW',
    streetViewLabel: '📍 Google Street View',
    allClear: '✅ All clear — skate/surf freely',
    occasionalPatrols: '👀 Occasional patrols — stay sharp',
    regularSecurity: '⚠️ Regular security presence',
    highRisk: '🔥 High risk — be quick',
    dangerZone: '🚔 Danger zone — cops always here',
    // Pro
    proRequired: 'Pro Required',
    proUploadMsg: 'Upgrade to Pro to compete for King/Queen and appear on the leaderboard.',
    upgrade: 'Upgrade',
    maybeLater: 'Maybe Later',
  },
  es: {
    // Onboarding
    skip: 'Saltar',
    next: 'SIGUIENTE',
    letsGo: 'VAMOS 🤙',
    slide1Title: 'Encontrá tus spots',
    slide1Body: 'SpotKing mapea cada skatepark, spot callejero, ola y zona de surf-skate cerca tuyo. Tocá cualquier pin para ver lo que encontró la comunidad.',
    slide2Title: 'Spots sin descubrir',
    slide2Body: 'Los pines bloqueados son spots que nadie reclamó todavía. Encontráslos, agregalos al mapa y posteá la primera foto para convertirte en Rey.',
    slide3Title: 'Sistema de calor',
    slide3Body: 'Cada spot tiene un nivel de calor del 1 al 5 — ¿qué tan seguido hay policías o seguridad? Enterate antes de llegar.',
    slide4Title: 'La batalla por la corona',
    slide4Body: 'Subí fotos y videos a cualquier spot. La comunidad vota. Quien tenga más votos se convierte en Rey o Reina. Defendé tu corona o perdela.',
    slide5Title: 'Agregá tus spots',
    slide5Body: '¿Conocés un borde escondido o una ola perfecta? Tirá un pin, etiquetalo como Skate, Surf o Surfskate, y seteá el nivel de calor. Sé el primero en reclamar tu zona.',
    // Explore
    searchPlaceholder: 'Buscar spots...',
    undiscovered: 'SIN DESCUBRIR',
    claimedCount: (n) => `${n} reclamados`,
    undiscoveredCount: (n) => `${n} por descubrir`,
    claimThisSpot: 'Reclamar este spot 👑',
    illPass: 'Paso 🤙',
    unclaimedTerritory: '👑 Territorio sin reclamar',
    unclaimedBody: 'Nadie reclamó este spot todavía. Sé el primero en agregarlo a SpotKing y competí por la corona.',
    // Spot detail
    heatLevel: 'NIVEL DE CALOR',
    photos: 'FOTOS',
    addPhoto: '+ AGREGAR FOTO',
    noPhotos: 'Sin fotos todavía. Sé el primero en subir una.',
    uploadHint: '📱 Subí desde tu galería — no hace falta estar en el spot',
    reviews: 'RESEÑAS',
    submitReview: 'PUBLICAR RESEÑA',
    streetViewLabel: '📍 Google Street View',
    allClear: '✅ Todo despejado — skateá/surfeá tranquilo',
    occasionalPatrols: '👀 Patrullas ocasionales — ojo',
    regularSecurity: '⚠️ Seguridad frecuente',
    highRisk: '🔥 Alto riesgo — rápido',
    dangerZone: '🚔 Zona de peligro — siempre hay policías',
    // Pro
    proRequired: 'Se requiere Pro',
    proUploadMsg: 'Actualizá a Pro para competir por el título de Rey/Reina y aparecer en el ranking.',
    upgrade: 'Actualizar',
    maybeLater: 'Quizás después',
  },
};

export function t(key, ...args) {
  const lang = isSpanish ? 'es' : 'en';
  const val = strings[lang][key] ?? strings['en'][key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
