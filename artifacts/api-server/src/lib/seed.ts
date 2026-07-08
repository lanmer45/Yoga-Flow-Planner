import { db, posesTable, tagLabelsTable, routinesTable, type RoutineSections } from "@workspace/db";
import { logger } from "./logger";

type SeedPose = {
  name: string;
  category: string;
  defaultDurationSeconds: number;
  durationType: "time" | "breaths";
  defaultBreaths: number | null;
  perSide: boolean;
  cue: string;
  cautions: string[];
  modification: string;
  chairOption: string;
};

// For per-side poses, defaultDurationSeconds is the TOTAL for both sides.
const poses: SeedPose[] = [
  {
    name: "Centering & Intention",
    category: "Centering",
    defaultDurationSeconds: 120,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Comfortable seated position, sit tall, lengthen through the crown. Roll the shoulders up, back, and down. One hand to the chest, one to the belly. Inhale deeply, exhale slowly. Set an intention for your practice or your day.",
    cautions: [],
    modification: "Sit on a cushion to lift the hips, or sit in a chair.",
    chairOption: "Sit toward the front of the chair, both feet flat, hands resting in the lap.",
  },
  {
    name: "Neck Release",
    category: "Warm-Up",
    defaultDurationSeconds: 90,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "Gently drop the right ear toward the right shoulder, breathe, then switch. Move slowly, never force the neck.",
    cautions: ["Neck"],
    modification: "Keep the movement small; use a hand for light support, not pulling.",
    chairOption: "Same movement, seated tall in the chair.",
  },
  {
    name: "Shoulder Cross Stretch",
    category: "Warm-Up",
    defaultDurationSeconds: 60,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "Bring one arm across the front of the body, use the other arm to gently draw it closer, opening the shoulder.",
    cautions: ["Shoulders"],
    modification: "Lessen the pull; keep the shoulder relaxed down.",
    chairOption: "Same, seated.",
  },
  {
    name: "Chest Opener",
    category: "Warm-Up",
    defaultDurationSeconds: 30,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Reach both arms straight behind you and clasp the hands, lifting gently to open the chest.",
    cautions: ["Shoulders"],
    modification: "Hold a strap or towel between the hands if the clasp is tight.",
    chairOption: "Same, seated tall, clasp behind the chair back.",
  },
  {
    name: "Standing Side Bend",
    category: "Warm-Up",
    defaultDurationSeconds: 60,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "Reach both arms up and over to one side, lengthening the whole side body. Breathe into the stretch, then switch.",
    cautions: ["Back"],
    modification: "Keep the reach small; hand on the hip for support.",
    chairOption: "Same, seated, reaching up and over.",
  },
  {
    name: "Calf Stretch at Wall",
    category: "Warm-Up",
    defaultDurationSeconds: 60,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "Hands on a wall, step one foot back, press the heel toward the floor to stretch the calf. Switch sides.",
    cautions: [],
    modification: "Smaller step back for a gentler stretch.",
    chairOption: "Seated, extend one leg and flex the foot toward you.",
  },
  {
    name: "Windshield Wipers",
    category: "Warm-Up",
    defaultDurationSeconds: 45,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Hands behind you, feet flat, knees bent. Drop both knees to the right, then to the left, wipering side to side to loosen the hips and low back.",
    cautions: ["Knees", "Back"],
    modification: "Smaller range of motion.",
    chairOption: "Seated, gently sway the knees side to side.",
  },
  {
    name: "Seated Figure-Four Side Bend (Around the World)",
    category: "Warm-Up",
    defaultDurationSeconds: 90,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "Cross one shin in front, hug the same-side arm over the other, lean toward the crossed side, then circle the torso forward and around three times. Switch.",
    cautions: ["Hips", "Back"],
    modification: "Keep circles small and slow.",
    chairOption: "Seated figure-four: cross one ankle over the opposite thigh and lean forward gently.",
  },
  {
    name: "Cat / Cow",
    category: "Warm-Up",
    defaultDurationSeconds: 90,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "In tabletop, inhale to lift the chest and arch (Cow), exhale to round the spine and tuck the chin (Cat). Flow with the breath to warm the spine. An extended version leans the hips forward on the inhale and back on the exhale.",
    cautions: ["Wrists", "Knees"],
    modification: "Slow the movement and keep the range small; pad the knees.",
    chairOption: "Hands on thighs, move the spine forward and back while seated.",
  },
  {
    name: "Child's Pose",
    category: "Floor",
    defaultDurationSeconds: 90,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Big toes together, knees wide, sit back toward the heels and reach forward, forehead resting down. Always a place you can return to.",
    cautions: ["Knees"],
    modification: "Widen the knees, cushion under hips or forehead.",
    chairOption: "Fold forward slightly while seated, forearms on thighs or a desk, head relaxed.",
  },
  {
    name: "Downward Facing Dog",
    category: "Standing",
    defaultDurationSeconds: 40,
    durationType: "breaths",
    defaultBreaths: 6,
    perSide: false,
    cue: "Tuck the toes, lift the hips, make the spine long. Pedal the heels. Bend the knees as much as needed, don't force the heels down.",
    cautions: ["Wrists", "Shoulders"],
    modification: "Bend the knees generously; rest in Child's Pose anytime.",
    chairOption: "Hands on a wall, desk, or chair back, walk the feet back for a standing stretch.",
  },
  {
    name: "High Lunge",
    category: "Standing",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 4,
    perSide: true,
    cue: "Step one foot forward, back leg strong and reaching, arms can lift overhead. Chest open. Strong, not strained.",
    cautions: ["Knees", "Balance"],
    modification: "Lower the back knee down for support; hands on the front thigh.",
    chairOption: "Stand behind a chair, step one foot back into a supported lunge holding the chair.",
  },
  {
    name: "Warrior I",
    category: "Standing",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: true,
    cue: "Front knee bent, back heel down and angled, hips facing forward, arms reaching up. Ground through both feet.",
    cautions: ["Knees", "Balance", "Shoulders"],
    modification: "Shorten the stance; hands on the hips instead of overhead.",
    chairOption: "Seated tall, lift the arms overhead; or use the chair for balance.",
  },
  {
    name: "Warrior II",
    category: "Standing",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: true,
    cue: "Front knee bends over the ankle, spin the back heel down, arms open to a T, gaze softly over the front hand. Strong and calm at once.",
    cautions: ["Knees", "Hips", "Balance"],
    modification: "Shorten the stance, bend the front knee less.",
    chairOption: "Use the chair for balance, or practice the arm shape seated.",
  },
  {
    name: "Triangle",
    category: "Standing",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: true,
    cue: "Straighten the front leg, reach forward and lower the front hand to the shin or a block, top arm reaching up, chest open.",
    cautions: ["Back", "Hips", "Balance"],
    modification: "Rest the bottom hand higher up, on the thigh or a block; keep a soft bend in the front knee.",
    chairOption: "Seated, one arm reaches down the side, the other arm reaches up and over.",
  },
  {
    name: "Assisted Lizard with Twist",
    category: "Standing",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: true,
    cue: "From a lunge, walk the front foot wide, lower the hands (or forearms to a block) inside the front foot, then gently open into a twist reaching one arm up.",
    cautions: ["Hips", "Knees", "Wrists"],
    modification: "Stay higher on the hands; lower the back knee; skip the twist.",
    chairOption: "Seated figure-four with a gentle seated twist toward the bent knee.",
  },
  {
    name: "Standing Forward Bend",
    category: "Standing",
    defaultDurationSeconds: 40,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: false,
    cue: "Feet to the top of the mat, fold forward, head and arms hanging heavy, knees soft. Let the back of the body soften. Swan-dive down, and roll up one vertebra at a time to finish.",
    cautions: ["Back", "Balance"],
    modification: "Keep a deep bend in the knees; hands on blocks or a chair.",
    chairOption: "Fold forward while seated, or rest hands on a desk or chair seat.",
  },
  {
    name: "Cobra / Upward Dog",
    category: "Backbend",
    defaultDurationSeconds: 45,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Lie on the belly, hands under the shoulders, tops of the feet pressing down. Inhale to lift the chest gently, elbows close, shoulders away from the ears. Exhale to lower. Use the back, not just the arms.",
    cautions: ["Back", "Wrists"],
    modification: "Lift only a little; keep it small and led by the back muscles.",
    chairOption: "Seated tall, hands behind the head or on the chair sides, lift the chest into a gentle seated backbend.",
  },
  {
    name: "Half Lord of the Fishes (Seated Twist)",
    category: "Twist",
    defaultDurationSeconds: 60,
    durationType: "breaths",
    defaultBreaths: 5,
    perSide: true,
    cue: "Sit tall first, one leg bent or crossed over. Inhale to lengthen, exhale to twist toward the bent knee. Twist from the upper back, don't force the neck.",
    cautions: ["Back", "Neck"],
    modification: "Keep the bottom leg straight, gentle twist.",
    chairOption: "Seated, twist gently toward the chair back.",
  },
  {
    name: "90/90 Hip Stretch",
    category: "Hip",
    defaultDurationSeconds: 180,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "One leg bent in front (shin parallel to the mat edge), the other bent behind at about 90 degrees. Sit tall, or lean forward gently over the front leg to open the hip.",
    cautions: ["Knees", "Hips"],
    modification: "Sit up on a cushion and stay upright rather than leaning.",
    chairOption: "Cross one ankle over the opposite thigh for a seated figure-four.",
  },
  {
    name: "Supine Spinal Twist",
    category: "Floor",
    defaultDurationSeconds: 180,
    durationType: "time",
    defaultBreaths: null,
    perSide: true,
    cue: "On the back, draw one knee in and drop it across the body, opposite arm extended, gaze away from the twist. Shoulders soft, belly and jaw relaxed.",
    cautions: ["Back"],
    modification: "Cushion between or under the knees; keep the twist small.",
    chairOption: "Seated tall, rotate gently side to side.",
  },
  {
    name: "Corpse Pose (Shavasana)",
    category: "Rest",
    defaultDurationSeconds: 240,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Lie flat, arms by the sides, palms up. Let the breath return to normal. Soften the feet, legs, hips, back, shoulders, hands, and face. Just rest and let the body integrate the practice.",
    cautions: [],
    modification: "Bend the knees with feet flat, or a cushion under the knees to ease the low back.",
    chairOption: "Sit comfortably, both feet on the floor, hands resting in the lap.",
  },
  {
    name: "Gratitude Close / Namaste",
    category: "Closing",
    defaultDurationSeconds: 60,
    durationType: "time",
    defaultBreaths: null,
    perSide: false,
    cue: "Return to a comfortable seat, palms together at the heart. A few deep breaths. Inhale gratitude, exhale stress. Notice how you feel now compared to the start. Thank you for taking this time. Namaste.",
    cautions: [],
    modification: "Any comfortable seated or lying position.",
    chairOption: "Seated in the chair, palms together at the heart.",
  },
];

