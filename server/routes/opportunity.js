const express = require('express');
const opportunityController = require('../controllers/opportunity-controller');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.get('/jobs', opportunityController.fetchJobs);
router.get('/job-filters', opportunityController.fetchJobFilterOptions);
router.get('/hackathons', opportunityController.fetchHackathons);
router.get('/all', opportunityController.fetchAll);
// shared links: /opportunities/<id> on the site
router.post('/share', requireLogin, opportunityController.shareOpportunity);
router.get('/item/:id', opportunityController.fetchOpportunity);

module.exports = router;
