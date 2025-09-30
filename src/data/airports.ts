// Major international airports with IATA codes and coordinates for distance calculation
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export const airports: Airport[] = [
  // Kenya
  { code: "NBO", name: "Jomo Kenyatta International", city: "Nairobi", country: "Kenya", lat: -1.3192, lon: 36.9278 },
  { code: "MBA", name: "Moi International Airport", city: "Mombasa", country: "Kenya", lat: -4.0348, lon: 39.5942 },
  
  // Europe
  { code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", lat: 51.4700, lon: -0.4543 },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lon: 2.5479 },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", lat: 50.0379, lon: 8.5622 },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lon: 4.7683 },
  { code: "MAD", name: "Adolfo Suárez Madrid–Barajas", city: "Madrid", country: "Spain", lat: 40.4983, lon: -3.5676 },
  { code: "FCO", name: "Leonardo da Vinci–Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lon: 12.2389 },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", lat: 41.2753, lon: 28.7519 },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", lat: 47.4647, lon: 8.5492 },
  
  // North America
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA", lat: 40.6413, lon: -73.7781 },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA", lat: 33.9416, lon: -118.4085 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA", lat: 41.9742, lon: -87.9073 },
  { code: "MIA", name: "Miami International", city: "Miami", country: "USA", lat: 25.7959, lon: -80.2870 },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA", lat: 37.6213, lon: -122.3790 },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", lat: 43.6777, lon: -79.6248 },
  
  // Middle East
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE", lat: 25.2532, lon: 55.3657 },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", lat: 25.2731, lon: 51.6080 },
  { code: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt", lat: 30.1127, lon: 31.4000 },
  
  // Asia
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", lat: 13.6900, lon: 100.7501 },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lon: 103.9915 },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", lat: 22.3080, lon: 113.9185 },
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "India", lat: 28.5562, lon: 77.1000 },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", country: "India", lat: 19.0896, lon: 72.8656 },
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", lat: 35.7720, lon: 140.3929 },
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea", lat: 37.4602, lon: 126.4407 },
  { code: "PEK", name: "Beijing Capital International", city: "Beijing", country: "China", lat: 40.0801, lon: 116.5846 },
  
  // Africa
  { code: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "South Africa", lat: -26.1367, lon: 28.2411 },
  { code: "CPT", name: "Cape Town International", city: "Cape Town", country: "South Africa", lat: -33.9690, lon: 18.6021 },
  { code: "ADD", name: "Addis Ababa Bole International", city: "Addis Ababa", country: "Ethiopia", lat: 8.9779, lon: 38.7992 },
  { code: "LOS", name: "Murtala Muhammed International", city: "Lagos", country: "Nigeria", lat: 6.5774, lon: 3.3212 },
  
  // Oceania
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9399, lon: 151.1753 },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia", lat: -37.6733, lon: 144.8433 },
  { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand", lat: -37.0082, lon: 174.7850 },
];

// Calculate distance between two airports using Haversine formula
export const calculateDistance = (from: Airport, to: Airport): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};
