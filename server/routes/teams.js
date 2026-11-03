const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams-controller');
const { requireSameUser } = require('../middleware/auth');

// every teams route acts for the logged-in user only
router.use(requireSameUser);

router.get('/', teamsController.getTeams);
router.get('/mine', teamsController.getMyTeams);
router.get('/events', teamsController.getEvents);
router.get('/me', teamsController.getProfile);
router.patch('/me/skills', teamsController.updateSkills);

router.post('/', teamsController.createTeam);
router.patch('/:id', teamsController.updateTeam);
router.delete('/:id', teamsController.deleteTeam);

router.post('/:id/requests', teamsController.createRequest);
router.get('/requests/incoming', teamsController.getIncomingRequests);
router.get('/requests/sent', teamsController.getSentRequests);
router.patch('/requests/:id', teamsController.respondToRequest);
router.delete('/requests/:id', teamsController.withdrawRequest);

module.exports = router;