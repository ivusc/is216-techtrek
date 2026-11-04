// One-off: hackathons and competitions used to share the job steps (Applied / Interview / Offer / Rejected).
// They now have their own steps, so move old cards over:
//   applied -> registered, interview -> submitted, offer -> results (won), rejected -> results (took part)
//
//   pnpm --filter @techtrek/server migrate:hackathon-statuses
//
// Safe to run again: cards already on hackathon steps are left alone.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

const MOVES = {
  applied: { status: 'registered' },
  interview: { status: 'submitted' },
  offer: { status: 'results', result: 'won' },
  rejected: { status: 'results', result: 'participated' },
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const eventIds = await Opportunity.find({ type: { $in: Application.EVENT_TYPES } }).distinct('_id');
  let moved = 0;
  for (const [oldStatus, change] of Object.entries(MOVES)) {
    const result = await Application.updateMany({ opportunityId: { $in: eventIds }, status: oldStatus }, { $set: change });
    if (result.modifiedCount > 0) console.log(`  ${oldStatus} -> ${change.status}: ${result.modifiedCount}`);
    moved += result.modifiedCount;
  }
  console.log(`Moved ${moved} hackathon / competition cards to the new steps.`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
