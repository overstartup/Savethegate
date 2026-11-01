// Words for the armory2 feature — see src/i18n.js.
// Armory rank abilities (src/systems/abilities.js): a name + short
// description per ability, plus the Armory/battle labels.
export const STR_ARMORY2 = {
  'ab.title': { en: 'ABILITIES', de: 'FÄHIGKEITEN', ar: 'القدرات', fa: 'توانایی‌ها' },
  'ab.newAbility': { en: 'NEW ABILITY: {name}', de: 'NEUE FÄHIGKEIT: {name}', ar: 'قدرة جديدة: {name}', fa: 'توانایی جدید: {name}' },
  'ab.fx.revive': { en: 'REVIVED!', de: 'WIEDER DA!', ar: 'عاد للقتال!', fa: 'دوباره برخاست!' },
  'ab.fx.mend': { en: 'GATE MENDED!', de: 'TOR GEHEILT!', ar: 'تم ترميم البوابة!', fa: 'دروازه ترمیم شد!' },

  'ab.hero3': { en: 'PIERCING STAR', de: 'DURCHBOHRENDER STERN', ar: 'النجمة الخارقة', fa: 'ستاره‌ی شکافنده' },
  'ab.hero3.d': { en: 'Every 5th volley pierces 2 foes and hits harder', de: 'Jede 5. Salve durchbohrt 2 Feinde und trifft härter', ar: 'كل رشقة خامسة تخترق عدوين وتضرب بقوة أكبر', fa: 'هر رگبار پنجم از 2 دشمن رد می‌شود و قوی‌تر می‌زند' },
  'ab.hero5': { en: 'STAR BURST', de: 'STERNENSTOSS', ar: 'انفجار النجوم', fa: 'انفجار ستاره' },
  'ab.hero5.d': { en: 'Every 8s: a fan of 10 golden stars', de: 'Alle 8 s: ein Fächer aus 10 goldenen Sternen', ar: 'كل 8 ثوانٍ: مروحة من 10 نجوم ذهبية', fa: 'هر 8 ثانیه: بادبزنی از 10 ستاره‌ی طلایی' },

  'ab.angel3': { en: 'CHAIN LIGHTNING', de: 'KETTENBLITZ', ar: 'البرق المتسلسل', fa: 'صاعقه‌ی زنجیره‌ای' },
  'ab.angel3.d': { en: 'Every 3s: lightning leaps across 4 foes', de: 'Alle 3 s: ein Blitz springt über 4 Feinde', ar: 'كل 3 ثوانٍ: برق يقفز بين 4 أعداء', fa: 'هر 3 ثانیه: صاعقه بین 4 دشمن می‌پرد' },
  'ab.angel5': { en: 'SECOND WIND', de: 'ZWEITER ATEM', ar: 'النفَس الثاني', fa: 'جان دوباره' },
  'ab.angel5.d': { en: 'Once per level: gets right back up when knocked out', de: 'Einmal pro Level: steht nach K.O. sofort wieder auf', ar: 'مرة في كل مستوى: ينهض فورًا عند سقوطه', fa: 'یک بار در هر مرحله: وقتی از پا بیفتد، فوراً برمی‌خیزد' },

  'ab.turret3': { en: 'DOUBLE BARREL', de: 'DOPPELLAUF', ar: 'الماسورة المزدوجة', fa: 'لوله‌ی دوقلو' },
  'ab.turret3.d': { en: 'Every shot fires a second bolt', de: 'Jeder Schuss feuert einen zweiten Bolzen', ar: 'كل طلقة تُطلق قذيفة ثانية', fa: 'هر شلیک یک گلوله‌ی دوم هم می‌زند' },
  'ab.turret5': { en: 'HOMING ROUNDS', de: 'ZIELSUCHENDE SCHÜSSE', ar: 'طلقات موجَّهة', fa: 'گلوله‌های هدف‌یاب' },
  'ab.turret5.d': { en: 'Shots curve to hunt their target', de: 'Schüsse folgen ihrem Ziel', ar: 'الطلقات تنعطف لتلاحق هدفها', fa: 'گلوله‌ها می‌چرخند و هدفشان را دنبال می‌کنند' },

  'ab.wall3': { en: 'MIRROR STONE', de: 'SPIEGELSTEIN', ar: 'الحجر العاكس', fa: 'سنگ آینه‌ای' },
  'ab.wall3.d': { en: 'Bounces enemy bullets back at foes', de: 'Wirft feindliche Kugeln auf die Gegner zurück', ar: 'يردّ رصاص الأعداء عليهم', fa: 'گلوله‌های دشمن را به سمت خودشان برمی‌گرداند' },
  'ab.wall5': { en: 'BRAMBLE WALL', de: 'DORNENWALL', ar: 'جدار الأشواك', fa: 'دیوار خاردار' },
  'ab.wall5.d': { en: 'Double thorns; slows foes near the wall', de: 'Doppelte Dornen; bremst Feinde an der Mauer', ar: 'أشواك مضاعفة، ويبطئ الأعداء قرب الجدار', fa: 'خارهای دوبرابر؛ دشمنان نزدیک دیوار را کند می‌کند' },

  'ab.bomb3': { en: 'NAPALM', de: 'FEUERTEPPICH', ar: 'النابالم', fa: 'ناپالم' },
  'ab.bomb3.d': { en: 'Leaves a burning patch for 4s', de: 'Hinterlässt 4 s lang ein brennendes Feld', ar: 'يترك بقعة مشتعلة لمدة 4 ثوانٍ', fa: 'تا 4 ثانیه یک لکه‌ی سوزان به جا می‌گذارد' },
  'ab.bomb5': { en: 'CLUSTER BOMB', de: 'STREUBOMBE', ar: 'القنبلة العنقودية', fa: 'بمب خوشه‌ای' },
  'ab.bomb5.d': { en: 'Throws 3 extra mini-bombs at the nearest foes', de: 'Wirft 3 Mini-Bomben auf die nächsten Feinde', ar: 'تقذف 3 قنابل صغيرة على أقرب الأعداء', fa: '3 بمب کوچک به سمت نزدیک‌ترین دشمنان پرتاب می‌کند' },

  'ab.shield3': { en: 'MIRROR SHIELD', de: 'SPIEGELSCHILD', ar: 'الدرع العاكس', fa: 'سپر آینه‌ای' },
  'ab.shield3.d': { en: 'Blocked bullets fly back at foes', de: 'Geblockte Kugeln fliegen zu den Feinden zurück', ar: 'الرصاص المصدود يرتد نحو الأعداء', fa: 'گلوله‌های دفع‌شده به سمت دشمنان برمی‌گردند' },
  'ab.shield5': { en: 'GATE MEND', de: 'TORHEILUNG', ar: 'ترميم البوابة', fa: 'ترمیم دروازه' },
  'ab.shield5.d': { en: 'Once per level: restores 1 gate heart', de: 'Einmal pro Level: stellt 1 Torherz wieder her', ar: 'مرة في كل مستوى: يعيد قلبًا واحدًا للبوابة', fa: 'یک بار در هر مرحله: 1 قلب دروازه را برمی‌گرداند' },
};
