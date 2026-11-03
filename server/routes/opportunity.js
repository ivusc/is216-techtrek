const express = require('express');
const opportunityController = require('../controllers/opportunity-controller');
const router = express.Router();

router.get('/jobs', opportunityController.fetchJobs);
router.get('/job-filters', opportunityController.fetchJobFilterOptions);
router.get('/hackathons', opportunityController.fetchHackathons);
router.get('/all', opportunityController.fetchAll);
router.post('/', opportunityController.saveOpportunity);
router.delete('/:id', opportunityController.deleteOpportunity);

module.exports = router;
