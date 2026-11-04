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
  'team-full', // my pending request or invite was closed because the team filled up
  'team-closed', // my pending request or invite was closed because the team's closing date passed
];

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
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
