const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams-controller');

router.get('/', teamsController.getTeams);
router.get('/mine', teamsController.getMyTeams);

router.post('/', teamsController.createTeam);
router.patch('/:id', teamsController.updateTeam);
router.delete('/:id', teamsController.deleteTeam);

router.post('/:id/requests', teamsController.createRequest);
router.post('/:id/leave', teamsController.leaveTeam);
router.patch('/:id/members/:userId', teamsController.assignRole);

// invites: the leader invites someone by SMU email; the invited person accepts or declines
router.get('/invites', teamsController.getMyInvites);
router.patch('/invites/:id', teamsController.respondToInvite);
router.delete('/invites/:id', teamsController.cancelInvite);
router.get('/:id/invites', teamsController.getTeamInvites);
router.post('/:id/invites', teamsController.createInvite);
router.get('/:id/matches', teamsController.getMatches);
router.get('/requests/incoming', teamsController.getIncomingRequests);
router.get('/requests/sent', teamsController.getSentRequests);
router.patch('/requests/:id', teamsController.respondToRequest);
router.delete('/requests/:id', teamsController.withdrawRequest);

// last, so /mine, /invites and /requests/... are not read as a team id
router.get('/:id', teamsController.getTeam);

module.exports = router;