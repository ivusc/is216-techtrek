const express = require('express');
const opportunityController = require('../controllers/opportunity-controller');
const router = express.Router();

router.get('/jobs', opportunityController.fetchJobs);
router.get('/hackathons', opportunityController.fetchHackathons);
router.get('/all', opportunityController.fetchAll);

module.exports = router;
