const express = require('express');
const applicationController = require('../controllers/application-controller');
const router = express.Router();

router.post('/', applicationController.createApplication);
router.get('/', applicationController.getApplications);
router.get('/:id', applicationController.getApplication);
router.patch('/:id', applicationController.updateApplication);
router.delete('/:id', applicationController.deleteApplication);
router.post('/:id/review', applicationController.createReview);
router.put('/:id/review', applicationController.updateReview);
router.delete('/:id/review', applicationController.deleteReview);

module.exports = router;
