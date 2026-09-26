// Lifts offered in the exercise picker, grouped by muscle group.
// Aliases are extra search terms: abbreviations and alternate names.
const COMMON_LIFTS = [
  {
    label: 'Chest',
    lifts: [
      { name: 'Bench Press', aliases: ['bp', 'flat bench', 'barbell bench'] },
      { name: 'Incline Bench Press' },
      { name: 'Decline Bench Press' },
      { name: 'Dumbbell Bench Press', aliases: ['db bench'] },
      { name: 'Incline Dumbbell Press', aliases: ['db incline'] },
      { name: 'Machine Chest Press' },
      { name: 'Chest Fly', aliases: ['pec fly', 'flye', 'pec deck'] },
      { name: 'Cable Crossover', aliases: ['cable fly'] },
      { name: 'Push-Up' },
      { name: 'Dip' },
    ],
  },
  {
    label: 'Back',
    lifts: [
      { name: 'Deadlift', aliases: ['dl', 'conventional'] },
      { name: 'Sumo Deadlift' },
      { name: 'Trap Bar Deadlift', aliases: ['hex bar'] },
      { name: 'Barbell Row', aliases: ['bent over row', 'bb row'] },
      { name: 'Dumbbell Row', aliases: ['db row', 'one arm row'] },
      { name: 'Pendlay Row' },
      { name: 'T-Bar Row' },
      { name: 'Seated Cable Row', aliases: ['cable row'] },
      { name: 'Lat Pulldown', aliases: ['pulldown'] },
      { name: 'Pull-Up' },
      { name: 'Chin-Up' },
      { name: 'Face Pull' },
    ],
  },
  {
    label: 'Legs',
    lifts: [
      { name: 'Squat', aliases: ['back squat'] },
      { name: 'Front Squat' },
      { name: 'Goblet Squat' },
      { name: 'Hack Squat' },
      { name: 'Leg Press' },
      { name: 'Romanian Deadlift', aliases: ['rdl', 'stiff leg'] },
      { name: 'Bulgarian Split Squat', aliases: ['bss', 'split squat'] },
      { name: 'Lunge', aliases: ['walking lunge'] },
      { name: 'Hip Thrust', aliases: ['glute bridge'] },
      { name: 'Leg Extension', aliases: ['quad extension'] },
      { name: 'Leg Curl', aliases: ['hamstring curl'] },
      { name: 'Calf Raise', aliases: ['calves'] },
    ],
  },
  {
    label: 'Shoulders',
    lifts: [
      { name: 'Overhead Press', aliases: ['ohp', 'military press', 'shoulder press'] },
      { name: 'Dumbbell Shoulder Press', aliases: ['db press', 'db ohp'] },
      { name: 'Arnold Press' },
      { name: 'Lateral Raise', aliases: ['side raise', 'side lateral'] },
      { name: 'Rear Delt Fly', aliases: ['reverse fly'] },
      { name: 'Upright Row' },
      { name: 'Shrug', aliases: ['traps'] },
    ],
  },
  {
    label: 'Arms',
    lifts: [
      { name: 'Barbell Curl', aliases: ['bicep curl', 'bb curl'] },
      { name: 'Dumbbell Curl', aliases: ['bicep curl', 'db curl'] },
      { name: 'Hammer Curl' },
      { name: 'Preacher Curl' },
      { name: 'Tricep Pushdown', aliases: ['pushdown', 'triceps'] },
      { name: 'Skull Crusher', aliases: ['lying tricep extension', 'triceps'] },
      { name: 'Overhead Tricep Extension', aliases: ['triceps'] },
      { name: 'Close-Grip Bench Press', aliases: ['cgbp'] },
    ],
  },
  {
    label: 'Core',
    lifts: [
      { name: 'Hanging Leg Raise', aliases: ['leg raise'] },
      { name: 'Cable Crunch', aliases: ['crunch', 'abs'] },
      { name: 'Ab Wheel Rollout', aliases: ['ab wheel', 'abs'] },
      { name: 'Russian Twist', aliases: ['abs'] },
    ],
  },
];

export default COMMON_LIFTS;