const tags = [
  "Full Body",
  "Lower Body",
  "Upper Body",
  "Hips",
  "Relaxation",
  "Retrospection",
  "Quick Reset",
  "Chair-Friendly",
  "Energizing",
  "Gentle",
];

export async function ensureSeeded(): Promise<void> {
  const existing = await db.select({ id: posesTable.id }).from(posesTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  const inserted = await db.insert(posesTable).values(poses).returning();
  const id = new Map(inserted.map((p) => [p.name, p.id]));

  await db.insert(tagLabelsTable).values(tags.map((name) => ({ name, isCustom: false }))).onConflictDoNothing();

  const e = (name: string, durationSeconds: number, breaths: number | null = null) => {
    const poseId = id.get(name);
    if (!poseId) throw new Error(`Unknown pose: ${name}`);
    return { poseId, durationSeconds, breaths };
  };

  const routines: { title: string; description: string; tags: string[]; sections: RoutineSections }[] = [
    {
      title: "Ground, Energize, Release (Full)",
      description:
        "Beginner-friendly full-body reset, around 40 minutes. The goal isn't perfect poses, it's to breathe, move, and reset.",
      tags: ["Full Body", "Gentle"],
      sections: {
        centering: [e("Centering & Intention", 120)],
        flow: [
          e("Cat / Cow", 90),
          e("Child's Pose", 90),
          e("Downward Facing Dog", 40, 6),
          e("High Lunge", 60, 4),
          e("Warrior II", 60, 5),
          e("Standing Forward Bend", 40, 5),
          e("Cobra / Upward Dog", 45),
          e("Half Lord of the Fishes (Seated Twist)", 60, 5),
          e("90/90 Hip Stretch", 180),
          e("Supine Spinal Twist", 180),
        ],
        closing: [e("Corpse Pose (Shavasana)", 240), e("Gratitude Close / Namaste", 60)],
      },
    },
    {
      title: "Quick Reset (Chair-Friendly)",
      description:
        "A shorter, gentler sequence, easy to do from a chair. Good for a mid-day break.",
      tags: ["Quick Reset", "Chair-Friendly", "Gentle", "Relaxation"],
      sections: {
        centering: [e("Centering & Intention", 60)],
        flow: [
          e("Neck Release", 90),
          e("Shoulder Cross Stretch", 60),
          e("Cat / Cow", 60),
          e("Half Lord of the Fishes (Seated Twist)", 50, 4),
          e("Standing Forward Bend", 40, 5),
          e("Supine Spinal Twist", 120),
        ],
        closing: [e("Corpse Pose (Shavasana)", 120), e("Gratitude Close / Namaste", 60)],
      },
    },
    {
      title: "Standing Strong (Energizing)",
      description:
        "A more active standing sequence to wake the body up. Still beginner-friendly.",
      tags: ["Full Body", "Lower Body", "Energizing"],
      sections: {
        centering: [e("Centering & Intention", 60)],
        flow: [
          e("Standing Side Bend", 60),
          e("Cat / Cow", 60),
          e("Downward Facing Dog", 40, 6),
          e("High Lunge", 60, 4),
          e("Warrior I", 60, 5),
          e("Warrior II", 60, 5),
          e("Triangle", 60, 5),
          e("Assisted Lizard with Twist", 60, 5),
          e("Standing Forward Bend", 40, 5),
          e("Supine Spinal Twist", 180),
        ],
        closing: [e("Corpse Pose (Shavasana)", 180), e("Gratitude Close / Namaste", 60)],
      },
    },
  ];

  await db.insert(routinesTable).values(routines);

  logger.info(
    { poses: inserted.length, tags: tags.length, routines: routines.length },
    "Seeded initial Flow Planner data",
  );
}
