/**
 * One-off / maintainable patch: NT timeline dates = composition (writing), not story span.
 * Run: node scripts/patch-nt-composition-dates.js
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'bible-context-nt.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const patches = {
  acts: {
    sortKey: 85,
    traditional: {
      dateLabel: 'Written c. AD 62–70 (with Luke)',
      dateStart: 62,
      dateEnd: 70
    },
    scholarly: {
      dateLabel: 'Written c. AD 80–90 (with Luke)',
      dateStart: 85,
      dateEnd: 90,
      note: 'Story runs from Jesus’ ascension into the early 60s; most scholars date the book with Luke decades later. Authenticity of sources is a separate question from when Acts was written.'
    },
    bio: 'Companion volume to Luke. The timeline uses the likely writing date so Acts sits with Luke; the narrative itself covers earlier apostolic events.'
  },
  luke: {
    scholarly: {
      dateLabel: 'Written c. AD 80–90 (with Acts)',
      dateStart: 80,
      dateEnd: 90,
      note: 'Usually paired with Acts and placed after Mark; ordered narrative for a broader audience.'
    }
  },
  james: {
    scholarly: {
      dateLabel: 'c. AD 80–90 (common critical dating)',
      dateStart: 80,
      dateEnd: 90,
      note: 'Critical consensus often places James late in the first century as a circular letter; an early authentic-James dating (40s–60s) remains a minority scholarly option.'
    }
  },
  '2-thessalonians': {
    scholarly: {
      dateLabel: 'c. AD 80–95 (if deutero-Pauline)',
      dateStart: 80,
      dateEnd: 95,
      note: 'Authorship is debated: if Pauline, soon after 1 Thessalonians (~51); many critical scholars treat it as later. Timeline uses the later consensus slot; see note for the early alternative.'
    }
  },
  philippians: {
    scholarly: {
      dateLabel: 'c. AD 55–62 (Paul in custody)',
      dateStart: 55,
      dateEnd: 62,
      note: 'Undisputed Paul. Scholars debate custody location (Ephesus, Caesarea, or Rome), not authenticity.'
    }
  },
  philemon: {
    scholarly: {
      dateLabel: 'c. AD 55–62 (with captivity letters)',
      dateStart: 55,
      dateEnd: 62,
      note: 'Undisputed Paul; usually grouped with the captivity letters (often near Philippians/Colossians).'
    }
  },
  colossians: {
    scholarly: {
      dateLabel: 'c. AD 70–80 (often deutero-Pauline)',
      dateStart: 70,
      dateEnd: 80,
      note: 'Authorship disputed. Critical consensus often places it after Paul’s death in a Pauline school; traditional view keeps it with the captivity letters (~61–62).'
    }
  },
  ephesians: {
    scholarly: {
      dateLabel: 'c. AD 80–90 (often deutero-Pauline)',
      dateStart: 80,
      dateEnd: 90,
      note: 'Authorship disputed. Many scholars see a later circular letter in Paul’s name rather than a mid-60s captivity note.'
    }
  },
  pastorals: {
    scholarly: {
      dateLabel: 'c. AD 90–110 (usually post-Paul)',
      dateStart: 90,
      dateEnd: 110,
      note: 'Critical consensus typically dates 1–2 Timothy and Titus after Paul as church-order letters; authenticity debate belongs in the details, not the sort order.'
    }
  },
  '1-peter': {
    scholarly: {
      dateLabel: 'c. AD 80–95 (common critical dating)',
      dateStart: 80,
      dateEnd: 95,
      note: 'Petrine authorship is debated; many critical scholars place the letter late in the first century for Asian Minor churches under pressure.'
    }
  },
  hebrews: {
    scholarly: {
      dateLabel: 'c. AD 60–90 (often ~80)',
      dateStart: 75,
      dateEnd: 90,
      note: 'Author unknown (not usually Pauline in critical work). Dating spans pre- and post-70 options; ~75–90 is a common working window for the timeline.'
    }
  },
  revelation: {
    scholarly: {
      dateLabel: 'c. AD 95 (Domitianic majority view)',
      dateStart: 95,
      dateEnd: 96,
      note: 'Majority critical dating is late Domitianic (~95); a minority prefers a Neronic / late-60s setting. Timeline follows the majority slot.'
    }
  }
};

data.entities.forEach((e) => {
  const p = patches[e.id];
  if (!p) return;
  if (p.sortKey != null) e.sortKey = p.sortKey;
  if (p.traditional) e.traditional = Object.assign({}, e.traditional, p.traditional);
  if (p.scholarly) e.scholarly = Object.assign({}, e.scholarly, p.scholarly);
  if (p.bio) e.bio = p.bio;
});

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

function order(lens) {
  return data.entities
    .slice()
    .sort((a, b) => {
      const A = a[lens] || a.traditional;
      const B = b[lens] || b.traditional;
      const sa = A.dateStart;
      const sb = B.dateStart;
      if (sa !== sb) return sa - sb;
      const ea = A.dateEnd;
      const eb = B.dateEnd;
      if (ea !== eb) return ea - eb;
      return String(a.label).localeCompare(String(b.label));
    })
    .map((e) => {
      const L = e[lens] || e.traditional;
      return `${L.dateStart}–${L.dateEnd} ${e.label}`;
    });
}

console.log('Scholarly order:');
console.log(order('scholarly').join('\n'));
console.log('\nTraditional order:');
console.log(order('traditional').join('\n'));
