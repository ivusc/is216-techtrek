const mongoose = require('mongoose');

// what happened, from the point of view of the person who gets the notification
const NOTIFICATION_TYPES = [
  'request-received', // someone asked to join my team
  'request-accepted', // the leader let me in
  'request-declined', // the leader said no
  'invite-received', // a leader invited me
  'invite-accepted', // the person I invited joined
  'invite-declined', // the person I invited said no
  'member-joined', // someone joined my team straight away (auto-accept)
  'member-left', // someone left my team
  'team-deleted', // the leader deleted a team I was in
  'role-assigned', // the leader gave me a role in their team
  'role-offered', // the leader would take me, but in a different role than I asked for: I need to OK it
  'team-full', // my pending request or invite was closed because the team filled up
  'team-closed', // my pending request or invite was closed because the team's closing date passed
  'deadline-reminder', // one of my tracked applications is due soon (3 days before, then 1 day before)
  'new-matches', // new jobs or hackathons mention my skills
];

// which deadline reminder it is: about 3 days before, or 1 day before (or on the day)
const REMINDER_TYPES = ['3-day', '1-day'];

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who sees it
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who did it
    actorName: { type: String, trim: true, maxlength: 100 },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamName: { type: String, trim: true, maxlength: 100 }, // kept so it still reads well after a team is deleted
    role: { type: String, trim: true, maxlength: 100 }, // for role-assigned
    about: { type: String, enum: ['request', 'invite'] }, // for team-full / team-closed: what was closed
    // for deadline-reminder: which application, what it is called, when it is due, and how many days were left
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    title: { type: String, trim: true, maxlength: 200 },
    organisation: { type: String, trim: true, maxlength: 200 },
    deadline: { type: Date },
    reminder: { type: String, enum: REMINDER_TYPES },
    daysLeft: { type: Number },
    // for new-matches: how many new listings of each kind, and which of my skills they mention
    jobCount: { type: Number },
    hackathonCount: { type: Number },
    skills: { type: [String], default: undefined },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 }); // the unread count on the bell
// one reminder of each kind per application and deadline (a new deadline gets its own reminders)
notificationSchema.index(
  { userId: 1, applicationId: 1, reminder: 1, deadline: 1 },
  { unique: true, partialFilterExpression: { type: 'deadline-reminder' } },
);

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.REMINDER_TYPES = REMINDER_TYPES;
