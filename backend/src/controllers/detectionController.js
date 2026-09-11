const detectionService = require("../services/detectionService");

/**
 * Controller for handling detection HTTP requests.
 */

exports.createDetection = async (req, res, next) => {
  try {
    const created = await detectionService.createDetection(req.body);
    return res.status(201).json({
      success: true,
      message: "Detection accepted and recorded",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDetections = async (req, res, next) => {
  try {
    const detections = await detectionService.getAllDetections();
    return res.status(200).json({
      success: true,
      count: detections.length,
      data: detections,
    });
  } catch (error) {
    next(error);
  }
};
