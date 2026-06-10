export interface ParamConfig {
  name: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}

export interface Topic {
  id: string
  title: string
  titlebn: string
  description: string
  icon: string
  chapter: number
  parameters: ParamConfig[]
}

export const topics: Topic[] = [
  {
    id: 'newton-laws',
    title: "Newton's Laws of Motion",
    titlebn: 'নিউটনের গতির সূত্র',
    description: 'Explore the three fundamental laws of motion with interactive 3D blocks, forces, and friction.',
    icon: 'Move',
    chapter: 3,
    parameters: [
      { name: 'mass', label: 'Mass (kg)', min: 1, max: 20, step: 0.5, defaultValue: 5 },
      { name: 'force', label: 'Applied Force (N)', min: 0, max: 100, step: 1, defaultValue: 25 },
      { name: 'friction', label: 'Friction Coefficient', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
    ],
  },
  {
    id: 'projectile-motion',
    title: 'Projectile Motion',
    titlebn: 'প্রাসের গতি',
    description: 'Launch a projectile and observe its parabolic trajectory with adjustable angle and velocity.',
    icon: 'ArrowUpRight',
    chapter: 3,
    parameters: [
      { name: 'angle', label: 'Launch Angle (°)', min: 0, max: 90, step: 1, defaultValue: 45 },
      { name: 'velocity', label: 'Initial Velocity (m/s)', min: 1, max: 50, step: 1, defaultValue: 20 },
      { name: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, step: 0.5, defaultValue: 9.8 },
    ],
  },
  {
    id: 'circular-motion',
    title: 'Circular Motion',
    titlebn: 'বৃত্তীয় গতি',
    description: 'Observe centripetal force and velocity vectors for an object in circular orbit.',
    icon: 'RotateCw',
    chapter: 3,
    parameters: [
      { name: 'radius', label: 'Radius (m)', min: 1, max: 10, step: 0.5, defaultValue: 4 },
      { name: 'angularVelocity', label: 'Angular Velocity (rad/s)', min: 0.1, max: 5, step: 0.1, defaultValue: 1.5 },
      { name: 'mass', label: 'Mass (kg)', min: 0.5, max: 10, step: 0.5, defaultValue: 2 },
    ],
  },
  {
    id: 'work-energy',
    title: 'Work, Energy & Power',
    titlebn: 'কাজ, শক্তি ও ক্ষমতা',
    description: 'Push a block up an incline and observe energy transformations in real-time.',
    icon: 'Zap',
    chapter: 4,
    parameters: [
      { name: 'angle', label: 'Incline Angle (°)', min: 10, max: 60, step: 1, defaultValue: 30 },
      { name: 'force', label: 'Applied Force (N)', min: 0, max: 100, step: 1, defaultValue: 40 },
      { name: 'mass', label: 'Mass (kg)', min: 1, max: 20, step: 0.5, defaultValue: 5 },
    ],
  },
  {
    id: 'momentum',
    title: 'Linear Momentum & Collision',
    titlebn: 'রৈখিক ভরবেগ ও সংঘর্ষ',
    description: 'Simulate elastic and inelastic collisions with momentum conservation.',
    icon: 'GitCompare',
    chapter: 4,
    parameters: [
      { name: 'mass1', label: 'Ball 1 Mass (kg)', min: 1, max: 20, step: 0.5, defaultValue: 5 },
      { name: 'mass2', label: 'Ball 2 Mass (kg)', min: 1, max: 20, step: 0.5, defaultValue: 3 },
      { name: 'velocity1', label: 'Ball 1 Velocity (m/s)', min: -15, max: 15, step: 0.5, defaultValue: 8 },
      { name: 'velocity2', label: 'Ball 2 Velocity (m/s)', min: -15, max: 15, step: 0.5, defaultValue: -4 },
      { name: 'elastic', label: 'Elastic (0=Inelastic)', min: 0, max: 1, step: 1, defaultValue: 1 },
    ],
  },
  {
    id: 'gravitation',
    title: 'Gravitational Force',
    titlebn: 'মহাকর্ষীয় বল',
    description: 'Visualize gravitational attraction between two bodies with adjustable masses and distance.',
    icon: 'Globe',
    chapter: 5,
    parameters: [
      { name: 'mass1', label: 'Body 1 Mass (×10¹² kg)', min: 1, max: 50, step: 1, defaultValue: 20 },
      { name: 'mass2', label: 'Body 2 Mass (×10¹² kg)', min: 1, max: 50, step: 1, defaultValue: 10 },
      { name: 'distance', label: 'Distance (m)', min: 2, max: 15, step: 0.5, defaultValue: 8 },
    ],
  },
  {
    id: 'elasticity',
    title: 'Elasticity',
    titlebn: 'স্থিতিস্থাপকতা',
    description: 'Explore Hooke\'s law with springs, observing oscillation and force-extension relationships.',
    icon: 'Activity',
    chapter: 5,
    parameters: [
      { name: 'springConstant', label: 'Spring Constant (N/m)', min: 5, max: 100, step: 5, defaultValue: 30 },
      { name: 'mass', label: 'Hanging Mass (kg)', min: 0.5, max: 10, step: 0.5, defaultValue: 3 },
      { name: 'displacement', label: 'Initial Displacement (m)', min: 0.1, max: 3, step: 0.1, defaultValue: 1.5 },
    ],
  },
  {
    id: 'waves',
    title: 'Waves & Oscillations',
    titlebn: 'তরঙ্গ ও দোলন',
    description: 'Visualize transverse wave properties including wavelength, amplitude, and frequency.',
    icon: 'Waves',
    chapter: 6,
    parameters: [
      { name: 'amplitude', label: 'Amplitude (m)', min: 0.1, max: 3, step: 0.1, defaultValue: 1.5 },
      { name: 'wavelength', label: 'Wavelength (m)', min: 1, max: 8, step: 0.5, defaultValue: 3 },
      { name: 'frequency', label: 'Frequency (Hz)', min: 0.1, max: 3, step: 0.1, defaultValue: 0.8 },
    ],
  },
  {
    id: 'sound-waves',
    title: 'Sound Waves',
    titlebn: 'শব্দ তরঙ্গ',
    description: 'See how longitudinal sound waves create compressions and rarefactions.',
    icon: 'Speaker',
    chapter: 6,
    parameters: [
      { name: 'frequency', label: 'Frequency (Hz)', min: 0.5, max: 5, step: 0.1, defaultValue: 2 },
      { name: 'amplitude', label: 'Amplitude', min: 0.1, max: 2, step: 0.1, defaultValue: 1 },
    ],
  },
  {
    id: 'light-reflection',
    title: 'Light & Reflection',
    titlebn: 'আলো ও প্রতিফলন',
    description: 'Explore the law of reflection with adjustable angles on a flat mirror.',
    icon: 'Mirror',
    chapter: 7,
    parameters: [
      { name: 'incidentAngle', label: 'Angle of Incidence (°)', min: 0, max: 85, step: 1, defaultValue: 45 },
      { name: 'rayCount', label: 'Number of Rays', min: 1, max: 5, step: 1, defaultValue: 3 },
    ],
  },
  {
    id: 'refraction',
    title: 'Refraction of Light',
    titlebn: 'আলোর প্রতিসরণ',
    description: 'Observe light bending through a glass slab and explore Snell\'s law.',
    icon: 'Layers',
    chapter: 7,
    parameters: [
      { name: 'incidentAngle', label: 'Angle of Incidence (°)', min: 0, max: 89, step: 1, defaultValue: 30 },
      { name: 'refractiveIndex', label: 'Refractive Index', min: 1, max: 2.5, step: 0.01, defaultValue: 1.5 },
    ],
  },
  {
    id: 'optical-instruments',
    title: 'Optical Instruments',
    titlebn: 'আলোকীয় যন্ত্র',
    description: 'Build ray diagrams with a convex lens and explore image formation.',
    icon: 'Telescope',
    chapter: 7,
    parameters: [
      { name: 'objectDistance', label: 'Object Distance (cm)', min: 3, max: 20, step: 0.5, defaultValue: 8 },
      { name: 'focalLength', label: 'Focal Length (cm)', min: 1, max: 8, step: 0.5, defaultValue: 4 },
    ],
  },
  {
    id: 'electrostatics',
    title: 'Electrostatics',
    titlebn: 'তড়িৎস্থিরতা',
    description: 'Visualize electric field lines and Coulomb\'s law between charged spheres.',
    icon: 'Sparkles',
    chapter: 8,
    parameters: [
      { name: 'charge1', label: 'Charge 1 (μC)', min: -10, max: 10, step: 0.5, defaultValue: 5 },
      { name: 'charge2', label: 'Charge 2 (μC)', min: -10, max: 10, step: 0.5, defaultValue: -5 },
      { name: 'distance', label: 'Distance (m)', min: 2, max: 12, step: 0.5, defaultValue: 6 },
    ],
  },
  {
    id: 'ohms-law',
    title: 'Current Electricity & Ohm\'s Law',
    titlebn: 'তড়িৎ প্রবাহ ও ওহমের সূত্র',
    description: 'Build a simple circuit with animated current flow and verify V = IR.',
    icon: 'Plug',
    chapter: 8,
    parameters: [
      { name: 'voltage', label: 'Voltage (V)', min: 1, max: 24, step: 0.5, defaultValue: 12 },
      { name: 'resistance', label: 'Resistance (Ω)', min: 1, max: 100, step: 1, defaultValue: 10 },
    ],
  },
  {
    id: 'em-induction',
    title: 'Electromagnetic Induction',
    titlebn: 'তড়িচ্চুম্বকীয় আবেশ',
    description: 'Move a magnet through a coil and observe induced EMF and current.',
    icon: 'Magnet',
    chapter: 8,
    parameters: [
      { name: 'magnetSpeed', label: 'Magnet Speed (m/s)', min: 0.5, max: 5, step: 0.5, defaultValue: 2 },
      { name: 'coilTurns', label: 'Coil Turns', min: 10, max: 200, step: 10, defaultValue: 50 },
      { name: 'magnetStrength', label: 'Magnet Strength (T)', min: 0.1, max: 2, step: 0.1, defaultValue: 0.8 },
    ],
  },
  {
    id: 'radioactivity',
    title: 'Radioactivity',
    titlebn: 'তেজস্ক্রিয়তা',
    description: 'Observe radioactive decay with alpha, beta, and gamma particle emissions.',
    icon: 'Radiation',
    chapter: 9,
    parameters: [
      { name: 'halfLife', label: 'Half-life (s)', min: 2, max: 30, step: 1, defaultValue: 10 },
      { name: 'showAlpha', label: 'Alpha Particles', min: 0, max: 1, step: 1, defaultValue: 1 },
      { name: 'showBeta', label: 'Beta Particles', min: 0, max: 1, step: 1, defaultValue: 1 },
      { name: 'showGamma', label: 'Gamma Rays', min: 0, max: 1, step: 1, defaultValue: 1 },
    ],
  },
  {
    id: 'shm',
    title: 'Simple Harmonic Motion',
    titlebn: 'সরল স্পন্দনশীল গতি',
    description: 'Explore pendulum motion and spring-mass oscillation with displacement-time graphs.',
    icon: 'Clock',
    chapter: 9,
    parameters: [
      { name: 'amplitude', label: 'Amplitude (m)', min: 0.2, max: 3, step: 0.1, defaultValue: 1.5 },
      { name: 'mass', label: 'Mass (kg)', min: 0.5, max: 10, step: 0.5, defaultValue: 2 },
      { name: 'springConstant', label: 'Spring Constant (N/m)', min: 5, max: 80, step: 5, defaultValue: 20 },
    ],
  },
]

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id)
}

export function getTopicsByChapter(chapter: number): Topic[] {
  return topics.filter((t) => t.chapter === chapter)
}

export function getAllChapters(): number[] {
  return [...new Set(topics.map((t) => t.chapter))].sort()
}
